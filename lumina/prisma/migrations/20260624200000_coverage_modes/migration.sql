-- Replace the free-form coverage[] with a 3-mode enum + exclusions list.
-- Prod has 0 contracts; any legacy rows default to RBT_AND_DIGITAL (= widest
-- coverage, matching what the old checkbox list combined). Existing coverage
-- JSON is dropped after the new columns are added.

CREATE TYPE "CoverageMode" AS ENUM ('RBT_ONLY', 'DIGITAL_ONLY', 'RBT_AND_DIGITAL');

ALTER TABLE "MasterContract"
  ADD COLUMN "coverageMode" "CoverageMode" NOT NULL DEFAULT 'RBT_AND_DIGITAL',
  ADD COLUMN "coverageExclusions" TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE "MasterContract" DROP COLUMN IF EXISTS "coverage";
