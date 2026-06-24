-- Territory list is now Egypt or Worldwide only. Remap any legacy 'MENA' rows
-- to 'WORLDWIDE' so the app's territory whitelist doesn't reject them on read.
-- Safe / idempotent on an empty database (no rows matched -> no-op).
UPDATE "MasterContract" SET "territory" = 'WORLDWIDE' WHERE "territory" = 'MENA';
