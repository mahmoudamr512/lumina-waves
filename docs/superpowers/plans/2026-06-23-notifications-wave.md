# Notifications Wave + Contract Expiry — Plan

> Execute with superpowers:executing-plans. TDD where logic is non-trivial; best-effort sends never break mutations.

**Tasks (each ends green: tsc + relevant tests; commit):**

1. **Schema** — `MasterContract.expiresAt`, `ContractExpiryReminder(contractId,milestone,sentAt @@unique)`. `migrate dev` + generate.
2. **Core helpers** — `notify()`, `notifyUser()`, `listAdminIds()`, `listAdminLegalIds()` in `notifications.ts`; refactor `createForComment` onto `notify()`. `src/lib/notify-email.ts` `queueEmail()`. Unit: `notify` dedups + excludes actor.
3. **Watched-record activity** — `notifyRecordActivity()` in notifications.ts; hook `createContract`/`createAnnex`/`createWork` (contracts.ts/annexes.ts/works.ts), `uploadDocument`/`generateContractPdf` (documents.ts). Each best-effort, resolves clientId + actorName.
4. **Account & security** — in `users.ts` (`changeRole`,`setUserPassword`,`disableUser`) + `sessions.ts` revoke: `notifyUser(target,…)`; email via `queueEmail` for password-reset + disabled. Unit: role-change notifies target.
5. **Trash** — `notifyCreatorOnDelete(entity,id,deleterId)` (creator via AuditLog CREATE) in notifications.ts; call from `deleteUser` (and any deleteX). Unit: notifies creator, not deleter.
6. **Admin signals** — `createUser` → notify admins; failed-login spike in `auth.ts` LOGIN_FAILED path (≥5/10min by email or ip; dedup via AuditLog count of a marker). Unit: spike threshold.
7. **Contract expiry create + UI** — set `expiresAt` in `createContract`; contract detail shows expiry + `timeAgoAr`-style countdown; contract form optional override + action.
8. **Expiry cron** — `sendContractExpiryReminders()` (pure) in a new `src/services/contract-expiry.ts`; wire into `runDailyMaintenance`. Unit: milestone selection + dedupe.
9. **e2e + finish** — e2e: contract shows expiry date; full gate; PR → CI → merge → auto-deploy.
