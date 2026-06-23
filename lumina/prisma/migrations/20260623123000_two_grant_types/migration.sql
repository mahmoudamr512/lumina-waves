-- Collapse GrantType to two values: SALE (بيع، استغلال) and DISTRIBUTION (توزيع).
-- Legacy values are remapped so this is safe regardless of existing data:
--   FULL_ASSIGNMENT -> SALE ; EXCLUSIVE_LICENSE / NON_EXCLUSIVE_LICENSE / MANAGEMENT -> DISTRIBUTION
CREATE TYPE "GrantType_new" AS ENUM ('SALE', 'DISTRIBUTION');

ALTER TABLE "MasterContract"
  ALTER COLUMN "grantType" TYPE "GrantType_new"
  USING (
    CASE "grantType"::text
      WHEN 'FULL_ASSIGNMENT' THEN 'SALE'
      ELSE 'DISTRIBUTION'
    END::"GrantType_new"
  );

DROP TYPE "GrantType";
ALTER TYPE "GrantType_new" RENAME TO "GrantType";
