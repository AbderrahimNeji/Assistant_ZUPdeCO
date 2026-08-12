import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Replaces flat rating/comment/feeling on session_reports with JSONB author_feedbacks.
 */
export class SessionReportAuthorFeedbacks1803800000000 implements MigrationInterface {
  name = 'SessionReportAuthorFeedbacks1803800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE session_reports
      ADD COLUMN IF NOT EXISTS author_feedbacks jsonb NOT NULL DEFAULT '[]'::jsonb
    `);

    await queryRunner.query(`
      UPDATE session_reports sr
      SET author_feedbacks = COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'idAuteur', sp.user_id,
              'rating', CASE WHEN sp.user_id = sr.author_id THEN sr.rating ELSE NULL END,
              'comment', CASE WHEN sp.user_id = sr.author_id THEN sr.comment ELSE NULL END,
              'feeling', CASE WHEN sp.user_id = sr.author_id THEN sr.feeling ELSE NULL END
            )
            ORDER BY CASE sp.role WHEN 'tutor' THEN 0 WHEN 'volunteer' THEN 1 ELSE 2 END, sp.user_id
          )
          FROM session_participants sp
          WHERE sp.session_id = sr.session_id AND sp.role <> 'student'
        ),
        '[]'::jsonb
      )
      FROM sessions s
      WHERE s.id = sr.session_id AND s.type = 'whole_class'
    `);

    await queryRunner.query(`
      UPDATE session_reports sr
      SET author_feedbacks = jsonb_build_array(
        jsonb_build_object(
          'idAuteur', COALESCE(
            (SELECT sp.user_id FROM session_participants sp
             WHERE sp.session_id = sr.session_id AND sp.role <> 'student'
             ORDER BY CASE sp.role WHEN 'tutor' THEN 0 WHEN 'volunteer' THEN 1 ELSE 2 END, sp.user_id
             LIMIT 1),
            sr.author_id,
            s.managed_by,
            s.created_by
          ),
          'rating', sr.rating,
          'comment', sr.comment,
          'feeling', sr.feeling
        )
      )
      FROM sessions s
      WHERE s.id = sr.session_id AND s.type <> 'whole_class'
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_session_reports_author_feedbacks_gin
      ON session_reports USING gin (author_feedbacks)
    `);

    await queryRunner.query(`ALTER TABLE session_reports DROP COLUMN IF EXISTS rating`);
    await queryRunner.query(`ALTER TABLE session_reports DROP COLUMN IF EXISTS comment`);
    await queryRunner.query(`ALTER TABLE session_reports DROP COLUMN IF EXISTS feeling`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE session_reports
      ADD COLUMN IF NOT EXISTS rating smallint,
      ADD COLUMN IF NOT EXISTS comment text,
      ADD COLUMN IF NOT EXISTS feeling varchar(32)
    `);

    await queryRunner.query(`
      UPDATE session_reports sr
      SET
        rating = (elem->>'rating')::smallint,
        comment = elem->>'comment',
        feeling = elem->>'feeling'
      FROM LATERAL (
        SELECT elem
        FROM jsonb_array_elements(sr.author_feedbacks) elem
        WHERE (elem->>'idAuteur')::uuid = sr.author_id
        LIMIT 1
      ) picked
      WHERE picked.elem IS NOT NULL
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS idx_session_reports_author_feedbacks_gin`);
    await queryRunner.query(`ALTER TABLE session_reports DROP COLUMN IF EXISTS author_feedbacks`);
  }
}
