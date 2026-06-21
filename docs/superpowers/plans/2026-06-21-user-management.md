# User Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin-only user management (CRUD, roles, enable/disable, reset password, soft-delete, avatars) with RBAC, revocable sessions (hybrid JWT + UserSession table), and a thin self-service account (profile, email, password, own sessions).

**Architecture:** Keep Auth.js JWT login but record each login as a `UserSession` row whose id (`sid`) is embedded in the JWT. A Node-runtime `loadSession()` validates the session + reads the live user role on every protected request (enforced in the `(app)` layout and `requireUser`); the edge `proxy.ts` stays optimistic. Services own all mutations with RBAC + guardrails + audit; pages/forms reuse existing UI primitives and the `useActionState` action pattern.

**Tech Stack:** Next.js 16 (App Router, RSC, server actions), React 19, Tailwind v4, Prisma 7 (`@/generated/prisma/client`, `@/lib/db`), Auth.js v5 (Credentials + JWT), next-intl, Vitest, Playwright.

## Global Constraints

- Soft-delete extension does NOT filter nested includes — add `where: { deletedAt: null }` manually on nested includes.
- Every mutation calls `requireUser(action, entity)` and `writeAudit(...)`.
- `passwordHash` is NEVER selected into anything returned to the client.
- Bilingual only for nav/auth/ui; page body copy hardcoded Arabic.
- `.focus-ring` on interactive elements; logical RTL props (`start/end`, `ps/pe`).
- Node unit tests hit the real dev DB with no per-test reset — use unique emails per run.
- Passwords via `hashPassword`/`verifyPassword` (`@/lib/password`).
- Self-service functions resolve `userId` from `loadSession()` — never trust a client-supplied id.

---

## Task 1: Schema — UserSession + User profile/disable fields

**Files:**
- Modify: `lumina/prisma/schema.prisma`
- Command: `npx prisma migrate dev --name user_management` then `npx prisma generate`

- [ ] **Step 1: Add fields + model to `schema.prisma`**

In `model User` add:
```prisma
  phone      String?
  avatarPath String?
  disabledAt DateTime?
  sessions   UserSession[]
```
Add new model:
```prisma
model UserSession {
  id         String    @id @default(cuid())
  user       User      @relation(fields: [userId], references: [id])
  userId     String
  createdAt  DateTime  @default(now())
  lastSeenAt DateTime  @default(now())
  expiresAt  DateTime
  revokedAt  DateTime?
  userAgent  String?
  ip         String?

  @@index([userId])
}
```

- [ ] **Step 2: Migrate + generate**

Run: `cd lumina && npx prisma migrate dev --name user_management && npx prisma generate`
Expected: migration created/applied, client regenerated, `npx tsc --noEmit` still clean.

- [ ] **Step 3: Commit** `git add -A && git commit -m "feat(db): UserSession model + user profile/disable fields"`

---

## Task 2: RBAC — add `User` entity

**Files:**
- Modify: `lumina/src/lib/authz.ts`
- Test: `lumina/tests/unit/authz.user.test.ts`

**Produces:** `Entity` now includes `'User'`; `can(role,'…','User')` is true only for ADMIN.

- [ ] **Step 1: Write failing test** `tests/unit/authz.user.test.ts`
```ts
import { can } from '@/lib/authz'
test('User entity is ADMIN-only', () => {
  for (const a of ['create','read','update','delete'] as const) {
    expect(can('ADMIN', a, 'User')).toBe(true)
    expect(can('LEGAL', a, 'User')).toBe(false)
    expect(can('OPERATIONS', a, 'User')).toBe(false)
    expect(can('FINANCE', a, 'User')).toBe(false)
    expect(can('VIEWER', a, 'User')).toBe(false)
  }
})
```
- [ ] **Step 2: Run — fails** (`'User'` not assignable to `Entity`). Run: `npx vitest run tests/unit/authz.user.test.ts`
- [ ] **Step 3: Implement** — add `'User'` to the `Entity` union; in `can`, after the `ADMIN` early-return, add `if (entity === 'User') return false`.
- [ ] **Step 4: Run — passes.**
- [ ] **Step 5: Commit** `feat(authz): add ADMIN-only User entity`

---

