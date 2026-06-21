# User Management — Design Spec

**Date:** 2026-06-21
**Status:** Approved (pending final spec review)
**Scope:** A single cohesive subsystem — admin user management + revocable sessions + self-service session control — layered on the existing Lumina Waves app.

## Goal

Add an admin-only **User Management** area to manage application users (create, edit, change role, enable/disable, reset password, soft-delete) with **RBAC**, and give **session visibility + revocation** (admins over everyone; every user over their own devices). Every user also gets a **thin self-service account**: a small profile (name, **mobile number**, optional **profile picture**), and the ability to change their **own email** and **own password**. This closes the gap where users today exist only via the seed script and where logins cannot be observed or revoked.

**Explicitly NOT in this feature:** there is **no invitation flow and no public sign-up**. Accounts are created only by an admin. Self-service covers profile/email/password and sessions for an *existing* account — never account creation.

## Global Constraints (carried from the existing codebase)

- **Stack:** Next.js 16 (App Router, RSC + server actions, auth gate in `src/proxy.ts`), React 19, Tailwind v4 (`@theme` tokens), Prisma 7 (client `@/generated/prisma/client`, db `@/lib/db` with a soft-delete extension that does **NOT** filter nested includes — add `where: { deletedAt: null }` manually), Auth.js v5 (Credentials provider, **JWT** strategy), next-intl (AR/EN + RTL).
- **RBAC:** `can(role, action, entity)` from `@/lib/authz`; services enforce via `requireUser`. No schema/RBAC bypass; fail-closed.
- **Conventions:** soft-delete via `deletedAt`/`purgeAfter`/`purgedAt`; all mutations write `writeAudit`; bilingual only for nav/auth/ui-primitives, page body copy is hardcoded Arabic; reuse the existing UI primitives (`@/components/ui`) and form patterns (`useActionState` / `useQuickAdd`); `.focus-ring` on interactive elements; logical RTL properties (`start/end`, `ps/pe`).
- **Passwords:** `hashPassword`/`verifyPassword` from `@/lib/password` (bcrypt cost 12). `passwordHash` is never sent to the client.

## Roles (unchanged enum)

