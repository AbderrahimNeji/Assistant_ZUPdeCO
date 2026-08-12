-- AlterTable
ALTER TABLE "BenchmarkRun" ADD COLUMN "userId" TEXT;

-- AddForeignKey
ALTER TABLE "BenchmarkRun" ADD CONSTRAINT "BenchmarkRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "BenchmarkRun_userId_idx" ON "BenchmarkRun"("userId");
