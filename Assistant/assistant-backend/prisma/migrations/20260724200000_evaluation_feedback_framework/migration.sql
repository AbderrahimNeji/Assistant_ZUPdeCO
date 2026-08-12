-- CreateEnum
CREATE TYPE "FeedbackRating" AS ENUM ('HELPFUL', 'NOT_HELPFUL');

-- CreateEnum
CREATE TYPE "EvaluationFlagType" AS ENUM ('REPEATED_TOOL_FAILURES', 'REPEATED_LOW_RATINGS', 'REPEATED_PLANNER_FALLBACKS', 'REPEATED_UNANSWERED');

-- CreateEnum
CREATE TYPE "EvaluationFlagStatus" AS ENUM ('OPEN', 'REVIEWED', 'RESOLVED');

-- CreateTable
CREATE TABLE "MessageFeedback" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" "FeedbackRating" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistantTurnMetric" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plannerMode" TEXT NOT NULL,
    "plannerConfidence" DOUBLE PRECISION,
    "knowledgeProviders" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "toolsExecuted" JSONB,
    "toolCount" INTEGER NOT NULL DEFAULT 0,
    "toolSuccessCount" INTEGER NOT NULL DEFAULT 0,
    "toolFailureCount" INTEGER NOT NULL DEFAULT 0,
    "responseLatencyMs" INTEGER,
    "retrievalLatencyMs" INTEGER,
    "generationLatencyMs" INTEGER,
    "toolLatencyMs" INTEGER,
    "sourceCount" INTEGER NOT NULL DEFAULT 0,
    "suggestionCount" INTEGER NOT NULL DEFAULT 0,
    "confirmationRequired" BOOLEAN NOT NULL DEFAULT false,
    "confirmationCompleted" BOOLEAN NOT NULL DEFAULT false,
    "usedRag" BOOLEAN NOT NULL DEFAULT false,
    "usedTools" BOOLEAN NOT NULL DEFAULT false,
    "isHybrid" BOOLEAN NOT NULL DEFAULT false,
    "isUnanswered" BOOLEAN NOT NULL DEFAULT false,
    "isPlannerFallback" BOOLEAN NOT NULL DEFAULT false,
    "suggestionClicked" BOOLEAN NOT NULL DEFAULT false,
    "toolActionFromUi" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssistantTurnMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "messageId" TEXT,
    "conversationId" TEXT,
    "userId" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvaluationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationFlag" (
    "id" TEXT NOT NULL,
    "type" "EvaluationFlagType" NOT NULL,
    "severity" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "metadata" JSONB,
    "status" "EvaluationFlagStatus" NOT NULL DEFAULT 'OPEN',
    "fingerprint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MessageFeedback_conversationId_createdAt_idx" ON "MessageFeedback"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "MessageFeedback_userId_createdAt_idx" ON "MessageFeedback"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "MessageFeedback_rating_createdAt_idx" ON "MessageFeedback"("rating", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MessageFeedback_messageId_userId_key" ON "MessageFeedback"("messageId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "AssistantTurnMetric_messageId_key" ON "AssistantTurnMetric"("messageId");

-- CreateIndex
CREATE INDEX "AssistantTurnMetric_createdAt_idx" ON "AssistantTurnMetric"("createdAt");

-- CreateIndex
CREATE INDEX "AssistantTurnMetric_userId_createdAt_idx" ON "AssistantTurnMetric"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AssistantTurnMetric_conversationId_idx" ON "AssistantTurnMetric"("conversationId");

-- CreateIndex
CREATE INDEX "AssistantTurnMetric_plannerMode_createdAt_idx" ON "AssistantTurnMetric"("plannerMode", "createdAt");

-- CreateIndex
CREATE INDEX "EvaluationEvent_type_createdAt_idx" ON "EvaluationEvent"("type", "createdAt");

-- CreateIndex
CREATE INDEX "EvaluationEvent_messageId_idx" ON "EvaluationEvent"("messageId");

-- CreateIndex
CREATE INDEX "EvaluationEvent_userId_createdAt_idx" ON "EvaluationEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "EvaluationEvent_conversationId_createdAt_idx" ON "EvaluationEvent"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationFlag_fingerprint_key" ON "EvaluationFlag"("fingerprint");

-- CreateIndex
CREATE INDEX "EvaluationFlag_status_type_idx" ON "EvaluationFlag"("status", "type");

-- CreateIndex
CREATE INDEX "EvaluationFlag_createdAt_idx" ON "EvaluationFlag"("createdAt");

-- AddForeignKey
ALTER TABLE "MessageFeedback" ADD CONSTRAINT "MessageFeedback_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageFeedback" ADD CONSTRAINT "MessageFeedback_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageFeedback" ADD CONSTRAINT "MessageFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantTurnMetric" ADD CONSTRAINT "AssistantTurnMetric_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantTurnMetric" ADD CONSTRAINT "AssistantTurnMetric_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantTurnMetric" ADD CONSTRAINT "AssistantTurnMetric_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationEvent" ADD CONSTRAINT "EvaluationEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