## Task 3: Session core — record sessions, `loadSession()`, `requireUser` rewrite

**Files:**
- Modify: `lumina/src/types/next-auth.d.ts` (add `sid` to JWT)
- Create: `lumina/src/lib/session.ts` (session record helpers + `loadSession`)
- Modify: `lumina/src/lib/auth.ts` (authorize records session; jwt persists sid; `requireUser` uses `loadSession`)
- Test: `lumina/tests/unit/session.test.ts`

**Produces:**
- `createSessionRecord(userId: string, ip?: string, userAgent?: string): Promise<string>` (returns sid)
- `loadSession(): Promise<{ id: string; role: Role; sid: string } | null>`
- `revokeSessionRecord(sid: string)`, `SESSION_TTL_MS` constant
- `requireUser(action, entity): Promise<{ id: string; role: Role; sid: string }>` (now throws if session inactive)

- [ ] **Step 1: Add `sid` to JWT type** in `next-auth.d.ts`:
```ts
declare module '@auth/core/jwt' {
  interface JWT { id: string; role: Role; sid?: string }
}
```
Also add `sid` to `User` interface (`interface User { role: Role; sid?: string }`).

- [ ] **Step 2: Create `src/lib/session.ts`**
```ts
import { db } from '@/lib/db'
import type { Role } from '@/generated/prisma/client'
import { auth } from '@/lib/auth'

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30d, matches JWT default
const TOUCH_THROTTLE_MS = 5 * 60 * 1000

export async function createSessionRecord(userId: string, ip?: string, userAgent?: string) {
  const row = await db.userSession.create({
    data: { userId, ip, userAgent, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
  })
  return row.id
}

export async function revokeSessionRecord(sid: string) {
  await db.userSession.updateMany({ where: { id: sid, revokedAt: null }, data: { revokedAt: new Date() } })
}

/** Validate the current request's session against the DB and return the LIVE user. */
export async function loadSession(): Promise<{ id: string; role: Role; sid: string } | null> {
  const s = await auth()
  const sid = s?.user ? (s as { user: { sid?: string } }).user.sid : undefined
  // sid lives on the token; expose via session callback (see auth.ts)
  if (!sid) return null
  const row = await db.userSession.findUnique({ where: { id: sid }, include: { user: true } })
  if (!row || row.revokedAt || row.expiresAt < new Date()) return null
  if (row.user.deletedAt || row.user.disabledAt) return null
  if (Date.now() - row.lastSeenAt.getTime() > TOUCH_THROTTLE_MS) {
    await db.userSession.update({ where: { id: sid }, data: { lastSeenAt: new Date() } })
  }
  return { id: row.user.id, role: row.user.role, sid }
}
```

- [ ] **Step 3: Wire `auth.ts`** — in `authorize(c, req)` capture ip/ua and create a session record:
```ts
async authorize(c, req) {
  const user = await db.user.findUnique({ where: { email: String(c?.email) } })
  const hash = user?.passwordHash ?? DUMMY_PASSWORD_HASH
  const ok = await verifyPassword(String(c?.password), hash)
  if (!user || !ok) return null
  if (user.disabledAt || user.deletedAt) return null  // disabled/deleted cannot log in
  const ip = req?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ua = req?.headers?.get('user-agent') ?? undefined
  const sid = await createSessionRecord(user.id, ip, ua)
  return { id: user.id, email: user.email, name: user.name, role: user.role, sid }
}
```
In callbacks: `jwt({token,user}) { if (user) { token.role = user.role; token.sid = user.sid } return token }` and `session({session,token}) { session.user.role = token.role; session.user.id = token.sub ?? token.id; session.user.sid = token.sid; return session }`. Add `sid` to the Session.user type in `next-auth.d.ts`. Import `createSessionRecord` from `@/lib/session` — to avoid a circular import (`session.ts` imports `auth`), keep `createSessionRecord` import inside `auth.ts` only (one-way: auth.ts → session.ts for create; session.ts → auth.ts for loadSession). If circularity bites, inline `createSessionRecord` body in auth.ts and keep `loadSession`/`revokeSessionRecord` in session.ts. Verify with `tsc`.

