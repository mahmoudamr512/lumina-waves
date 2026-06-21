# Activity & Collaboration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Surface "who did what, when" (per-entity timelines + an ADMIN global feed) over the existing `AuditLog`, add comment threads on clients/contracts/works/documents, and capture login/logout/failed-login/download events.

**Architecture:** Read services over `AuditLog` (enriched with actor name/avatar, Arabic phrasing, role-redacted diffs) + a new `Comment` model with author-scoped CRUD. A shared `ActivityPanel` (History | Comments) is placed on entity pages; a global `/activity` page is ADMIN-only. New audit events are written best-effort in auth/download paths.

**Tech Stack:** Next.js 16, React 19, Tailwind v4, Prisma 7, Auth.js v5, next-intl, Vitest, Playwright.

## Global Constraints

- Soft-delete extension does NOT filter nested includes — add `where: { deletedAt: null }` manually.
- Every domain mutation calls `requireUser` + `writeAudit`. New audit events are best-effort (try/catch, never block the action).
- `passwordHash` and sensitive fields (`nationalId`, `revenueShareBps`, `minPayoutCents`, `storagePath`) never reach the client; history diffs run through `redactSensitive` and drop `passwordHash`.
- Bilingual only for nav/auth/ui; page body copy hardcoded Arabic. Reuse `@/components/ui`, `useActionToast`, `.focus-ring`, logical RTL props.
- Node unit tests hit the real dev DB with no reset — use unique ids per run.
- Comment entities allowed: `Client`, `MasterContract`, `Work`, `Document` (`ACTIVITY_ENTITIES`).
- Self/ownership and RBAC enforced server-side, fail-closed. Global feed = ADMIN only.

---

## Task 1: Schema + audit helper

**Files:** Modify `lumina/prisma/schema.prisma`, `lumina/src/lib/audit.ts`. Command: `npx prisma migrate dev --name activity_collaboration && npx prisma generate`.

- [ ] **Step 1: schema** — edit `AuditLog`: make `actorId String?`, add `meta Json?`, add `@@index([entity, entityId, createdAt])` and `@@index([createdAt])`. Add `Comment` model (see spec §1) and `comments Comment[]` to `User`.
- [ ] **Step 2: migrate + generate** — `cd lumina && npx prisma migrate dev --name activity_collaboration && npx prisma generate`. Expected: applied, `npx tsc --noEmit` clean.
- [ ] **Step 3: audit.ts** — extend `AuditInput` with `actorId: string | null` and `meta?: unknown`; write `meta: (i.meta ?? Prisma.JsonNull) as NullableJson`. Keep existing callers working (they pass non-null actorId).
- [ ] **Step 4: tsc** + **Commit** `feat(db): Comment model + AuditLog meta/indexes/nullable actor`

---

## Task 2: Constants + relative-time helper

**Files:** Create `lumina/src/lib/activity-constants.ts`; Modify `lumina/src/lib/labels.ts`; Test `lumina/tests/unit/timeago.test.ts`.

**Produces:** `ACTIVITY_ENTITIES`, `isCommentableEntity(s): boolean`; `timeAgoAr(date: Date, now?: Date): string`.

