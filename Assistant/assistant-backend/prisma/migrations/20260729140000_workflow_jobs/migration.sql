-- Background workflow jobs

CREATE TYPE "WorkflowJobStatus" AS ENUM (
  'QUEUED',
  'RUNNING',
  'WAITING_CONFIRMATION',
  'COMPLETED',
  'FAILED',
  'CANCELLED'
);

CREATE TABLE "WorkflowJob" (
  "id" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "workflowName" TEXT,
  "message" TEXT NOT NULL,
  "status" "WorkflowJobStatus" NOT NULL DEFAULT 'QUEUED',
  "progress" JSONB,
  "currentStep" TEXT,
  "error" TEXT,
  "resultAnswer" TEXT,
  "confirmationId" TEXT,
  "resultMessageId" TEXT,
  "executionTraceId" TEXT,
  "executionMode" TEXT NOT NULL DEFAULT 'background',
  "queueTimeMs" INTEGER,
  "resumeCount" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "conversationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WorkflowJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WorkflowJob_userId_status_idx" ON "WorkflowJob"("userId", "status");
CREATE INDEX "WorkflowJob_conversationId_status_idx" ON "WorkflowJob"("conversationId", "status");
CREATE INDEX "WorkflowJob_status_queuedAt_idx" ON "WorkflowJob"("status", "queuedAt");
CREATE INDEX "WorkflowJob_confirmationId_idx" ON "WorkflowJob"("confirmationId");

ALTER TABLE "WorkflowJob"
  ADD CONSTRAINT "WorkflowJob_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkflowJob"
  ADD CONSTRAINT "WorkflowJob_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
