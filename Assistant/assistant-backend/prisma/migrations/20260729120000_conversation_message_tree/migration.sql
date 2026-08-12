-- Conversation tree: branching + active path

ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "activeBranchId" TEXT;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "activeLeafId" TEXT;

ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "parentMessageId" TEXT;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "branchId" TEXT;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

-- Backfill linear conversations into a single branch chain.
DO $$
DECLARE
  conv RECORD;
  msg RECORD;
  prev_id TEXT;
  branch TEXT;
  first_msg BOOLEAN;
BEGIN
  FOR conv IN SELECT id FROM "Conversation" LOOP
    branch := NULL;
    prev_id := NULL;
    first_msg := TRUE;

    FOR msg IN
      SELECT id FROM "Message"
      WHERE "conversationId" = conv.id
      ORDER BY "createdAt" ASC, id ASC
    LOOP
      IF first_msg THEN
        branch := msg.id;
        first_msg := FALSE;
      END IF;

      UPDATE "Message"
      SET
        "branchId" = COALESCE("branchId", branch),
        "parentMessageId" = COALESCE("parentMessageId", prev_id),
        "version" = COALESCE("version", 1)
      WHERE id = msg.id;

      prev_id := msg.id;
    END LOOP;

    IF prev_id IS NOT NULL THEN
      UPDATE "Conversation"
      SET
        "activeLeafId" = COALESCE("activeLeafId", prev_id),
        "activeBranchId" = COALESCE(
          "activeBranchId",
          (SELECT "branchId" FROM "Message" WHERE id = prev_id)
        )
      WHERE id = conv.id;
    END IF;
  END LOOP;
END $$;

-- Any remaining null branchIds (orphan safety)
UPDATE "Message"
SET "branchId" = id
WHERE "branchId" IS NULL;

ALTER TABLE "Message" ALTER COLUMN "branchId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "Message_conversationId_branchId_idx"
  ON "Message"("conversationId", "branchId");

CREATE INDEX IF NOT EXISTS "Message_parentMessageId_idx"
  ON "Message"("parentMessageId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Message_parentMessageId_fkey'
  ) THEN
    ALTER TABLE "Message"
      ADD CONSTRAINT "Message_parentMessageId_fkey"
      FOREIGN KEY ("parentMessageId") REFERENCES "Message"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