- [ ] **Step 4: Rewrite `requireUser`** in `auth.ts` to use `loadSession`:
```ts
export async function requireUser(action: Action, entity: Entity) {
  const s = await loadSession()
  if (!s) throw new AuthzError('UNAUTHENTICATED')
  if (!can(s.role, action, entity)) throw new AuthzError('FORBIDDEN')
  return s
}
```

- [ ] **Step 5: Write tests** `tests/unit/session.test.ts` — create a user + session via `createSessionRecord`, then assert (mocking `auth` to return `{ user: { sid } }`): active session returns live role; setting `revokedAt` → null; past `expiresAt` → null; `user.disabledAt` → null; changing `user.role` in DB → `loadSession` reflects new role. Use `vi.mock('@/lib/auth', ...)` to control `auth()` while importing `loadSession` from `@/lib/session`.

- [ ] **Step 6: Run tests + tsc.** Run: `npx vitest run tests/unit/session.test.ts && npx tsc --noEmit`

- [ ] **Step 7: Commit** `feat(auth): revocable sessions via UserSession + loadSession`

---

## Task 4: Layout session guard

**Files:** Modify `lumina/src/app/(app)/layout.tsx`

- [ ] **Step 1:** Replace `const session = await auth(); if (!session?.user) redirect('/login')` with `loadSession()`:
```ts
import { loadSession } from '@/lib/session'
import { db } from '@/lib/db'
// ...
const s = await loadSession()
if (!s) redirect('/login')
const me = await db.user.findUnique({ where: { id: s.id }, select: { name: true, email: true, avatarPath: true } })
```
Pass `name`/`role` (from `s.role`) and an `avatarUrl={ me?.avatarPath ? '/avatars/' + s.id : undefined }` into `<Sidebar>` (Sidebar avatar wiring in Task 9). Keep redirect-on-null behaviour (covers revoked/disabled).

- [ ] **Step 2:** Run `npx tsc --noEmit` + manual: build passes. Commit `feat(auth): enforce revocable session in app layout`

---

## Task 5: Users service

**Files:**
- Create: `lumina/src/services/users.ts`
- Test: `lumina/tests/unit/users.service.test.ts`

**Produces:**
- `listUsers()`, `getUser(id)`
- `createUser({email,name,role,password})`, `updateUser(id,{name?,email?,phone?})`, `changeRole(id,role)`
- `setUserPassword(id,password)`, `disableUser(id)`, `enableUser(id)`, `deleteUser(id)`
- `setUserAvatar(id, file: File)`, `removeUserAvatar(id)`
- All return objects WITHOUT `passwordHash`.

- [ ] **Step 1: Write failing tests** covering: create returns no `passwordHash`; `changeRole` updates; **last-admin guard** (disabling/deleting/demoting the only active ADMIN throws); **self-action guard** (acting admin cannot disable/delete/demote self — pass acting id via `requireUser` mock returning that admin); `disableUser`/`setUserPassword`/`deleteUser` set `revokedAt` on the user's sessions; duplicate email throws. Mock `@/lib/auth`'s `requireUser` to return `{ id: <actingAdminId>, role: 'ADMIN', sid: 'x' }`.

- [ ] **Step 2: Run — fail** (module missing).

- [ ] **Step 3: Implement `users.ts`.** Key rules:
  - All fns `const u = await requireUser('<action>','User')`.
  - Projection helper excludes `passwordHash`: `select: { id:true,email:true,name:true,phone:true,role:true,disabledAt:true,avatarPath:true,createdAt:true }`.
  - `listUsers`: `where: { deletedAt: null }`, include `_count: { select: { sessions: { where: { revokedAt: null, expiresAt: { gt: new Date() } } } } }`.
  - Guardrails (throw `AuthzError('FORBIDDEN')` or a `ValidationError`): 
    - self: `if (id === u.id && (disabling||deleting||demoting)) throw`.
    - last admin: `if (target.role==='ADMIN' && (willLoseAdmin)) { const others = await db.user.count({ where: { role:'ADMIN', deletedAt:null, disabledAt:null, id: { not: id } } }); if (others===0) throw }`.
  - `disableUser`/`deleteUser`/`setUserPassword` also `await db.userSession.updateMany({ where:{ userId:id, revokedAt:null }, data:{ revokedAt:new Date() } })`.
  - avatar fns reuse storage (Task 14 exposes `saveAvatarFile(file): Promise<string>`; import it). `setUserAvatar` stores path; `removeUserAvatar` nulls it.
  - Each fn `writeAudit({ actorId:u.id, action, entity:'User', entityId:id, after })`.
  - Duplicate-email: catch P2002 → throw a `ValidationError('DUPLICATE_EMAIL')` (add to `@/lib/errors` if absent).

