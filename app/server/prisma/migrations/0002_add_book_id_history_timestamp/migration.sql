-- Recreate book_id_history with a timestamp column.
-- SQLite ADD COLUMN only accepts constant literals for NOT NULL defaults,
-- so we recreate the table. Existing rows are backfilled with the migration
-- run time (best available approximation).
CREATE TABLE "book_id_history_new" (
    "old_id"     TEXT NOT NULL PRIMARY KEY,
    "current_id" TEXT NOT NULL,
    "timestamp"  REAL NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

INSERT INTO "book_id_history_new" ("old_id", "current_id", "timestamp")
SELECT "old_id", "current_id", (strftime('%s', 'now') * 1000)
FROM "book_id_history";

DROP TABLE "book_id_history";

ALTER TABLE "book_id_history_new" RENAME TO "book_id_history";