`ADMIN | OPERATIONS | LEGAL | FINANCE | VIEWER`. User Management (managing *other* users — CRUD, roles, admin session control) is **ADMIN-only**. **Self-service** — own profile, own email, own password, own sessions — is available to **every authenticated user** for their own account only (ownership-scoped to the caller's `userId`, not gated by the `User` entity).

---

## 1. Session model (hybrid: JWT + revocable session records)

Keep the JWT login but make sessions revocable by recording each one and validating it server-side on every protected request.

- **Login** (`authorize` in `src/lib/auth.ts`, which receives the request): after verifying credentials, INSERT a `UserSession` row capturing `ip` (from `x-forwarded-for`/remote) and `userAgent`. Return the new session id as `sid` on the user object.
- **JWT callback:** persist `token.sid = user.sid` on sign-in.
- **`loadSession()` helper (new, Node runtime):** on each protected request, `db.userSession.findUnique({ where: { id: sid }, include: { user: true } })` and reject when **revoked** (`revokedAt` set), **expired** (`expiresAt` past), **user disabled** (`user.disabledAt` set), or **user soft-deleted** (`user.deletedAt` set). On success it returns `{ id: user.id, role: user.role (LIVE from DB), sid }` and updates `lastSeenAt` **throttled** (≤ once per 5 minutes).
  - Reading the **live role** from the DB (not the token) makes **role changes, disable, and revoke take effect immediately** on the next request, not on next login.
- **Enforcement points (Node runtime only):**
  - `src/app/(app)/layout.tsx` — calls `loadSession()`; on null → `redirect('/login')`. Guards every page in the group.
  - `requireUser(action, entity)` — rewritten to use `loadSession()`; throws `AuthzError('UNAUTHENTICATED')` if null, then the existing `can()` check. Guards services, server actions, and route handlers (e.g. `/documents/[docId]`).
  - `src/proxy.ts` — **unchanged**: stays an optimistic, JWT-only edge redirect. This deliberately avoids running Prisma on the Edge runtime; authoritative revocation lives in Node.
- **Logout:** a server action sets `revokedAt` on the current `sid` then calls `signOut()`, so logout is reflected in the session list.

**Trade-off (accepted by the user):** one DB read per protected request — inherent to revocable sessions; acceptable for an internal tool.

### Expiry policy

`expiresAt` is set at login to match the JWT max age (Auth.js default 30 days). `loadSession()` treats a past `expiresAt` as inactive. No idle-timeout in v1 (can be added later by comparing `lastSeenAt`).

---

## 2. Data model changes

```prisma
model User {
  // ...existing fields...
  phone      String?          // NEW — employee mobile number (thin profile)
  avatarPath String?          // NEW — path to profile picture file in STORAGE_DIR (optional)
  disabledAt DateTime?        // NEW — set = account disabled (login blocked, sessions revoked)
  sessions   UserSession[]    // NEW relation
}

model UserSession {
  id        String    @id @default(cuid())   // == JWT `sid`
  user      User      @relation(fields: [userId], references: [id])
  userId    String
  createdAt DateTime  @default(now())
  lastSeenAt DateTime @default(now())
  expiresAt DateTime
  revokedAt DateTime?
  userAgent String?
  ip        String?

  @@index([userId])
}
```

`authz.ts`: extend `Entity` with `'User'`; `can()` returns true for `User` only when `role === 'ADMIN'` (the existing early `if (role === 'ADMIN') return true` already covers admins; add an explicit `if (entity === 'User') return false` for non-admins to be safe/legible). No new sensitive-field redaction needed beyond never selecting `passwordHash`.

A Prisma migration adds the table + columns.

**Profile picture storage:** avatars are stored as files under `STORAGE_DIR` (a server-generated UUID filename, image extensions only, small size cap), reusing the existing upload + path-traversal/realpath-guard pattern from `uploadDocument`/the document route. They are served by a thin authenticated route handler `GET /avatars/[userId]` (any authenticated user may view avatars — they are not sensitive). `avatarPath` is never sent raw to the client; the UI references the route.

---

## 3. Capabilities + RBAC guardrails

`src/services/users.ts` (new). Every function `requireUser(<action>, 'User')` (ADMIN) + `writeAudit`:

- `listUsers()` — id, email, name, role, disabledAt, createdAt, **active-session count**; excludes soft-deleted; never selects `passwordHash`.
- `getUser(id)` — same projection for one user.
- `createUser({ email, name, role, password })` — hashes password; unique email enforced by schema; audits CREATE.
- `updateUser(id, { name?, email?, phone? })` and `changeRole(id, role)` — audits UPDATE (before/after).
- `setUserAvatar(id, file)` / `removeUserAvatar(id)` — admin sets/clears any user's profile picture (same image-only, size-capped, UUID-filename storage as self-service). Admins may edit **every** field of any user (name/email/phone/role/password/avatar/status); self-service is the same surface restricted to one's own account.
- `setPassword(id, password)` — hashes; **revokes all that user's sessions**; audits UPDATE.
- `disableUser(id)` / `enableUser(id)` — toggles `disabledAt`; disable **revokes all that user's sessions**; audits UPDATE.
- `deleteUser(id)` — soft-delete (`deletedAt`); **revokes all sessions**; audits DELETE.

### Guardrails (server-side, fail-closed)

1. An admin **cannot disable, delete, or demote themselves** (prevents self-lockout).
2. The system must always retain **≥ 1 active admin** — disable/delete/demote is rejected if it would remove the last active (`disabledAt == null && deletedAt == null`) ADMIN.
3. Email uniqueness violations surface as a friendly validation error, not a 500.

---

## 4. Sessions: visibility + revoke

`src/services/sessions.ts` (new):

- **Admin (ADMIN-gated via `requireUser(..., 'User')`):** `listSessionsForUser(userId)`, `revokeSession(sessionId)`, `revokeAllUserSessions(userId)`.
- **Self-service (ownership-scoped — caller may only touch their own `userId`, enforced against the session's `userId`, NOT via the `User` entity):** `listMySessions()`, `revokeMySession(sessionId)`, `revokeMyOtherSessions()`.
- Revocation sets `revokedAt = now()`. Revoked/expired rows still appear in lists with a status badge for a short window so the admin can see recent activity.
- All revocations audit (`entity: 'User'`, action `UPDATE`, with a `revokedSessionId`/`revokedAll` detail).

## 4b. Self-service account (profile, email, password)

`src/services/account.ts` (new) — all functions operate **only on the authenticated caller** (resolve `userId` from `loadSession()`; no id parameter is trusted from the client) and audit as `entity: 'User'`, action `UPDATE` on the caller's own row:

- `getMyProfile()` — returns the caller's name, email, phone, avatar presence, role (read-only), created date. Never returns `passwordHash`.
- `updateMyProfile({ name?, phone?, email? })` — self profile edit. Email change enforces uniqueness (friendly error on conflict). No email verification step (out of scope).
- `changeMyPassword(currentPassword, newPassword)` — **verifies the current password** with `verifyPassword`; on success hashes the new one and **revokes the caller's other sessions** (keeps the current one). Wrong current password → friendly validation error, no change.
- `setMyAvatar(file)` / `removeMyAvatar()` — stores/clears the caller's profile picture (image-only, size-capped, UUID filename under `STORAGE_DIR`).

---

## 5. IA / UI

Reuses existing primitives (`Table`, `Card`, `Dialog`, `Badge`, `Field`, `Toast`, `Breadcrumb`, `EmptyState`) and form patterns.

- **Sidebar:** new **ADMIN-only** nav item **«المستخدمون»** with a new `IconUsers`, conditionally rendered by role (the sidebar already receives role context via the layout). Bilingual label via next-intl `nav.users`.
- **`/users`** (ADMIN) — list table: name, email, role badge, status (نشط / معطّل), active-session count, created date; “مستخدم جديد” button; client-side filter/sort consistent with the clients list.
- **`/users/new`** (ADMIN) — create form: email, name, role `<select>`, initial password (with a “show” toggle); on success toast + navigate to the new user.
- **`/users/[id]`** (ADMIN) — detail:
  - Profile card: edit name/email/phone; change role `<select>`; set/remove the user's **profile picture**.
  - Status actions: disable/enable, reset password (Dialog), delete (Dialog confirm).
  - **Sessions panel:** table of the user's sessions (device parsed from UA, IP, created, last seen, status) with per-row **Revoke** and an **«إنهاء كل الجلسات»** button. Guardrail messages surface as toasts.
- **`/account`** (every authenticated user) — self-service profile:
  - **Profile card:** edit name, **mobile number**, and **profile picture** (upload/remove); change **own email**; role shown read-only.
  - **Security card:** change **own password** (current + new + confirm).
  - **«جلساتي» sessions panel:** the caller's sessions, current session highlighted, **«تسجيل الخروج من الأجهزة الأخرى»**.
  - Linked from the sidebar footer (the name area), which also shows the user's avatar.

Page bodies are RSC fetching role-redacted service data; mutations are server actions following the established `useActionState` / `useQuickAdd` pattern.

---

## 6. Error handling

- Service guardrail violations throw typed errors (reuse `AuthzError`/validation error shape) that the forms render in-place; never a raw 500. This includes duplicate-email and wrong-current-password on self password change.
- `loadSession()` failures resolve to a clean redirect to `/login` (page layer) or `AuthzError('UNAUTHENTICATED')` (service layer).
- Best-effort side effects (audit already required; no external queues here) do not block the security-critical mutation.

## 7. Testing

- **Unit (`tests/unit`):**
  - `authz` — `can('…','User')` matrix (ADMIN true, others false).
  - `users` service — create/update/changeRole/setPassword/disable/enable/delete; guardrails (last-admin, self-action rejection); disable & reset-password revoke sessions; `passwordHash` never returned.
  - `sessions` service — revoke sets `revokedAt`; `loadSession` rejects revoked/expired/disabled/deleted; live-role immediacy; self-service ownership scoping (cannot revoke another user's session).
  - `account` service — `updateMyProfile` email-uniqueness; `changeMyPassword` rejects wrong current password and (on success) revokes other sessions but not the current; avatar set/remove; operates only on the caller (ignores any client-supplied id).
- **e2e (`tests/e2e`):** admin creates user → user logs in → admin changes role (effect verified on a gated action) → admin revokes the user's session (next request forces re-login) → admin disables user (login blocked) → self-service: a user edits their profile (name/phone), changes their own password and re-logs in with it, and revokes their other device.

## 8. File map

- **Modify:** `prisma/schema.prisma` (+`UserSession`, +`User.disabledAt/phone/avatarPath`), `src/lib/authz.ts` (+`User` entity), `src/lib/auth.ts` (session creation + `loadSession` + `requireUser` rewrite), `src/app/(app)/layout.tsx` (session guard + admin nav item), the sidebar nav config + footer (avatar + account link), `src/messages/{en,ar}.json` (+`nav.users`, +`nav.account`), `src/components/ui/icons.tsx` (+`IconUsers`), the logout control (→ revoke + signOut server action).
- **Create:** `src/services/users.ts`, `src/services/sessions.ts`, `src/services/account.ts`, `src/app/(app)/users/page.tsx`, `users/new/page.tsx` (+form+actions), `users/[id]/page.tsx` (+forms+actions+sessions panel), `src/app/(app)/account/page.tsx` (+profile/email/password/session forms+actions), `src/app/(app)/avatars/[userId]/route.ts` (authenticated avatar stream), plus unit + e2e tests.

## 9. Out of scope (v1)

- **Invitations and public sign-up** — accounts are created by an admin only.
- Email invitations / password-reset emails, and **email-change verification** (admin sets passwords directly; self email change applies immediately with a uniqueness check).
- 2FA.
- Idle-timeout and login rate-limiting (existing login behavior unchanged).
- Per-field role refinement of `User` (entity-level ADMIN gate is sufficient).