- [ ] **Step 4: Run tests — pass.** + `tsc`.

- [ ] **Step 5: Commit** `feat(users): user management service with RBAC guardrails + audit`

---

## Task 6: Sessions service

**Files:**
- Create: `lumina/src/services/sessions.ts`
- Test: `lumina/tests/unit/sessions.service.test.ts`

**Produces:** `listSessionsForUser(userId)`, `revokeSession(sid)`, `revokeAllUserSessions(userId)` (ADMIN); `listMySessions()`, `revokeMySession(sid)`, `revokeMyOtherSessions()` (self, ownership-checked).

- [ ] **Step 1: Failing tests** — admin can list/revoke any user's sessions; `revokeSession` sets `revokedAt`; self `revokeMySession` on a session NOT owned by caller throws (mock `loadSession` to return caller); `revokeMyOtherSessions` revokes all but current `sid`.
- [ ] **Step 2: Run — fail.**
- [ ] **Step 3: Implement.** Admin fns: `requireUser('read'|'update','User')`. Self fns: `const me = await loadSession(); if (!me) throw AuthzError('UNAUTHENTICATED')`; for `revokeMySession`, load the row and `if (row.userId !== me.id) throw AuthzError('FORBIDDEN')`; `revokeMyOtherSessions` → `updateMany({ where:{ userId:me.id, id:{ not: me.sid }, revokedAt:null }, data:{ revokedAt:new Date() } })`. List returns device/ip/createdAt/lastSeenAt/expiresAt/revokedAt + `current: id===me.sid` for self.
- [ ] **Step 4: Run — pass.** + tsc.
- [ ] **Step 5: Commit** `feat(sessions): admin + self-service session listing & revocation`

---

## Task 7: Account service (self-service)

**Files:**
- Create: `lumina/src/services/account.ts`
- Test: `lumina/tests/unit/account.service.test.ts`

**Produces:** `getMyProfile()`, `updateMyProfile({name?,phone?,email?})`, `changeMyPassword(current,next)`, `setMyAvatar(file)`, `removeMyAvatar()` — all resolve caller via `loadSession()`.

- [ ] **Step 1: Failing tests** — `changeMyPassword` with wrong current throws `ValidationError('WRONG_PASSWORD')` and changes nothing; correct current updates hash AND revokes other sessions (keeps current `sid`); `updateMyProfile` duplicate email throws; functions operate only on caller (no id param).
- [ ] **Step 2: Run — fail.**
- [ ] **Step 3: Implement.** `const me = await loadSession(); if (!me) throw AuthzError('UNAUTHENTICATED')`. `changeMyPassword`: load `passwordHash`, `verifyPassword(current, hash)` → if false throw; else `hashPassword(next)` + update + `updateMany` revoke sessions where `userId=me.id, id != me.sid`. `updateMyProfile`: update allowed fields, catch P2002 → `ValidationError('DUPLICATE_EMAIL')`. Audit each (`entity:'User', entityId:me.id`). Never return `passwordHash`.
- [ ] **Step 4: Run — pass.** + tsc.
- [ ] **Step 5: Commit** `feat(account): self-service profile, email, password`

---

## Task 8: Revoke-on-logout

**Files:**
- Create: `lumina/src/app/(app)/account/actions.ts` (and reuse for logout) OR `lumina/src/lib/logout.ts` server action `signOutAction()`
- Modify: `lumina/src/components/ui/Sidebar.tsx`

- [ ] **Step 1:** Create a server action `signOutAction()`:
```ts
'use server'
import { loadSession } from '@/lib/session'
import { revokeSessionRecord } from '@/lib/session'
import { signOut } from '@/lib/auth'
export async function signOutAction() {
  const me = await loadSession()
  if (me) await revokeSessionRecord(me.sid)
  await signOut({ redirectTo: '/login' })
}
```
- [ ] **Step 2:** In `Sidebar.tsx` replace the client `signOut(...)` button with a `<form action={signOutAction}>` submit button (keeps styling). Verify sign-out still redirects to `/login`.
- [ ] **Step 3: tsc + build.** Commit `feat(auth): revoke current session on sign-out`

