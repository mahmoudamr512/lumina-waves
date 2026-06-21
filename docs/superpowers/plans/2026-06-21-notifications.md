# Notifications & Collaboration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Notify the right people (watchers + @mentioned) of new comments via an in-app notification center and real web push.

**Architecture:** New `Watcher`/`Notification`/`PushSubscription` tables. `addComment` auto-watches the author, resolves @mentions, fans out in-app `Notification` rows to watchers ∪ mentions − author, and fires best-effort web push. UI adds a sidebar bell + `/notifications`, a Watch toggle, mention autocomplete, and per-device push enablement.

**Tech Stack:** Next.js 16, React 19, Prisma 7, Auth.js v5, `web-push`, PWA service worker, Vitest, Playwright.

## Global Constraints

- Soft-delete extension does NOT filter nested includes — add `where:{deletedAt:null}` manually.
- Best-effort side effects (push, fan-out relative to comment) wrap in try/catch and never block the comment.
- `requireUser`/`loadSession` enforce auth+RBAC, fail-closed; you only see your own notifications/devices.
- Mentions limited to users who can read the entity. Bilingual nav/auth/ui only; body copy hardcoded Arabic.
- Node unit tests hit the real dev DB, no reset — unique ids per run; mock `web-push` and `@/lib/auth`/`@/lib/session` as needed.
- Allowed comment/watch entities: `Client`, `MasterContract`, `Work`, `Document` (`ACTIVITY_ENTITIES`).

---

## Task 1: Schema

**Files:** Modify `lumina/prisma/schema.prisma`; command `npx prisma migrate dev --name notifications && npx prisma generate`.

- [ ] **Step 1:** Add `Watcher`, `Notification`, `PushSubscription` models exactly as in spec §1.
- [ ] **Step 2:** `cd lumina && npx prisma migrate dev --name notifications && npx prisma generate`. Expected: applied; `npx tsc --noEmit` clean.
- [ ] **Step 3: Commit** `feat(db): Watcher, Notification, PushSubscription models`

---

## Task 2: Watchers service

**Files:** Create `lumina/src/services/watchers.ts`; Test `lumina/tests/unit/watchers.service.test.ts`.

**Produces:** `watch(entity,entityId)`, `unwatch(entity,entityId)`, `isWatching(entity,entityId):Promise<boolean>`, `ensureWatching(userId,entity,entityId)`, `listWatcherIds(entity,entityId):Promise<string[]>`.

- [ ] **Step 1: failing tests** (mock `@/lib/auth` requireUser + `@/lib/session` loadSession): `watch` then `isWatching`→true; `unwatch`→false; `ensureWatching` idempotent (calling twice keeps one row); `listWatcherIds` returns the set; invalid entity rejected.
- [ ] **Step 2: run — fail.**
- [ ] **Step 3: implement.** `watch`: `const u = await requireUser('read', entity as Entity); assertEntity; await db.watcher.upsert({ where:{ userId_entity_entityId:{ userId:u.id, entity, entityId } }, create:{ userId:u.id, entity, entityId }, update:{} })`. `unwatch`: `deleteMany({ where:{ userId:u.id, entity, entityId } })`. `isWatching`: `loadSession` caller, `count > 0`. `ensureWatching(userId,...)`: `upsert` (no auth — internal). `listWatcherIds`: `findMany select userId` → ids. `assertEntity` via `isCommentableEntity` else `ValidationError('INVALID_INPUT')`.
- [ ] **Step 4: run — pass** + tsc. **Commit** `feat(watchers): follow/unfollow records service`

---

## Task 3: Web push library + subscriptions

**Files:** Create `lumina/src/lib/push.ts`; Modify `lumina/.env.example`, `lumina/package.json` (deps); Test `lumina/tests/unit/push.test.ts`.

**Produces:** `sendPushToUser(userId, payload:{title;body;url})`, `savePushSubscription(sub,userAgent?)`, `deletePushSubscription(endpoint)`, `listMyDevices()`, `vapidPublicKey()`.

