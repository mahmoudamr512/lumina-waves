-- A SALE (بيع وتنازل) contract is a perpetual buyout with no contract length /
-- no expiry. Make termMonths nullable so SALE contracts can store null.
-- DISTRIBUTION contracts continue to set it.
ALTER TABLE "MasterContract" ALTER COLUMN "termMonths" DROP NOT NULL;
