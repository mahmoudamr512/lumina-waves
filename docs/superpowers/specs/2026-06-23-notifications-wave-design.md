# Notifications Wave + Contract Expiry — Design Spec

**Date:** 2026-06-23 · **Status:** Approved (build without further confirmation)

Expands notifications (push + in-app, email only when needed) and adds contract
expiry dates with a pre-expiry reminder cadence. Builds on the existing
`Notification` / `Watcher` / web-push and `queues.mail` → `sendMail` infra.

## Constraints
- Reuse `Notification`, `Watcher`, `sendPushToUser`, `queues.mail`/`sendMail`, the cron worker (`runDailyMaintenance`).
- All notification/email sends are **best-effort** (try/catch, never break the triggering mutation).
- Email no-ops cleanly while `SMTP_URL` is blank.
- Bilingual only for nav/ui; notification copy hardcoded Arabic (matches app).
- Node unit tests hit the real dev DB (unique ids per run); mock auth/session/push/mail as needed.

## 1. Data model
```prisma
model MasterContract { … expiresAt DateTime? }   // NEW: auto = signedDate + termMonths, editable
model ContractExpiryReminder {
  id String @id @default(cuid())
  contractId String
  milestone  Int      // days-before bucket: 90 | 30 | 7 | 0
  sentAt     DateTime @default(now())
  @@unique([contractId, milestone])
}
```

## 2. Core helpers (`src/services/notifications.ts`)
- `notify({ recipientIds, actorId?, type, entity, entityId, title, body, href })` — dedups recipients, drops `actorId`, `createMany` in-app rows + best-effort `sendPushToUser` each. `createForComment` refactored onto it.
- `notifyUser(userId, {...})` — single-recipient convenience.
- `listAdminIds()` / `listAdminLegalIds()` — active ADMIN (and LEGAL) user ids.
- `src/lib/notify-email.ts` → `queueEmail(to, subject, html)` — best-effort `queues.mail.add` (no-op-safe).

## 3. Push + in-app events
- **Watched-record activity** — `notifyRecordActivity({ entity, entityId, clientId, actorId, actorName, title, href })` → recipients = watchers(entity,entityId) ∪ watchers('Client', clientId) − actor. Hooked in: `createContract` (client watchers), `createAnnex` (contract+client), `createWork` (contract+client), `uploadDocument` (attached entity + client), `generateContractPdf` (contract+client).
- **Account & security** (to the target user) — `changeRole`, `setUserPassword`, `disableUser` (users.ts), and session revoke (sessions.ts): `notifyUser(targetId, …)`. type `ACCOUNT`.
- **Trash on your items** — on soft-delete, resolve creator via earliest `AuditLog{entity,entityId,action:'CREATE'}` → `notifyUser(creatorId, …)` if creator ≠ deleter. Helper `notifyCreatorOnDelete(entity, id, deleterId)` called from soft-delete paths (e.g. `deleteUser`, and any `deleteX`).
- **Admin signals** (to all admins) — `createUser` → "new user"; failed-login **spike** (≥5 `LOGIN_FAILED` for an email or IP within 10 min) → one alert per 10-min window (dedup via a recent COMMENT-style check on AuditLog or an in-memory/db guard). type `ADMIN`.

## 4. Email (only when needed; reuses mail queue)
- **To user:** admin password reset, account disabled.
- **To admins:** soft-delete alert (existing) retained.
- Implemented via `queueEmail`; dormant until `SMTP_URL` set.

## 5. Contract expiry + reminders
- `createContract`: set `expiresAt = signedDate + termMonths` when `signedDate` present (editable later). Contract detail page shows expiry + a relative countdown; the contract form gains an optional expiry override.
- **Cron** (`runDailyMaintenance` also calls `sendContractExpiryReminders()`):
  - For each non-deleted contract with `expiresAt`, compute `daysLeft`. For each milestone in `[90,30,7,0]` where `daysLeft <= milestone` AND no `ContractExpiryReminder(contractId, milestone)` exists yet → send to **watchers(contract) ∪ watchers(client) ∪ ADMIN ∪ LEGAL**: in-app + push + email; record the reminder row (idempotent).
  - Past-expiry (daysLeft<0) still fires the `0` milestone once.
- `sendContractExpiryReminders()` is a pure, unit-testable function (mocks notify/email/db).

## 6. Testing
- Unit: `notify` dedup/exclude-actor; expiry milestone selection + dedupe (no double-send); failed-login spike threshold; account/security notify on role-change/disable.
- e2e: contract detail shows an expiry date after creating a contract with a signed date.

## 7. Rollout
Spec → plan → TDD build → CI (image publish) → auto-deploy to prod. Email pieces inert until SMTP configured.

## 8. Out of scope
New-device-login email (declined), per-user notification preferences, digest batching.
