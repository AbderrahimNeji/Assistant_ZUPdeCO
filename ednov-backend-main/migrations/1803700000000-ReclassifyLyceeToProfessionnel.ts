import { readFileSync } from 'fs';
import { join } from 'path';
import { MigrationInterface, QueryRunner } from 'typeorm';

const BATCH_SIZE = 500;
const UAI_CODES_FILE = 'reclassify-lycee-to-professionnel-uai-codes.json';

function loadProfessionnelUaiCodes(): string[] {
  const file = join(__dirname, 'data', UAI_CODES_FILE);
  return JSON.parse(readFileSync(file, 'utf8')) as string[];
}

/**
 * Reclasse 2 441 établissements lycée professionnel : type lycee → professionnel.
 * Source : migrations/data/lycees-establishments-classified.json (généré par classify-lycees-establishments.ts).
 */
export class ReclassifyLyceeToProfessionnel1803700000000 implements MigrationInterface {
  name = 'ReclassifyLyceeToProfessionnel1803700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const uaiCodes = loadProfessionnelUaiCodes();
    for (let i = 0; i < uaiCodes.length; i += BATCH_SIZE) {
      const batch = uaiCodes.slice(i, i + BATCH_SIZE);
      await queryRunner.query(
        `
        UPDATE establishments
        SET type = 'professionnel', updated_at = NOW()
        WHERE uai_code = ANY($1::text[])
          AND type = 'lycee'
          AND deleted_at IS NULL
        `,
        [batch],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const uaiCodes = loadProfessionnelUaiCodes();
    for (let i = 0; i < uaiCodes.length; i += BATCH_SIZE) {
      const batch = uaiCodes.slice(i, i + BATCH_SIZE);
      await queryRunner.query(
        `
        UPDATE establishments
        SET type = 'lycee', updated_at = NOW()
        WHERE uai_code = ANY($1::text[])
          AND type = 'professionnel'
          AND deleted_at IS NULL
        `,
        [batch],
      );
    }
  }
}
