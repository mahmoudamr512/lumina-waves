-- Preserve user's Excel column headers on the annex/contract so the PDF renders
-- them verbatim in the works table. Also classify each generated document so
-- the UI can filter «all tafweeds» / «all annex drafts» / etc.

ALTER TABLE "Annex"          ADD COLUMN "worksHeaders" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "MasterContract" ADD COLUMN "worksHeaders" TEXT[] NOT NULL DEFAULT '{}';

CREATE TYPE "DocumentVariant" AS ENUM (
  'CONTRACT_DRAFT',
  'ANNEX_DRAFT',
  'TAFWEED',
  'ANNEX_AND_TAFWEED',
  'UPLOAD'
);

ALTER TABLE "Document" ADD COLUMN "variant" "DocumentVariant";

-- Backfill variant from the filename convention so existing docs work with
-- the new filter UI. Anything that doesn't match a known pattern stays null.
UPDATE "Document" SET "variant" = 'CONTRACT_DRAFT'    WHERE "filename" LIKE 'contract-%-draft.pdf';
UPDATE "Document" SET "variant" = 'ANNEX_AND_TAFWEED' WHERE "filename" LIKE 'annex-%-annex-and-tafweed.pdf';
UPDATE "Document" SET "variant" = 'TAFWEED'           WHERE "filename" LIKE 'annex-%-tafweed.pdf';
UPDATE "Document" SET "variant" = 'ANNEX_DRAFT'       WHERE "filename" LIKE 'annex-%-draft.pdf';
