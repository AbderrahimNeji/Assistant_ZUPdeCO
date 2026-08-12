import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Create session_ai_chat_messages table for persistent session AI chat history.
 */
export class SessionAiChatMessages1730000000026 implements MigrationInterface {
  name = 'SessionAiChatMessages1730000000026';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE session_ai_chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
        company_id UUID NOT NULL,
        role VARCHAR(20) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_session_ai_chat_messages_session_created ON session_ai_chat_messages (session_id, created_at)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS session_ai_chat_messages`);
  }
}