- [ ] **Step 1: deps** — `cd lumina && npm i web-push && npm i -D @types/web-push`.
- [ ] **Step 2: env** — add to `.env.example`: `VAPID_PUBLIC_KEY=`, `VAPID_PRIVATE_KEY=`, `VAPID_SUBJECT=mailto:ops@luminawaves.com`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY=`.
- [ ] **Step 3: failing tests** (mock `web-push`): `savePushSubscription` upserts by endpoint (same endpoint twice → one row); `sendPushToUser` calls `webpush.sendNotification` for each sub and **prunes** a sub when the mocked send throws `{ statusCode: 410 }`; with no VAPID env, `sendPushToUser` is a no-op (no throw).
- [ ] **Step 4: run — fail.**
- [ ] **Step 5: implement.**
```ts
import webpush from 'web-push'
import { db } from '@/lib/db'
import { loadSession } from '@/lib/session'
import { AuthzError } from '@/lib/errors'

const PUB = process.env.VAPID_PUBLIC_KEY
const PRIV = process.env.VAPID_PRIVATE_KEY
const SUBJECT = process.env.VAPID_SUBJECT ?? 'mailto:ops@luminawaves.com'
let configured = false
function ensureVapid(): boolean {
  if (!PUB || !PRIV) return false
  if (!configured) { webpush.setVapidDetails(SUBJECT, PUB, PRIV); configured = true }
  return true
}
export function vapidPublicKey() { return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? PUB ?? null }

export async function sendPushToUser(userId: string, payload: { title: string; body: string; url: string }) {
  if (!ensureVapid()) return
  const subs = await db.pushSubscription.findMany({ where: { userId } })
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
      )
    } catch (err) {
      const code = (err as { statusCode?: number }).statusCode
      if (code === 404 || code === 410) await db.pushSubscription.delete({ where: { id: s.id } }).catch(() => {})
      else console.warn('[push] send failed:', err)
    }
  }))
}

async function me() { const s = await loadSession(); if (!s) throw new AuthzError('UNAUTHENTICATED'); return s }
export async function savePushSubscription(sub: { endpoint: string; keys: { p256dh: string; auth: string } }, userAgent?: string) {
  const u = await me()
  await db.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: { userId: u.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent },
    update: { userId: u.id, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent },
  })
}
export async function deletePushSubscription(endpoint: string) {
  const u = await me()
  await db.pushSubscription.deleteMany({ where: { endpoint, userId: u.id } })
}
export async function listMyDevices() {
  const u = await me()
  return db.pushSubscription.findMany({ where: { userId: u.id }, select: { id: true, userAgent: true, createdAt: true, endpoint: true } })
}
```
- [ ] **Step 6: run — pass** + tsc. **Commit** `feat(push): web-push send + subscription storage`

---

## Task 4: Notifications service

**Files:** Create `lumina/src/services/notifications.ts`; Test `lumina/tests/unit/notifications.service.test.ts`.

**Produces:** `createForComment(input)`, `listMyNotifications(opts?)`, `unreadCount()`, `markRead(id)`, `markAllRead()`.

`createForComment` input: `{ entity; entityId; commentId; body; actorId; actorName; entityLabel; href; mentionIds: string[] }`.

- [ ] **Step 1: failing tests** (mock `@/lib/push` `sendPushToUser` + `@/lib/session` loadSession): seed two watchers + the author as watcher; `createForComment` creates one notification per recipient **excluding the author**, dedups a user who is both watcher and mentioned to a single `MENTION` row, and calls `sendPushToUser` per recipient; `unreadCount`/`listMyNotifications` scoped to caller; `markRead` sets `readAt`; `markAllRead` clears all unread for the caller.
- [ ] **Step 2: run — fail.**
- [ ] **Step 3: implement.**
```ts
import { db } from '@/lib/db'
import { loadSession } from '@/lib/session'
import { AuthzError } from '@/lib/errors'
import { listWatcherIds } from '@/services/watchers'
import { sendPushToUser } from '@/lib/push'

