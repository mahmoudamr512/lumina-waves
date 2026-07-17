-- Preserve the raw Excel grid on the annex/contract so PDFs render arbitrary
-- columns (not just performer/title). Shape: { headers: string[], rows: string[][] }.
ALTER TABLE "Annex"          ADD COLUMN "worksTable" JSONB;
ALTER TABLE "MasterContract" ADD COLUMN "worksTable" JSONB;