- [ ] **Step 1: failing test** `timeago.test.ts`:
```ts
import { timeAgoAr } from '@/lib/labels'
const base = new Date('2026-06-21T12:00:00Z')
test('relative Arabic time', () => {
  expect(timeAgoAr(new Date('2026-06-21T11:59:50Z'), base)).toBe('الآن')
  expect(timeAgoAr(new Date('2026-06-21T11:55:00Z'), base)).toBe('منذ ٥ دقائق')
  expect(timeAgoAr(new Date('2026-06-21T09:00:00Z'), base)).toBe('منذ ٣ ساعات')
  expect(timeAgoAr(new Date('2026-06-19T12:00:00Z'), base)).toBe('منذ يومين')
})
```
- [ ] **Step 2: run — fail.**
- [ ] **Step 3: implement.** `activity-constants.ts`: `export const ACTIVITY_ENTITIES = ['Client','MasterContract','Work','Document'] as const; export function isCommentableEntity(s: string): s is (typeof ACTIVITY_ENTITIES)[number] { return (ACTIVITY_ENTITIES as readonly string[]).includes(s) }`. In `labels.ts` add `timeAgoAr` using Arabic-Indic digits (reuse existing digit conversion if present, else `toLocaleString('ar-EG')`): thresholds <60s→`الآن`, <60m→`منذ ${n} دقائق/دقيقة`, <24h→`منذ ${n} ساعات/ساعة`, <30d→`منذ ${n} أيام/يوم/يومين`, else `formatDateAr(date)`. Use Arabic plural forms: 1→"دقيقة", 2→"دقيقتين", 3-10→"${n} دقائق", else fall through; keep it pragmatic but make the 4 asserted cases pass.
- [ ] **Step 4: run — pass.** **Commit** `feat(activity): constants + Arabic relative-time helper`

---

## Task 3: Activity service

**Files:** Create `lumina/src/services/activity.ts`; Test `lumina/tests/unit/activity.service.test.ts`.

**Produces:**
- `type ActivityItem = { id; action; entity; entityId; createdAt: Date; actor: { id: string|null; name: string; hasAvatar: boolean }; meta: Record<string, unknown>|null; phrase: string; diff: DiffRow[]|null }`
- `type DiffRow = { field: string; before: unknown; after: unknown }`
- `describeAudit(a: { action; entity; meta; actorName }): string`
- `listEntityActivity(entity: string, entityId: string): Promise<ActivityItem[]>`
- `listGlobalActivity(opts?: { entity?: string; actorId?: string; before?: Date; take?: number }): Promise<{ items: ActivityItem[]; nextBefore: Date | null }>`

- [ ] **Step 1: failing tests** — mock `@/lib/auth` `requireUser`. Cases:
  - `describeAudit` returns expected Arabic for `CREATE`+`MasterContract`, `DOWNLOAD`+`Document` (uses `meta.filename`), `LOGIN`+`User`, unknown→generic.
  - `listEntityActivity('Client', id)` returns rows for that client and **excludes** `action:'COMMENT'` rows (seed an audit row + a COMMENT row via `db.auditLog.create`).
  - `auditDiff`/`diff`: for a VIEWER, `diff` is null; for ADMIN, diff present and a sensitive field (e.g. `nationalId`) is redacted to null. (Drive role via the `requireUser` mock; for entity-read the mock returns the role.)
  - `listGlobalActivity` requires ADMIN (mock `requireUser('read','User')` to throw for non-admin → assert rejects).
- [ ] **Step 2: run — fail.**
- [ ] **Step 3: implement.** Gate `listEntityActivity` with `requireUser('read', entity as Entity)`. Query `db.auditLog.findMany({ where: { entity, entityId, NOT: { action: 'COMMENT' } }, orderBy: { createdAt: 'desc' }, take: 100 })`. Enrich actors: collect non-null `actorId`s → `db.user.findMany({ where: { id: { in } }, select: { id, name, avatarPath } })` → map. Build `phrase` via `describeAudit`. Compute `diff` only when `['ADMIN','LEGAL','FINANCE'].includes(role)` by walking union of `before`/`after` keys, skipping `passwordHash`, and applying `redactSensitive(role, entity, …)` to both sides before diffing (drop unchanged keys). `listGlobalActivity` gates `requireUser('read','User')`; supports cursor (`createdAt < before`), `take` default 30, returns `nextBefore` = last item's createdAt when a full page returned.
- [ ] **Step 4: run — pass** + tsc. **Commit** `feat(activity): activity read service (phrasing + redacted diffs + feeds)`

---

## Task 4: Comments service

**Files:** Create `lumina/src/services/comments.ts`; Test `lumina/tests/unit/comments.service.test.ts`.

