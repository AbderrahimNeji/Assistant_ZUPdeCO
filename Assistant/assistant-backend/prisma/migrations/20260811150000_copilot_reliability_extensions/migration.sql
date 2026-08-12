-- Copilot reliability / transparency extensions
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "contentHash" TEXT;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "version" TEXT;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "ingestedAt" TIMESTAMP(3);

ALTER TABLE "MessageFeedback" ADD COLUMN IF NOT EXISTS "categories" TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE TABLE IF NOT EXISTS "EvaluationQaRun" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dataset" TEXT NOT NULL DEFAULT 'default',
    "mode" TEXT NOT NULL DEFAULT 'hybrid',
    "status" TEXT NOT NULL DEFAULT 'completed',
    "summary" JSONB,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationQaRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EvaluationQaCase" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "expectedAnswer" TEXT,
    "actualAnswer" TEXT,
    "sources" JSONB,
    "scores" JSONB,
    "latencyMs" INTEGER,
    "passed" BOOLEAN,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvaluationQaCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SecurityAuditEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "userId" TEXT,
    "companyId" TEXT,
    "skillId" TEXT,
    "toolId" TEXT,
    "requestId" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EvaluationQaRun_dataset_createdAt_idx" ON "EvaluationQaRun"("dataset", "createdAt");
CREATE INDEX IF NOT EXISTS "EvaluationQaRun_mode_createdAt_idx" ON "EvaluationQaRun"("mode", "createdAt");
CREATE INDEX IF NOT EXISTS "EvaluationQaCase_runId_idx" ON "EvaluationQaCase"("runId");
CREATE INDEX IF NOT EXISTS "SecurityAuditEvent_type_createdAt_idx" ON "SecurityAuditEvent"("type", "createdAt");
CREATE INDEX IF NOT EXISTS "SecurityAuditEvent_userId_createdAt_idx" ON "SecurityAuditEvent"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "SecurityAuditEvent_skillId_createdAt_idx" ON "SecurityAuditEvent"("skillId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "EvaluationQaCase"
    ADD CONSTRAINT "EvaluationQaCase_runId_fkey"
    FOREIGN KEY ("runId") REFERENCES "EvaluationQaRun"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
