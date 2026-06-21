# Notifications & Collaboration — Design Spec

**Date:** 2026-06-21
**Status:** Approved
**Scope:** Watchers + @mentions, an in-app notification center, and real web push — completing the comments/collaboration feature.

## Goal

When someone comments on a record, the right people find out — via an in-app notification center (bell + unread) and real browser/OS **web push** that reaches them even when the tab is closed. Recipients are the record's **watchers** plus anyone **@mentioned**.

## Global Constraints (from the codebase)

- Next.js 16 (App Router, RSC + server actions, edge `proxy.ts`, Node-runtime auth via `loadSession`/`requireUser`), React 19, Tailwind v4, Prisma 7 (`@/generated/prisma/client`, `@/lib/db` soft-delete extension — add `where:{deletedAt:null}` on nested includes), Auth.js v5 (JWT + revocable `UserSession`), next-intl (AR/EN + RTL), PWA with `public/sw.js` + `RegisterSW`.
- RBAC via `can(role, action, entity)`; services enforce with `requireUser`; `redactSensitive` for sensitive fields. Bilingual only for nav/auth/ui; body copy hardcoded Arabic. Reuse `@/components/ui`, `useActionToast`, `.focus-ring`, logical RTL props, avatars at `/avatars/[userId]`.
- Node unit tests hit the real dev DB with no reset — use unique ids per run. Best-effort side effects wrap in try/catch and never block the core action.

## Approved decisions

1. **Recipients:** watchers (auto-watch on comment + explicit Watch/Unwatch) **plus** @mentions; a mention auto-adds the mentioned user as a watcher; the author is auto-watched and never notified of their own comment.
2. **Channels:** in-app notification center (source of truth) **and** web push (per-device, permission-gated, best-effort).
3. **Events:** comments + @mentions only (v1).
4. **Composer:** inline `@` autocomplete.
5. **Service worker** registers in **all environments** (needed for push in dev/test).
6. **Unread freshness:** ~30s client poll; push gives instant delivery.
7. iOS web push requires the installed PWA (16.4+) — documented, handled gracefully.

---

## 1. Data model (3 new tables)

```prisma
model Watcher {
  id        String   @id @default(cuid())
  userId    String
  entity    String   // 'Client'|'MasterContract'|'Work'|'Document'
  entityId  String
  createdAt DateTime @default(now())
  @@unique([userId, entity, entityId])
  @@index([entity, entityId])
}

model Notification {
  id          String    @id @default(cuid())
  recipientId String
  actorId     String?
  type        String    // 'COMMENT' | 'MENTION'
  entity      String
  entityId    String
  title       String    // snapshot, e.g. "أحمد علّق على «نجم المتصفح»"
  body        String    // comment snippet (truncated)
  href        String    // where clicking goes
  readAt      DateTime?
  createdAt   DateTime  @default(now())
  @@index([recipientId, readAt, createdAt])
}

model PushSubscription {
  id        String   @id @default(cuid())
  userId    String
  endpoint  String   @unique
  p256dh    String
  auth      String
  userAgent String?
  createdAt DateTime @default(now())
  @@index([userId])
}
```

Notifications snapshot `title/body/href` at send-time so the list renders with no joins and stays stable even if the source record changes.

## 2. Services

### `src/services/watchers.ts`
- `watch(entity, entityId)` / `unwatch(entity, entityId)` — caller via `requireUser('read', entity)`; upsert/delete on `@@unique`.
- `isWatching(entity, entityId): boolean`; `ensureWatching(userId, entity, entityId)` (idempotent, used internally).
- `listWatcherIds(entity, entityId): string[]`.

### `src/services/notifications.ts`
- `createForComment({ entity, entityId, commentId, body, actorId, actorName, entityLabel, href, mentionIds })` — internal; computes recipients = `(watcherIds ∪ mentionIds) − actorId`, one row each (type `MENTION` if in mentionIds else `COMMENT`), then fires `sendPushToUser` best-effort per recipient.
- `listMyNotifications(opts?)`, `unreadCount()`, `markRead(id)`, `markAllRead()` — all scoped to `loadSession()` caller; you only see your own.

### `src/services/mentions.ts`
- `searchMentionUsers(q)` — any authenticated user; returns ≤8 active users `{id,name,hasAvatar}` matched on Arabic-normalized name.
- `resolveMentions(entity, mentionIds, body)` — keep ids that (a) appear as `@Name` in body, (b) are real active users, (c) `can(role,'read',entity)`.

### `src/lib/push.ts`
- VAPID config from env; `sendPushToUser(userId, payload)` loops the user's `PushSubscription`s via `web-push`, pruning subs on `404/410`. No-op (warn) if VAPID env is absent.
- `savePushSubscription(sub, userAgent)` / `deletePushSubscription(endpoint)` (caller-scoped); `listMyDevices()`.

