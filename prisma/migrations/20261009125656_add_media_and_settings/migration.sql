-- CreateTable
CREATE TABLE "SiteSetting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "defaultSeoTitle" TEXT NOT NULL DEFAULT 'Aurora',
    "defaultDescription" TEXT NOT NULL DEFAULT '',
    "footerNote" TEXT NOT NULL DEFAULT '{"zh":"","en":""}',
    "contactEmail" TEXT NOT NULL DEFAULT '',
    "socials" TEXT NOT NULL DEFAULT '[]'
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Work" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "cover" TEXT NOT NULL,
    "coverRatio" REAL NOT NULL,
    "tags" TEXT NOT NULL,
    "tagKeys" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "duration" TEXT,
    "dominantColor" TEXT,
    "gallery" TEXT NOT NULL DEFAULT '[]',
    "video" TEXT
);
INSERT INTO "new_Work" ("cover", "coverRatio", "createdAt", "dominantColor", "duration", "featured", "id", "order", "slug", "summary", "tagKeys", "tags", "title", "type") SELECT "cover", "coverRatio", "createdAt", "dominantColor", "duration", "featured", "id", "order", "slug", "summary", "tagKeys", "tags", "title", "type" FROM "Work";
DROP TABLE "Work";
ALTER TABLE "new_Work" RENAME TO "Work";
CREATE UNIQUE INDEX "Work_slug_key" ON "Work"("slug");
CREATE INDEX "Work_order_idx" ON "Work"("order");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
