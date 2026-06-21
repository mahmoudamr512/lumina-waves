# Activity & Collaboration — Design Spec

**Date:** 2026-06-21
**Status:** Approved
**Scope:** A single cohesive subsystem — a system-wide activity/audit history surfaced in the UI (per-entity timelines + a global feed) plus comment threads on key records.

## Goal

Make "who did what, when" visible across the app (Jira-style), and let people discuss records via comment threads. The backend already records mutations in `AuditLog` (32 `writeAudit` call sites across all services); this feature surfaces that history, fills coverage gaps (logins, downloads), and adds collaborative comments.

## Global Constraints (from the existing codebase)

- Next.js 16 (App Router, RSC + server actions, edge `proxy.ts` optimistic gate, Node-runtime auth enforcement via `loadSession`/`requireUser`), React 19, Tailwind v4, Prisma 7 (`@/generated/prisma/client`, `@/lib/db` soft-delete extension that does NOT filter nested includes), Auth.js v5 (Credentials + JWT + revocable `UserSession`), next-intl (AR/EN + RTL).
- RBAC via `can(role, action, entity)`; services enforce with `requireUser`. `redactSensitive(role, entity, row)` strips sensitive fields; `passwordHash` is never returned to the client.
- Soft-delete via `deletedAt`; bilingual only for nav/auth/ui; page body copy hardcoded Arabic; reuse `@/components/ui` primitives + the `useActionToast`/`useActionState` form patterns; `.focus-ring`; logical RTL props.
- Avatars are served at `/avatars/[userId]` (authenticated).

## Approved product decisions

1. **Surfaces:** per-entity Activity panel (History + Comments tabs) **and** a global `/activity` feed.
2. **Comments on:** Clients, Contracts, Works, Documents. **History timelines** on all of those.
3. **Comment model:** flat thread; edit/delete your own (edited marker, soft delete); no nesting, no @mentions/notifications.
4. **History detail:** everyone with entity read-access sees human-readable phrases; ADMIN/LEGAL/FINANCE can expand an entry to a before/after diff with sensitive fields redacted (`passwordHash` always stripped).
5. **Who can comment:** anyone who can read the record (including FINANCE/VIEWER).
6. **Extra audit events:** logins, failed logins, logouts, and document/PDF downloads.
7. **Global feed:** ADMIN-only.

---

## 1. Data model

```prisma
model AuditLog {
  id        String   @id @default(cuid())
  actorId   String?            // CHANGED: nullable (failed logins have no user)
  action    String             // CREATE|UPDATE|DELETE|RESTORE|PURGE|LOGIN|LOGOUT|LOGIN_FAILED|DOWNLOAD|COMMENT
  entity    String
  entityId  String
  before    Json?
  after     Json?
  meta      Json?              // NEW: filename, attempted email, ip, etc.
  createdAt DateTime @default(now())

  @@index([entity, entityId, createdAt])   // NEW: per-entity timeline
  @@index([createdAt])                      // NEW: global feed
}

model Comment {
  id        String    @id @default(cuid())
  authorId  String
  author    User      @relation(fields: [authorId], references: [id])
  entity    String    // 'Client' | 'MasterContract' | 'Work' | 'Document'
  entityId  String
  body      String
  editedAt  DateTime?
  deletedAt DateTime?            // soft delete
  createdAt DateTime  @default(now())

  @@index([entity, entityId, createdAt])
}
```

`User` gains `comments Comment[]` (back-relation). `action` is a free string, so the new kinds need no enum migration. Migration adds the `Comment` table, the `AuditLog.meta` column, `actorId` nullability, and the indexes.

`writeAudit` (`@/lib/audit`) extends its `AuditInput` with optional `meta?: unknown` and a nullable `actorId?: string | null`.

## 2. Constants

`ACTIVITY_ENTITIES = ['Client','MasterContract','Work','Document']` — entities that support comments. Centralised in `@/lib/activity-constants` and validated in services (reject anything else, fail-closed).

## 3. Services

### `src/services/activity.ts`
- `listEntityActivity(entity: string, entityId: string)` — gate `requireUser('read', entity as Entity)`; fetch `AuditLog` where `entity/entityId`, **excluding `action:'COMMENT'`**, newest first (cap e.g. 100); enrich actors; return `ActivityItem[]`.
- `listGlobalActivity(opts?: { entity?; actorId?; before?: Date; take?: number })` — gate `requireUser('read','User')` (ADMIN-only entity) → effectively admin; return enriched items + a cursor for "load more".
- `describeAudit(item)` → Arabic phrase from `(action, entity, meta)` (e.g. `DOWNLOAD`+`Document` → `«نزّل المستند «{filename}»`). Pure function, unit-tested.
- `auditDiff(role, item)` → `{ field, before, after }[]` for ADMIN/LEGAL/FINANCE only, computed by diffing `before`/`after` after `redactSensitive(role, entity, …)` and dropping `passwordHash`/internal fields; returns `null` for other roles.
- Actor enrichment: collect `actorId`s, one `db.user.findMany` (select id/name/avatarPath), map; missing/null → `{ name: 'النظام', id: null }`.

`ActivityItem = { id, action, entity, entityId, createdAt, actor: { id: string|null; name: string; hasAvatar: boolean }, meta, phrase, diff: DiffRow[]|null }`.

