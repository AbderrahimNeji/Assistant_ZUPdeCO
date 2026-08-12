import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFonctionToEstablishmentContacts1730000000046
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // La colonne contacts est de type JSONB, donc pas besoin de migration SQL
    // Les données existantes resteront valides (fonction sera undefined/null)
    // Le backend et le frontend géreront le nouveau champ via les DTOs et types
    console.log('Migration: fonction field added to EstablishmentContact interface (JSONB column, no SQL change needed)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rien à faire, les anciennes données sans fonction restent valides
    console.log('Migration rollback: fonction field removed from EstablishmentContact interface (JSONB column, no SQL change needed)');
  }
}