## 3. Comment integration
`addComment(entity, entityId, body, mentionIds)` (extended signature): create comment → `ensureWatching(author)` → `resolveMentions` → for each resolved mention `ensureWatching(mentionedUser)` → `notifications.createForComment(...)` (awaited for in-app rows; push best-effort) → existing `COMMENT` audit. The comment action passes `mentionIds` from the composer.

## 4. Web push plumbing
- **`public/sw.js`**: add `push` handler → `self.registration.showNotification(title, { body, icon:'/icons/icon-192.png', data:{ url } })`; add `notificationclick` → focus an existing client on `url` or `clients.openWindow(url)`.
- **`RegisterSW.tsx`**: register in all environments (drop the prod-only guard).
- **Subscribe**: a client helper requests `Notification.requestPermission()`, `registration.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey: <NEXT_PUBLIC_VAPID_PUBLIC_KEY> })`, and calls `savePushSubscription`. Gracefully disabled when unsupported / denied.
- **Env**: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` added to `.env.example`; CI sets dummy values (push send is a no-op without real keys, so e2e stays green).

## 5. UI
- **`NotificationBell`** (client) in the sidebar footer: unread badge (initial count from the server layout; refetch via `unreadCount` every ~30s) → dropdown panel of recent notifications (actor avatar, title, snippet, `timeAgoAr`, unread dot); click → `markRead` + navigate to `href`; "تعليم الكل كمقروء".
- **`/notifications`** page — full list with mark-all-read.
- **Watch toggle** — a "متابعة/إلغاء المتابعة" button in the `ActivityPanel` header (client/contract/work/document), reflecting `isWatching`.
- **Mention autocomplete** — enhance the comment composer: detect a trailing `@token`, show a dropdown from `searchMentionUsers`, insert `@Name` + track id.
- **`/account` → «الإشعارات»** — enable push on this device; list/remove registered devices.

## 6. RBAC / security
You only see your own notifications and devices. Mentions limited to users who can read the entity. Push payload carries a short snippet only (recipient already has access). Subscriptions per-user, pruned when gone. Watch requires read-access to the entity.

## 7. Error handling
- Push send and notification fan-out are best-effort relative to the comment (a failed push or a dead subscription never fails the comment). In-app notification rows are created in the comment path and surfaced if creation throws only via `console.warn` (comment still succeeds).
- Subscribe flow handles unsupported/denied/permission-revoked states with a clear message; never throws into the UI.
- `searchMentionUsers` returns `[]` on empty/short queries.

## 8. Testing
- **Unit:** auto-watch on comment; fan-out recipients (watchers ∪ mentions − author; dedup; MENTION vs COMMENT); `resolveMentions` drops non-readers / non-present ids; `unreadCount`/`markRead`/`markAllRead` scoping; `savePushSubscription` upsert-by-endpoint + prune; `sendPushToUser` with `web-push` mocked (prunes on 410); `searchMentionUsers` matching.
- **e2e:** A comments on a client; B (made a watcher by commenting earlier) sees the unread bell, opens it, clicks the notification → lands on the record + it's marked read; an @mention notifies a non-watcher; the Watch toggle flips; the "enable notifications" control appears and posts a stubbed subscription (browser-granted permission via Playwright context).

## 9. File map
- **Create:** `src/services/watchers.ts`, `src/services/notifications.ts`, `src/services/mentions.ts`, `src/lib/push.ts`, `src/components/notifications/NotificationBell.tsx` (+panel), `src/components/notifications/actions.ts`, `src/components/notifications/PushToggle.tsx` (+client subscribe helper `src/lib/push-client.ts`), `src/app/(app)/notifications/page.tsx`, plus unit + e2e tests.
- **Modify:** `prisma/schema.prisma` (+3 models); `src/services/comments.ts` (`addComment` signature + wiring); `src/components/activity/CommentThread.tsx` (mention autocomplete) + `actions.ts` (mentionIds); `src/components/activity/ActivityPanel.tsx` (Watch toggle + isWatching prop); `src/services/activity-panel.ts` (return `isWatching`); `public/sw.js` (push handlers); `src/components/pwa/RegisterSW.tsx` (register everywhere); `src/app/(app)/layout.tsx` (bell + unread count); `src/app/(app)/account/page.tsx` (+notifications section); `.env.example`; `package.json` (+`web-push`).

## 10. Out of scope (v1)
- Email notifications; per-type mute/preferences; digests; notifications for non-comment events; reactions; read receipts on comments; desktop Notification grouping/threads.
