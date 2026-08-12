-- AlterTable
ALTER TABLE "BenchmarkResult"
ADD COLUMN "failureReason" TEXT,
ADD COLUMN "retrievedContext" TEXT;