---

## Task 9: Nav, icons, messages, sidebar avatar + account link

**Files:**
- Modify: `lumina/src/components/ui/icons.tsx` (+`IconUsers`), `lumina/src/messages/{en,ar}.json` (+`nav.users`, +`nav.account`), `lumina/src/components/ui/Sidebar.tsx` (avatar + account link), `lumina/src/app/(app)/layout.tsx` (conditional admin nav item + pass avatarUrl)

- [ ] **Step 1:** Add `IconUsers` to `icons.tsx` (people glyph, matches existing `Svg` wrapper). Export from `@/components/ui` barrel.
- [ ] **Step 2:** Add `"users": "Users"`/`"المستخدمون"` and `"account": "Account"`/`"حسابي"` to `nav` in both message files.
- [ ] **Step 3:** In `layout.tsx`, after `loadSession`, build items: base list + `...(s.role === 'ADMIN' ? [{ href:'/users', key:'users', icon:<IconUsers/> }] : [])`. Pass `avatarUrl` to Sidebar.
- [ ] **Step 4:** In `Sidebar.tsx`: add optional `avatarUrl?: string` prop; render an avatar (img or initials fallback) in the footer next to the name; make the name area a `<Link href="/account">` showing `nav.account`. Keep RTL + focus-ring.
- [ ] **Step 5: tsc + build + run existing Sidebar test** (update if it asserts exact footer). Commit `feat(nav): admin Users nav + account link + sidebar avatar`

---

## Task 10: `/users` list page

**Files:** Create `lumina/src/app/(app)/users/page.tsx`

- [ ] **Step 1:** RSC: `redirect('/login')` if `!loadSession()`; `notFound()`/redirect if not ADMIN (`can(role,'read','User')`). `const users = await listUsers()`. Render Breadcrumb + header (“المستخدمون” + “مستخدم جديد” link to `/users/new`) + `Table` (rows link to `/users/[id]`): name (+avatar), email, role `Badge`, status (نشط/معطّل) `Badge`, active sessions count, created date (`formatDateAr`). Empty state if none. `export const dynamic = 'force-dynamic'`.
- [ ] **Step 2: build + tsc.** Commit `feat(users): users list page`

---

## Task 11: `/users/new` create

**Files:** Create `users/new/page.tsx`, `users/new/NewUserForm.tsx`, `users/new/actions.ts`

- [ ] **Step 1:** `actions.ts` (`'use server'`) `addUser(prev, formData)` → validates email/name/password/role, calls `createUser`, returns `{ error, ok?, values? }` (mirror `addClient`); map `ValidationError('DUPLICATE_EMAIL')`→“البريد الإلكتروني مستخدم بالفعل.”, AuthzError→“ليس لديك صلاحية…”.
- [ ] **Step 2:** `NewUserForm.tsx` (`'use client'`) `useActionState` + Field/Input/Select(role)/password Input with show-toggle; on `ok` toast + `router.push('/users')` (track by state ref like NewClientForm).
- [ ] **Step 3:** `page.tsx` RSC ADMIN-gate + Breadcrumb + form.
- [ ] **Step 4: build + tsc.** Commit `feat(users): create user`

---

## Task 12: `/users/[id]` detail (profile/role/status/sessions)

**Files:** Create `users/[id]/page.tsx`, `_forms/EditUserForm.tsx`, `_forms/UserStatusActions.tsx`, `_forms/UserSessionsPanel.tsx`, `users/[id]/actions.ts`

