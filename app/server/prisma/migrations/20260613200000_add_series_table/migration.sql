-- CreateTable
CREATE TABLE "series" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_key" TEXT NOT NULL,
    CONSTRAINT "series_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "series_user_id_name_key" ON "series"("user_id", "name");

-- AlterTable: add series_id FK to books (SQLite 3.35+ supports REFERENCES in ADD COLUMN)
ALTER TABLE "books" ADD COLUMN "series_id" TEXT REFERENCES "series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: create Series rows for all existing books with a non-empty series string
INSERT INTO "series" ("id", "user_id", "name", "sort_key")
SELECT lower(hex(randomblob(16))), "user_id", "series", "series"
FROM "books"
WHERE "series" != ''
GROUP BY "user_id", "series";

-- Update books.series_id to point to their series row
UPDATE "books"
SET "series_id" = (
    SELECT "id" FROM "series"
    WHERE "series"."user_id" = "books"."user_id"
      AND "series"."name" = "books"."series"
)
WHERE "series" != '';