export async function createForComment(i: {
  entity: string; entityId: string; commentId: string; body: string
  actorId: string; actorName: string; entityLabel: string; href: string; mentionIds: string[]
}) {
  const watchers = await listWatcherIds(i.entity, i.entityId)
  const mention = new Set(i.mentionIds)
  const recipients = new Set<string>([...watchers, ...i.mentionIds])
  recipients.delete(i.actorId)
  if (recipients.size === 0) return
  const snippet = i.body.length > 140 ? i.body.slice(0, 140) + '…' : i.body
  const title = `${i.actorName} علّق على «${i.entityLabel}»`
  await db.notification.createMany({
    data: [...recipients].map((rid) => ({
      recipientId: rid, actorId: i.actorId, type: mention.has(rid) ? 'MENTION' : 'COMMENT',
      entity: i.entity, entityId: i.entityId, title: mention.has(rid) ? `${i.actorName} ذكرك في «${i.entityLabel}»` : title,
      body: snippet, href: i.href,
    })),
  })
  // best-effort push
  await Promise.all([...recipients].map((rid) =>
    sendPushToUser(rid, { title: mention.has(rid) ? `${i.actorName} ذكرك في «${i.entityLabel}»` : title, body: snippet, url: i.href })
      .catch((e) => console.warn('[notifications] push failed:', e)),
  ))
}

