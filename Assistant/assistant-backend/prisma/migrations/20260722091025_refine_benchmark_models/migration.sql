-- DropForeignKey
ALTER TABLE "public"."BenchmarkResult" DROP CONSTRAINT "BenchmarkResult_benchmarkRunId_fkey";

-- AddForeignKey
ALTER TABLE "BenchmarkResult" ADD CONSTRAINT "BenchmarkResult_benchmarkRunId_fkey" FOREIGN KEY ("benchmarkRunId") REFERENCES "BenchmarkRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
