-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PROCESSING', 'INDEXED', 'FAILED');

-- AlterTable
ALTER TABLE "Document"
ADD COLUMN "status" "DocumentStatus" NOT NULL DEFAULT 'INDEXED',
ADD COLUMN "errorMessage" TEXT,
ADD COLUMN "pageCount" INTEGER,
ADD COLUMN "rawText" TEXT,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- New uploads default to PROCESSING via Prisma; existing rows stay INDEXED.
ALTER TABLE "Document" ALTER COLUMN "status" SET DEFAULT 'PROCESSING';