**Produces:** `listComments(entity, entityId)`, `addComment(entity, entityId, body)`, `editComment(id, body)`, `deleteComment(id)`. Comment view: `{ id; body; createdAt; editedAt: Date|null; author: { id; name; hasAvatar }; mine: boolean }`.

- [ ] **Step 1: failing tests** (mock `@/lib/auth` requireUser + `@/lib/session` loadSession as needed):
  - `addComment` rejects empty/`>4000` chars and a non-`ACTIVITY_ENTITIES` entity.
  - `addComment` writes a `COMMENT` audit row.
  - `editComment` by non-author throws `AuthzError`; by author sets `editedAt`.
  - `deleteComment` by author soft-deletes; by ADMIN (non-author) soft-deletes; by other non-author throws.
  - `listComments` excludes soft-deleted and flags `mine`.
- [ ] **Step 2: run — fail.**
- [ ] **Step 3: implement.** Caller id+role from `requireUser('read', entity)` (read-access ⇒ may comment). For edit/delete, load the comment, compare `authorId`. `addComment`: validate, `db.comment.create`, then best-effort `writeAudit({ actorId: caller.id, action:'COMMENT', entity, entityId, meta:{ commentId } })`. Enrich authors like activity. Reject invalid entity with `ValidationError('INVALID_INPUT')`.
- [ ] **Step 4: run — pass** + tsc. **Commit** `feat(comments): comment threads service with ownership + RBAC`

---

## Task 5: Audit event additions

**Files:** Modify `lumina/src/lib/auth.ts`, `lumina/src/lib/session-actions.ts`, `lumina/src/app/(app)/documents/[docId]/route.ts`, `lumina/src/app/(app)/contracts/[id]/generate/[docId]/route.ts`.

- [ ] **Step 1:** `auth.ts authorize`: wrap in best-effort `writeAudit` — on success after `createSessionRecord`: `LOGIN` (`actorId:user.id, entity:'User', entityId:user.id, meta:{ ip, ua }`); when returning null for bad creds OR disabled/deleted: `LOGIN_FAILED` (`actorId:null, entity:'User', entityId:'-', meta:{ email:String(c?.email), ip }`). Each in its own `try/catch` so audit failure never blocks auth.
- [ ] **Step 2:** `session-actions.ts signOutAction`: before `signOut`, best-effort `writeAudit({ actorId: me.id, action:'LOGOUT', entity:'User', entityId: me.id })`.
- [ ] **Step 3:** both document routes: after confirming access + before/at streaming, best-effort `writeAudit({ actorId: session.user.id, action:'DOWNLOAD', entity:'Document', entityId: <docId>, meta:{ filename: doc.filename } })`.
- [ ] **Step 4:** tsc + build. **Commit** `feat(audit): capture login/logout/failed-login/download events`

---

## Task 6: ActivityPanel (History + Comments) + actions

**Files:** Create `lumina/src/components/activity/ActivityPanel.tsx`, `HistoryList.tsx`, `CommentThread.tsx`, `actions.ts`; Modify `src/components/ui` barrel if needed (use existing primitives).

**Consumes:** activity + comments services. **Produces:** `<ActivityPanel entity entityId initialActivity initialComments canSeeDiff />` (server pages fetch the data and pass it in; the panel is a client component handling tab state + comment composer/edit/delete).

- [ ] **Step 1:** `actions.ts` (`'use server'`): `postComment(prev, fd)` (entity, entityId, body → `addComment`), `updateComment(prev, fd)` (id, body → `editComment`), `removeComment(prev, fd)` (id → `deleteComment`) — each `{error, ok?}` + `revalidatePath` of the referrer (pass a `path` hidden field and `revalidatePath(path)`), mapping errors via `userErrorMessage`.
- [ ] **Step 2:** `CommentThread.tsx` (client): renders comment list (avatar via `/avatars/[id]`, name, `timeAgoAr`, body, "(عُدّل)"), edit (inline textarea using `updateComment`) + delete (`removeComment`) for `mine`/admin, and a composer textarea (`postComment`) via `useActionToast`.
- [ ] **Step 3:** `HistoryList.tsx` (client or server): timeline rows (avatar, phrase, `timeAgoAr` with absolute `title`); when `canSeeDiff` and a row has `diff`, a "تفاصيل" `<details>` rendering field/before/after. Empty state.
- [ ] **Step 4:** `ActivityPanel.tsx` (client): a two-button `History | Comments` switch (local `useState`), default Comments; renders the two subpanels. Reuses `Card`/tokens.
- [ ] **Step 5:** tsc + build. **Commit** `feat(activity): shared ActivityPanel (history + comments)`