async function me() { const s = await loadSession(); if (!s) throw new AuthzError('UNAUTHENTICATED'); return s }
export async function unreadCount() { const u = await me(); return db.notification.count({ where: { recipientId: u.id, readAt: null } }) }
export async function listMyNotifications(opts?: { take?: number }) {
  const u = await me()
  return db.notification.findMany({ where: { recipientId: u.id }, orderBy: { createdAt: 'desc' }, take: opts?.take ?? 30 })
}
export async function markRead(id: string) { const u = await me(); await db.notification.updateMany({ where: { id, recipientId: u.id }, data: { readAt: new Date() } }) }
export async function markAllRead() { const u = await me(); await db.notification.updateMany({ where: { recipientId: u.id, readAt: null }, data: { readAt: new Date() } }) }
```
- [ ] **Step 4: run — pass** + tsc. **Commit** `feat(notifications): in-app notification fan-out + read state`

---

## Task 5: Mentions + wire into comments

**Files:** Create `lumina/src/services/mentions.ts`; Modify `lumina/src/services/comments.ts`; Test `lumina/tests/unit/mentions.service.test.ts`, extend `comments.service.test.ts`.

**Produces:** `searchMentionUsers(q):Promise<{id;name;hasAvatar}[]>`, `resolveMentions(entity, mentionIds, body):Promise<string[]>`. `addComment` gains a 4th arg `mentionIds: string[] = []`.

- [ ] **Step 1: failing tests** — `searchMentionUsers('ahm')` returns active matches (Arabic-normalized); `resolveMentions` keeps only ids that are real users AND whose `@Name` appears in body (drop ids not present); `addComment(entity,id,body,[mentionedId])` auto-watches the author and the mentioned user, and creates a notification for the mentioned user (assert a `Notification` row exists for them).
- [ ] **Step 2: run — fail.**
- [ ] **Step 3: implement `mentions.ts`.** `searchMentionUsers`: `requireUser`? any authenticated → use `loadSession`; if `q.trim().length < 1` return []; `db.user.findMany({ where:{ deletedAt:null, disabledAt:null }, select:{id,name,avatarPath} , take: 40})` then filter by `normalizeArabic(name).includes(normalizeArabic(q))`, slice 8. `resolveMentions(entity, ids, body)`: load users by id (active), keep those whose `name` appears as `@${name}` in body; (entity read-access is guaranteed since all roles can read these entities — still keep the function signature for future per-entity checks).
- [ ] **Step 4: wire `comments.ts`.** Change `addComment(entity, entityId, body, mentionIds: string[] = [])`: after creating the comment and the existing COMMENT audit, add (best-effort, try/catch): `await ensureWatching(u.id, entity, entityId)`; `const resolved = await resolveMentions(entity, mentionIds, clean)`; `for (const m of resolved) await ensureWatching(m, entity, entityId)`; compute `entityLabel` + `href` via a small `describeEntityTarget(entity, entityId)` helper (looks up client stageName/legalName, contract grant, work title, document filename; `href`: Client→`/clients/{id}?tab=activity`, MasterContract→`/contracts/{id}`, Work→`/works/{id}`, Document→`/documents/{id}/activity`); `await createForComment({ entity, entityId, commentId: row.id, body: clean, actorId: u.id, actorName, entityLabel, href, mentionIds: resolved })`. Fetch `actorName` from `db.user`.
- [ ] **Step 5: run — pass** + tsc. **Commit** `feat(comments): mentions + watcher fan-out on new comments`

---

## Task 6: Service worker push + client subscribe

**Files:** Modify `lumina/public/sw.js`, `lumina/src/components/pwa/RegisterSW.tsx`; Create `lumina/src/lib/push-client.ts`, `lumina/src/components/notifications/PushToggle.tsx`, `lumina/src/components/notifications/actions.ts`.

- [ ] **Step 1: sw.js** — append:
```js
self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { data = {} }
  const title = data.title || 'لومينا ويفز'
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || '', icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', data: { url: data.url || '/' },
  }))
})
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
    for (const c of cs) { if ('focus' in c) { c.navigate(url); return c.focus() } }
    return self.clients.openWindow(url)
  }))
})
```
- [ ] **Step 2: RegisterSW.tsx** — register in all environments (remove the `process.env.NODE_ENV === 'production'` guard so dev/test get the SW). Keep registration in a `useEffect`.
- [ ] **Step 3: actions.ts** (`'use server'`): `subscribeAction(fd|json)` calls `savePushSubscription`; `unsubscribeAction(endpoint)` calls `deletePushSubscription`; `vapidKeyAction()` returns `vapidPublicKey()`. (Simplest: a server action `saveSubscription(sub, ua)` taking a plain object.)
- [ ] **Step 4: push-client.ts** (`'use client'` helper, not a component): `urlBase64ToUint8Array(base64)`; `enablePush(publicKey)`: guards `('serviceWorker' in navigator) && ('PushManager' in window)`, `Notification.requestPermission()`, `reg = await navigator.serviceWorker.ready`, `sub = await reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey: urlBase64ToUint8Array(publicKey) })`, returns `sub.toJSON()`.
- [ ] **Step 5: PushToggle.tsx** (`'use client'`): a button "تفعيل إشعارات هذا الجهاز" that on click calls `enablePush(publicKey)` then the `saveSubscription` server action; shows states (unsupported/denied/enabled) via `useToast`. Receives `publicKey` prop (from server).
- [ ] **Step 6: tsc + build.** **Commit** `feat(push): service-worker push handlers + device subscribe flow`

---

## Task 7: Notification bell + page

**Files:** Create `lumina/src/components/notifications/NotificationBell.tsx`, `lumina/src/app/(app)/notifications/page.tsx`; Modify `lumina/src/components/notifications/actions.ts` (markRead/markAll), `lumina/src/app/(app)/layout.tsx` (render bell with initial unread count), `lumina/src/components/ui/icons.tsx` (`IconBell`).

- [ ] **Step 1:** `IconBell` in icons.tsx.
- [ ] **Step 2:** actions.ts: add `markNotificationRead(id)`, `markAllNotificationsRead()`, `fetchNotifications()` (returns `listMyNotifications`), `fetchUnreadCount()` (returns `unreadCount`).
- [ ] **Step 3:** `NotificationBell.tsx` (`'use client'`): receives `initialCount`; renders a bell button with a badge; polls `fetchUnreadCount()` every 30s (`setInterval` in effect); on open, calls `fetchNotifications()` and renders a panel (actor avatar, title, snippet, `timeAgoAr`, unread dot); clicking an item → `markNotificationRead(id)` + `router.push(href)`; "تعليم الكل كمقروء" → `markAllNotificationsRead()` + refresh count.
- [ ] **Step 4:** layout.tsx — `const unread = await unreadCount()` (wrap so a failure doesn't break layout) and render `<NotificationBell initialCount={unread} />` in the shell (pass into the sidebar footer area or the mobile top bar; simplest: add to `Sidebar` footer via a new optional prop `bell?: ReactNode`).
- [ ] **Step 5:** `/notifications/page.tsx` — full list via `listMyNotifications({ take: 100 })`, mark-all-read button, links per row.
- [ ] **Step 6: tsc + build.** **Commit** `feat(notifications): sidebar bell + notifications page`

---

## Task 8: Watch toggle + mention autocomplete + account push settings

**Files:** Modify `lumina/src/services/activity-panel.ts` (return `isWatching`), `lumina/src/components/activity/ActivityPanel.tsx` (Watch toggle), `lumina/src/components/activity/CommentThread.tsx` (mention autocomplete), `lumina/src/components/activity/actions.ts` (mentionIds), `lumina/src/app/(app)/account/page.tsx` (+ PushToggle + device list). Create `lumina/src/components/activity/WatchToggle.tsx`, `lumina/src/components/activity/MentionTextarea.tsx`, `lumina/src/components/activity/watch-actions.ts`, `lumina/src/components/notifications/mention-actions.ts`.

- [ ] **Step 1:** `getEntityPanel` also returns `isWatching` (`await isWatching(entity, entityId)`); `ActivityPanel` gets `isWatching` prop and renders `<WatchToggle entity entityId path watching={isWatching} />` in its header. `watch-actions.ts` (`'use server'`): `watchAction`/`unwatchAction` (entity,entityId,path) → watch/unwatch + revalidatePath.
- [ ] **Step 2:** `mention-actions.ts` (`'use server'`): `searchMentions(q)` → `searchMentionUsers(q)`.
- [ ] **Step 3:** `MentionTextarea.tsx` (`'use client'`): a controlled textarea; on input detect a trailing `@(\S*)$` in the value up to the caret; if present call `searchMentions(token)` (debounced) and show a dropdown; selecting a user replaces the `@token` with `@${name} ` and records `{id,name}` in a `mentions` state; expose chosen ids via a hidden input `mentionIds` (comma-joined) kept in sync (only ids whose `@name` still present in the text). Used by the composer in `CommentThread`.
- [ ] **Step 4:** `CommentThread` composer uses `MentionTextarea` (name="body" + hidden "mentionIds"); `postComment` action reads `mentionIds` (split on comma, filter empty) and passes to `addComment(entity, entityId, body, ids)`.
- [ ] **Step 5:** `/account` — add an «الإشعارات» Card: `<PushToggle publicKey={vapidPublicKey()} />` + a list of `listMyDevices()` with a remove button (calls `unsubscribe`/delete action). Server page passes `publicKey`.
- [ ] **Step 6: tsc + lint + build.** **Commit** `feat(notifications): watch toggle, mention autocomplete, account push settings`

---

## Task 9: e2e + finish

**Files:** Create `lumina/tests/e2e/notifications.spec.ts`.

- [ ] **Step 1:** Spec (grant notifications permission via `browser.newContext({ permissions: ['notifications'] })`):
  - Admin A logs in, creates a client, opens «النشاط», posts a comment (A is now a watcher).
  - Provision user B (admin UI), B logs in (own context), opens the same client's activity, posts a comment (B becomes a watcher; A gets notified).
  - Back as A: the bell shows an unread badge; open it; the notification appears; click it → lands on the client activity and the unread clears.
  - Watch toggle: on a record, click «إلغاء المتابعة» → label flips to «متابعة».
  - `/account`: the «تفعيل إشعارات هذا الجهاز» control is visible (permission granted) and clicking it shows a success toast (subscription saved) — tolerate environments where `pushManager` is unavailable by asserting the control renders.
- [ ] **Step 2:** `npm run e2e` until green.
- [ ] **Step 3:** Full gate (`tsc`, `lint`, `test`, `build`, `e2e`) then **superpowers:finishing-a-development-branch** → push `feat/notifications`, PR, CI, merge. (CI: add dummy VAPID env to `.github/workflows/ci.yml` env so build/e2e have them; push send is a no-op with dummy keys but VAPID setVapidDetails requires valid-format keys — generate a real keypair, commit the PUBLIC one as the CI/.env.example default, keep PRIVATE only as a CI dummy that is format-valid via `web-push generate-vapid-keys`.)
