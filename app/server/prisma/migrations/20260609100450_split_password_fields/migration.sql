/*
  Warnings:

  - You are about to drop the column `key` on the `users` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "username" TEXT NOT NULL PRIMARY KEY,
    "password_hash" TEXT,
    "sync_password" TEXT
);
INSERT INTO "new_users" ("username") SELECT "username" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