- [ ] **Step 1:** `actions.ts`: `saveUser` (name/email/phone), `setRole`, `resetPassword`, `toggleDisabled`, `removeUser`, `setAvatar`/`removeAvatar`, `revokeUserSession(sid)`, `revokeAllSessions(userId)` — each returns `{error, ok?}` and `revalidatePath('/users/'+id)`; map guardrail errors to Arabic toasts (“لا يمكنك تعطيل حسابك”, “يجب الإبقاء على مدير واحد على الأقل”, etc.).
- [ ] **Step 2:** Forms (client, `useActionState`/`useQuickAdd`): EditUserForm (name/email/phone + role select), UserStatusActions (disable/enable button, reset-password Dialog, delete Dialog confirm, avatar upload/remove), UserSessionsPanel (Table of sessions + per-row Revoke + “إنهاء كل الجلسات”).
- [ ] **Step 3:** `page.tsx` RSC ADMIN-gate + `getUser(id)` + `listSessionsForUser(id)` + Breadcrumb + cards.
- [ ] **Step 4: build + tsc.** Commit `feat(users): user detail — edit, role, status, sessions`

---

## Task 13: `/account` self-service

**Files:** Create `account/page.tsx`, `account/_forms/ProfileForm.tsx`, `PasswordForm.tsx`, `MySessionsPanel.tsx`, `account/actions.ts`

- [ ] **Step 1:** `actions.ts`: `saveMyProfile` (name/phone/email), `changePassword` (current/new/confirm → `changeMyPassword`), `setMyAvatarAction`/`removeMyAvatarAction`, `revokeMyOtherSessionsAction`, `revokeMySessionAction(sid)` — each `{error, ok?}` + `revalidatePath('/account')`; map WRONG_PASSWORD/DUPLICATE_EMAIL to Arabic.
- [ ] **Step 2:** Forms (client): ProfileForm (name/phone/email + avatar upload/remove), PasswordForm (current/new/confirm; client-side confirm match), MySessionsPanel (list with current highlighted + “تسجيل الخروج من الأجهزة الأخرى”).
- [ ] **Step 3:** `page.tsx` RSC: any authenticated user; `getMyProfile()` + `listMySessions()` + Breadcrumb + cards.
- [ ] **Step 4: build + tsc.** Commit `feat(account): self-service profile, password, sessions`

---

## Task 14: Avatar storage + serving

**Files:** Create `lumina/src/lib/avatars.ts` (`saveAvatarFile(file): Promise<string>`), `lumina/src/app/(app)/avatars/[userId]/route.ts`; ensure `users.ts`/`account.ts` import `saveAvatarFile`.

- [ ] **Step 1:** `avatars.ts`: validate image extension (`.png/.jpg/.jpeg/.webp/.gif`) + size cap (e.g. ≤ 2 MB); UUID filename under `STORAGE_DIR`; path-traversal/realpath guard mirroring `uploadDocument`/document route; return the on-disk path.
- [ ] **Step 2:** `route.ts` `GET`: `loadSession()` → 401 if null (any authenticated user may view avatars); load `user.avatarPath` by `params.userId`; realpath-guard inside `STORAGE_ROOT`; stream with correct `Content-Type`; 404 if absent. Mirror `documents/[docId]/route.ts`.
- [ ] **Step 3:** Wire `setUserAvatar`/`setMyAvatar` to call `saveAvatarFile`. (Done in Tasks 5/7 if those imports were stubbed — implement here and confirm.)
- [ ] **Step 4: build + tsc.** Commit `feat(avatars): upload + authenticated serving`

---

## Task 15: e2e

**Files:** Create `lumina/tests/e2e/users.spec.ts`

- [ ] **Step 1:** Spec (admin logged in via existing `login` helper):
  1. Admin creates a user (unique email, role VIEWER, password) → appears in `/users`.
  2. New user logs in (new context/page) → reaches `/overview`.
  3. Admin opens the user, changes role to LEGAL → save shows success.
  4. Admin revokes the user's session → on the user's page, a protected navigation redirects to `/login`.
  5. Admin disables the user → user can no longer log in (stays on `/login`).
  6. Self-service: log in as a fresh user, go to `/account`, change own password, sign in again with the new password; revoke other sessions shows success.
- [ ] **Step 2:** Run `npm run e2e` (services already up). Fix until green.
- [ ] **Step 3: Commit** `test(e2e): user management + sessions + self-service`

---

## Finish

- [ ] Full gate: `npx tsc --noEmit` · `npm run lint` · `npm run test` · `npm run build` · `npm run e2e` — all green.
- [ ] Use superpowers:finishing-a-development-branch → push `feat/user-management`, open PR, let CI pass, merge.