### `src/services/comments.ts`
- `listComments(entity, entityId)` — gate `can(role,'read',entity)` via `requireUser('read', entity)`; return non-deleted comments oldest→newest, enriched with author name/avatar + `mine: authorId===caller`.
- `addComment(entity, entityId, body)` — gate read-access; validate `entity ∈ ACTIVITY_ENTITIES` and `1..4000` chars; create; `writeAudit({action:'COMMENT', entity, entityId, actorId, meta:{commentId}})`.
- `editComment(id, body)` — author only (else `AuthzError`); set `body`, `editedAt`.
- `deleteComment(id)` — author OR ADMIN; set `deletedAt` (soft).

## 4. Audit event additions (best-effort; wrapped in try/catch so they never break the action)

- `src/lib/auth.ts authorize`: on success → `LOGIN` (`actorId:user.id, entity:'User', entityId:user.id, meta:{ip,ua}`); on bad credentials / disabled → `LOGIN_FAILED` (`actorId:null, entity:'User', entityId:'-', meta:{email,ip}`).
- `src/lib/session-actions.ts signOutAction`: `LOGOUT` before `signOut`.
- `src/app/(app)/documents/[docId]/route.ts` and `…/generate/[docId]/route.ts`: on a successful stream → `DOWNLOAD` (`entity:'Document', entityId:docId, meta:{filename}`).

## 5. UI

### Shared `ActivityPanel` (`src/components/activity/`)
A `History | Comments` tab switch (client component; local tab state, not URL).
- **History tab** (server data passed in): timeline rows — actor avatar, `phrase`, relative time (`timeAgoAr`), and for privileged roles a "تفاصيل" expander rendering the redacted diff. Empty state.
- **Comments tab**: flat list (avatar, name, `timeAgoAr`, body, "(عُدّل)"; edit/delete affordances on `mine` or ADMIN-delete) + a composer textarea posting `addComment`. Forms use server actions + `useActionToast`.

### Placement
- **Client hub** (`clients/[id]`): add a fifth tab **«النشاط»** rendering `ActivityPanel` for `('Client', id)`.
- **Contract detail** (`contracts/[id]`) & **Work detail** (`works/[id]`): an Activity panel section for `('MasterContract'|'Work', id)`.
- **Documents**: no detail page (`/documents/[docId]` is the file stream), so each document row opens an **Activity drawer/modal** (`Dialog`) showing `ActivityPanel('Document', id)` — added to the documents list and the contextual document lists where practical (documents list page first).

### Global feed
- `src/app/(app)/activity/page.tsx` (ADMIN-only; non-admin → `redirect('/overview')`): paginated timeline via `listGlobalActivity`, with simple filters (entity type select, actor, date) and "تحميل المزيد".
- **Sidebar**: new ADMIN-only **«النشاط»** item (`IconActivity`) + `nav.activity` messages.
- **Overview**: an admin-only "أحدث النشاط" card showing the latest ~6 global items.

### Helper
- `timeAgoAr(date)` in `@/lib/labels` — "الآن / منذ ٥ دقائق / منذ ٣ ساعات / منذ يومين / {formatDateAr}" with an absolute `title`.

## 6. RBAC recap (enforced server-side, fail-closed)
- Per-entity History + Comments read, and posting a comment → `can(role,'read', entity)`.
- Edit comment → author only. Delete comment → author or ADMIN.
- History diff detail → ADMIN/LEGAL/FINANCE (and still `redactSensitive`).
- Global feed → ADMIN.
- Audit-event writes are server-only and best-effort.

## 7. Error handling
- Comment validation (empty/too long) and authorship violations surface as friendly messages via the action `{error}` state (reuse `userErrorMessage`-style mapping); never a raw 500.
- Best-effort audit writes log a `console.warn` on failure and do not propagate.
- `describeAudit` falls back to a generic phrase for unknown `(action, entity)`.

## 8. Testing
- **Unit:** `describeAudit` phrasing for each action/entity incl. `meta`; `auditDiff` redacts sensitive fields and returns null for non-privileged roles; `listEntityActivity` excludes `COMMENT`; `listGlobalActivity` ADMIN-only; comments add/edit/delete with ownership + RBAC + soft-delete + validation; a login writes a `LOGIN` audit row.
- **e2e:** on a client, post → edit → delete a comment; the History tab shows a real recorded action; `/activity` is ADMIN-only (a VIEWER is redirected); a fresh login appears in `/activity`.

## 9. File map
- **Modify:** `prisma/schema.prisma`; `src/lib/audit.ts` (meta + nullable actor); `src/lib/auth.ts` (login/failed audit); `src/lib/session-actions.ts` (logout audit); `documents/[docId]/route.ts` + `contracts/[id]/generate/[docId]/route.ts` (download audit); `src/lib/labels.ts` (`timeAgoAr`); `src/components/ui/icons.tsx` (`IconActivity`); `src/messages/{en,ar}.json` (`nav.activity`); `app/(app)/layout.tsx` (admin Activity nav); client hub page (+tab); contract & work detail pages (+panel); documents list (+activity drawer); overview page (+admin card).
- **Create:** `src/lib/activity-constants.ts`, `src/services/activity.ts`, `src/services/comments.ts`, `src/components/activity/ActivityPanel.tsx` (+ History/Comments subcomponents + actions), `src/app/(app)/activity/page.tsx`, plus unit + e2e tests.

## 10. Out of scope (v1)
- @mentions, notifications, reactions, nested replies, comment attachments.
- Read/view tracking beyond downloads; field-level per-role diff config beyond the existing sensitive sets.
- Editing/deleting audit entries (immutable by design).
