# QA: Delete a single annex

Feature: an ADMIN can delete one annex from a contract (move to trash, or delete permanently) without deleting the contract. The annex's works and documents are deleted with it.

## Fixtures

| File | Content |
|------|---------|
| `annex-1-works.csv` | 2 works: `QA Annex1 Song A`, `QA Annex1 Song B` (performer `QA Singer One`) |
| `annex-2-works.csv` | 2 works: `QA Annex2 Song C`, `QA Annex2 Song D` (performer `QA Singer Two`) |

Both use the standard import layout: row 1 = headers, column 1 = performer, column 2 = title.

## Setup

1. Log in as an **ADMIN** user.
2. Create a client (e.g. legal name `QA Annex Delete`) and a contract for it, or open any test contract.
3. On `/contracts/<id>`, click **إضافة ملحق**, attach `annex-1-works.csv`, and save. This gives **ملحق رقم 1** with Song A and Song B.
4. Repeat with `annex-2-works.csv`. This gives **ملحق رقم 2** with Song C and Song D.
5. On annex 2, click **إنشاء مسودة PDF**, choose **الملحق فقط**, and generate, so the annex has at least one document.

## Test cases

### TC1: Button visibility
- As ADMIN: each annex card header shows **حذف الملحق**.
- Log in as LEGAL, OPERATIONS, FINANCE or VIEWER and open the same contract. **حذف الملحق** is not shown.

### TC2: Move to trash (soft delete)
1. On **ملحق رقم 2**, click **حذف الملحق**. The dialog title reads «حذف الملحق رقم 2».
2. Click **نقل إلى المحذوفات**.
3. Expect:
   - The dialog closes and the toast «تم نقل الملحق إلى المحذوفات» appears.
   - You stay on the contract page.
   - Annex 2's card is gone. Annex 1 and its works are unchanged.
   - The contract header, details and contract-level documents are unchanged.
   - `/works`: Song C and Song D are gone. Song A and Song B are still listed.
   - `/documents`: annex 2's generated PDF is gone.
   - `/search` for `QA Annex2`: no results.

### TC3: Numbering after delete
1. After TC2, click **إضافة ملحق** again (with or without a CSV).
2. Expect the new annex to be **ملحق رقم 3**, not 2, and no error.
   (Before this change, this step failed with a unique-constraint error.)

### TC4: Permanent delete
1. On **ملحق رقم 3** (or annex 1), click **حذف الملحق**, then **حذف نهائي**.
2. Expect the toast «تم حذف الملحق نهائيًا» and the card to disappear. The contract and the other annexes are unchanged.

### TC5: Delete the last remaining annex
1. Delete every annex on the contract.
2. Expect the empty state «لا توجد ملاحق بعد». The contract still exists and **إضافة ملحق** still works. The next number continues from the highest number used so far.

### TC6: Data check (optional, DB)
There is no trash page in the UI yet. Check rows directly, for example with `npx prisma studio` or psql:

```sql
SELECT id, number, "deletedAt", "purgeAfter", "purgedAt" FROM "Annex" WHERE "contractId" = '<contract id>' ORDER BY number;
SELECT title, "deletedAt", "purgedAt" FROM "Work" WHERE title LIKE 'QA Annex%';
```

- Soft-deleted annex: `deletedAt` set, `purgeAfter` about 3 days later, `purgedAt` null. Its works and documents have the same `deletedAt`.
- Hard-deleted annex: `purgedAt` is also set on the annex, its works and its documents.
- The contract row: `deletedAt` stays null.

### TC7: Audit
Open `/activity` (or the contract's history panel). Expect a **DELETE** entry for entity `Annex` by the admin user.

## Known limits (not bugs)
- Restoring a soft-deleted annex through the trash service brings back the annex row only, not its works and documents. Client restore works the same way.
- The client page's Contracts tab has no delete button. It only shows annex and work counts.
