import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

/**
 * Append-only base: id (uuid) + created_at only.
 * Use for immutable audit/event tables: AuditLog, BrandingHistory, OutboxEvent, SessionParticipant.
 */
export abstract class CreateOnlyBaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}

/**
 * Base entity: id (uuid), created_at, updated_at.
 * Column names match SQL schema (snake_case). Use for tables without soft delete.
 */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}

/**
 * Soft-deletable base: adds deleted_at for logical delete.
 * Use for companies, establishments, rooms, users, roles, profiles, programs, levels, subjects, holidays, sessions, themes, media_assets, email_templates, document_templates.
 */
export abstract class SoftDeleteBaseEntity extends BaseEntity {
  @DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at' })
  deletedAt: Date | null;
}
