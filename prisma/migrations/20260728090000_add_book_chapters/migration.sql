-- Make legacy single-file media optional so books can be chapter-based only
ALTER TABLE "books" ALTER COLUMN "mediaStorageKey" DROP NOT NULL;

-- Add chapter-level playback position
ALTER TABLE "playback_sessions"
ADD COLUMN "chapterOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "chapterProgressSec" INTEGER NOT NULL DEFAULT 0;

-- Store chapter files for each book
CREATE TABLE "book_chapters" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "chapterOrder" INTEGER NOT NULL,
    "mediaStorageKey" TEXT NOT NULL,
    "durationSec" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_chapters_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "book_chapters_bookId_idx" ON "book_chapters"("bookId");
CREATE UNIQUE INDEX "book_chapters_bookId_chapterOrder_key" ON "book_chapters"("bookId", "chapterOrder");

ALTER TABLE "book_chapters"
ADD CONSTRAINT "book_chapters_bookId_fkey"
FOREIGN KEY ("bookId") REFERENCES "books"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
