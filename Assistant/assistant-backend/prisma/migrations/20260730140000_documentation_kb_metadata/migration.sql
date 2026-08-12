-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('USER_UPLOAD', 'FUNCTIONAL_DOCUMENTATION');

-- AlterTable Document
ALTER TABLE "Document" ADD COLUMN "kind" "DocumentKind" NOT NULL DEFAULT 'USER_UPLOAD';
ALTER TABLE "Document" ADD COLUMN "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Document_slug_key" ON "Document"("slug");
CREATE INDEX "Document_kind_status_idx" ON "Document"("kind", "status");

-- AlterTable DocumentChunk
ALTER TABLE "DocumentChunk" ADD COLUMN "chapter" TEXT;
ALTER TABLE "DocumentChunk" ADD COLUMN "section" TEXT;
ALTER TABLE "DocumentChunk" ADD COLUMN "title" TEXT;
ALTER TABLE "DocumentChunk" ADD COLUMN "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "DocumentChunk_documentId_chunkIndex_idx" ON "DocumentChunk"("documentId", "chunkIndex");
