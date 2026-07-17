-- Group related PDFs (contract + ekrar drafts, later their signed uploads)
-- under a shared bundleId. Legacy rows keep bundleId = NULL; the UI treats
-- those as unbundled loose documents. Indexed for the "show me the bundle"
-- lookups the UI will do when rendering a document row.
ALTER TABLE "Document" ADD COLUMN "bundleId" TEXT;
CREATE INDEX "Document_bundleId_idx" ON "Document" ("bundleId");