---

## Task 7: Place ActivityPanel on entity pages

**Files:** Modify client hub (`clients/[id]/page.tsx` + `ClientHub.tsx` TABS), `contracts/[id]/page.tsx`, `works/[id]/page.tsx`; documents list `documents/page.tsx` (+ a client `DocumentActivityDrawer.tsx`).

- [ ] **Step 1: client hub** — add a `{ key:'activity', label:'النشاط' }` tab; when active, render `<ActivityPanel entity="Client" entityId={id} … />` with data fetched in the page (`listEntityActivity`, `listComments`, `canSeeDiff = ['ADMIN','LEGAL','FINANCE'].includes(role)`).
- [ ] **Step 2: contract detail** — add an "النشاط" section/card rendering `ActivityPanel entity="MasterContract"`.
- [ ] **Step 3: work detail** — same for `entity="Work"`.
- [ ] **Step 4: documents** — add a `DocumentActivityDrawer` (Dialog) opened by a per-row "النشاط" action in the documents list; loads `ActivityPanel entity="Document"`. (Data fetched on open via a tiny server action or by passing all rows' ids — simplest: a server action `loadDocumentActivity(id)` returning `{activity, comments, canSeeDiff}` called when the drawer opens.)
- [ ] **Step 5:** tsc + build. **Commit** `feat(activity): activity panels on client/contract/work/document`

---

## Task 8: Global feed + nav + overview + icon/messages

**Files:** Create `lumina/src/app/(app)/activity/page.tsx`; Modify `icons.tsx` (`IconActivity`), `messages/{en,ar}.json` (`nav.activity`), `layout.tsx` (admin nav item), `overview/page.tsx` (admin card).

- [ ] **Step 1:** `IconActivity` in icons.tsx (auto-exported via barrel). `nav.activity` = "Activity"/"النشاط".
- [ ] **Step 2:** `activity/page.tsx` (ADMIN-only via `can(role,'read','User')` else `redirect('/overview')`): `listGlobalActivity` + simple filters (entity `<select>`, date) via `searchParams`; timeline rows; "تحميل المزيد" link using `nextBefore`. `dynamic='force-dynamic'`.
- [ ] **Step 3:** `layout.tsx` — add `{ href:'/activity', key:'activity', icon:<IconActivity/> }` to the admin-only items (next to Users).
- [ ] **Step 4:** `overview/page.tsx` — for ADMIN, add an "أحدث النشاط" card showing latest ~6 `listGlobalActivity` items (guarded so non-admins don't fetch it).
- [ ] **Step 5:** tsc + lint + build. **Commit** `feat(activity): global feed page + nav + overview card`

---

## Task 9: e2e + finish

**Files:** Create `lumina/tests/e2e/activity.spec.ts`.

- [ ] **Step 1:** Spec (admin via `login`): (a) open a freshly created client's «النشاط» tab → Comments: post a comment → it appears; edit it → "(عُدّل)"; delete it → gone. (b) History tab shows at least one recorded action (the client creation). (c) `/activity` loads for admin and shows recent items. (d) a VIEWER (provision like the user-mgmt e2e, or reuse) hitting `/activity` is redirected to `/overview`.
- [ ] **Step 2:** `npm run e2e` until green.
- [ ] **Step 3:** Full gate (`tsc`, `lint`, `test`, `build`, `e2e`), then **superpowers:finishing-a-development-branch** → push `feat/activity-collaboration`, PR, CI, merge.
