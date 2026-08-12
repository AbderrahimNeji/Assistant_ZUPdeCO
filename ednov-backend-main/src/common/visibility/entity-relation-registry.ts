/**
 * Static registry mapping relation names to:
 *  - How to retrieve the user's values for that relation (SQL userSide query)
 *  - How to filter each entity type based on those values (entitySides conditions)
 *
 * Relation names match the `relations[]` array in the visibility_scope JSONB column.
 *
 * Strategy for tables without a direct FK column (session_reports, assignments,
 * session_participants, session_student_tutor_pairs):
 *   → We use JOIN descriptors in entitySides rather than denormalized columns.
 *   → Join aliases must be unique per relation to avoid conflicts when multiple
 *     relations are applied simultaneously (suffix with relation key).
 */

export interface EntitySideDescriptor {
  /** Optional JOIN clause to add before applying the condition. */
  join?: { table: string; alias: string; on: string };
  /**
   * WHERE condition to apply. Placeholders:
   *  - `:...vsValues` for the list of user-side values (IN operator)
   *  - `:vsUserId`    for the user's own ID (direct equality)
   */
  condition: string;
}

export interface RelationDescriptor {
  label: string;
  /**
   * Raw SQL to retrieve user-side values.
   * Must SELECT a single column aliased as `value`.
   * Available bindings: :userId, :companyId
   */
  userSideQuery: string;
  /** Per-entity-type filter descriptors. Key = entityType string. */
  entitySides: Record<string, EntitySideDescriptor>;
}

export const ENTITY_RELATION_REGISTRY: Record<string, RelationDescriptor> = {
  // ─── establishment ────────────────────────────────────────────────────────
  establishment: {
    label: 'Établissement',
    userSideQuery: `
      SELECT ue.establishment_id AS value
      FROM user_establishments ue
      WHERE ue.user_id = :userId
    `,
    entitySides: {
      sessions: {
        condition: 'session.establishment_id IN (:...vsValues)',
      },
      users: {
        join: {
          table: 'user_establishments',
          alias: 'vs_estab_ue',
          on: 'vs_estab_ue.user_id = "user".id',
        },
        condition: 'vs_estab_ue.establishment_id IN (:...vsValues)',
      },
      establishments: {
        condition: 'establishment.id IN (:...vsValues)',
      },
      reports: {
        // session_reports has no direct establishment_id → join through sessions
        join: {
          table: 'sessions',
          alias: 'vs_estab_rpt_s',
          on: 'vs_estab_rpt_s.id = report.session_id',
        },
        condition: 'vs_estab_rpt_s.establishment_id IN (:...vsValues)',
      },
      vscReports: {
        // vsc_reports has no direct establishment_id → join through sessions
        join: {
          table: 'sessions',
          alias: 'vs_estab_vr_s',
          on: 'vs_estab_vr_s.id = vsc_report.session_id',
        },
        condition: 'vs_estab_vr_s.establishment_id IN (:...vsValues)',
      },
      vscDailyReports: {
        // vsc_daily_reports has a direct establishment_id column
        condition: 'r.establishment_id IN (:...vsValues)',
      },
      assignments: {
        join: {
          table: 'sessions',
          alias: 'vs_estab_asgn_s',
          on: 'vs_estab_asgn_s.id = assignment.session_id',
        },
        condition: 'vs_estab_asgn_s.establishment_id IN (:...vsValues)',
      },
      pairs: {
        join: {
          table: 'sessions',
          alias: 'vs_estab_pair_s',
          on: 'vs_estab_pair_s.id = pair.session_id',
        },
        condition: 'vs_estab_pair_s.establishment_id IN (:...vsValues)',
      },
      sessionParticipants: {
        join: {
          table: 'sessions',
          alias: 'vs_estab_sp_s',
          on: 'vs_estab_sp_s.id = session_participant.session_id',
        },
        condition: 'vs_estab_sp_s.establishment_id IN (:...vsValues)',
      },
      programs: {
        // program visible si au moins une session de ce programme est dans l'établissement
        join: {
          table: 'sessions',
          alias: 'vs_estab_prog_s',
          on: 'vs_estab_prog_s.program_id = program.id',
        },
        condition: 'vs_estab_prog_s.establishment_id IN (:...vsValues)',
      },
      levels: {
        // levels: scope via company uniquement (pas de relation directe establishment)
        condition: 'level.company_id = :companyId',
      },
      subjects: {
        // subjects: scope via company uniquement (pas de relation directe establishment)
        condition: 'subject.company_id = :companyId',
      },
      holidays: {
        // holidays: scope via company uniquement (peut avoir vacation_zone_id lié à company)
        condition: 'holiday.company_id = :companyId',
      },
      schoolYears: {
        // schoolYears: scope via company uniquement (pas de relation directe establishment)
        condition: 'schoolYear.company_id = :companyId',
      },
      activities: {
        // activities: scope via company uniquement (pas de relation directe establishment)
        condition: 'activity.company_id = :companyId',
      },
      activityTypes: {
        // activityTypes: scope via company uniquement (pas de relation directe establishment)
        condition: 'activityType.company_id = :companyId',
      },
      specialties: {
        // specialties: scope via company uniquement (pas de relation directe establishment)
        condition: 'specialty.company_id = :companyId',
      },
    },
  },

  // ─── managedBy ───────────────────────────────────────────────────────────
  managedBy: {
    label: 'Responsable (managedBy)',
    // The "user-side value" for managedBy is the current user's own ID.
    // We don't query a table — the resolver uses :userId directly.
    userSideQuery: `SELECT :userId AS value`,
    entitySides: {
      sessions: {
        condition: 'session.managed_by = :vsUserId',
      },
      users: {
        condition: '"user".managed_by_id = :vsUserId',
      },
      reports: {
        join: {
          table: 'sessions',
          alias: 'vs_mb_rpt_s',
          on: 'vs_mb_rpt_s.id = report.session_id',
        },
        condition: 'vs_mb_rpt_s.managed_by = :vsUserId',
      },
      // Academic modules: no managed_by relation → always deny access
      levels: {
        condition: '1 = 0',
      },
      subjects: {
        condition: '1 = 0',
      },
      holidays: {
        condition: '1 = 0',
      },
      schoolYears: {
        condition: '1 = 0',
      },
      activities: {
        condition: '1 = 0',
      },
      activityTypes: {
        condition: '1 = 0',
      },
      specialties: {
        condition: '1 = 0',
      },
      programs: {
        condition: '1 = 0',
      },
      vscReports: {
        join: {
          table: 'sessions',
          alias: 'vs_mb_vr_s',
          on: 'vs_mb_vr_s.id = vsc_report.session_id',
        },
        condition: 'vs_mb_vr_s.managed_by = :vsUserId',
      },
      vscDailyReports: {
        // vsc_daily_reports doesn't have session_id, managed_by not applicable via direct session
        // Could use establishment.managed_by_id if needed, but typically not used
        condition: '1 = 0', // block access for now
      },
      assignments: {
        join: {
          table: 'sessions',
          alias: 'vs_mb_asgn_s',
          on: 'vs_mb_asgn_s.id = assignment.session_id',
        },
        condition: 'vs_mb_asgn_s.managed_by = :vsUserId',
      },
      pairs: {
        join: {
          table: 'sessions',
          alias: 'vs_mb_pair_s',
          on: 'vs_mb_pair_s.id = pair.session_id',
        },
        condition: 'vs_mb_pair_s.managed_by = :vsUserId',
      },
      sessionParticipants: {
        join: {
          table: 'sessions',
          alias: 'vs_mb_sp_s',
          on: 'vs_mb_sp_s.id = session_participant.session_id',
        },
        condition: 'vs_mb_sp_s.managed_by = :vsUserId',
      },
    },
  },

  // ─── program ─────────────────────────────────────────────────────────────
  program: {
    label: 'Programme',
    userSideQuery: `
      SELECT DISTINCT s.program_id AS value
      FROM session_participants sp
      JOIN sessions s ON s.id = sp.session_id
      WHERE sp.user_id = :userId
        AND s.program_id IS NOT NULL
    `,
    entitySides: {
      sessions: {
        condition: 'session.program_id IN (:...vsValues)',
      },
      reports: {
        join: {
          table: 'sessions',
          alias: 'vs_prg_rpt_s',
          on: 'vs_prg_rpt_s.id = report.session_id',
        },
        condition: 'vs_prg_rpt_s.program_id IN (:...vsValues)',
      },
      vscReports: {
        join: {
          table: 'sessions',
          alias: 'vs_prg_vr_s',
          on: 'vs_prg_vr_s.id = vsc_report.session_id',
        },
        condition: 'vs_prg_vr_s.program_id IN (:...vsValues)',
      },
      vscDailyReports: {
        // vsc_daily_reports doesn't have direct session_id, no program link
        condition: '1 = 0', // block access
      },
      assignments: {
        join: {
          table: 'sessions',
          alias: 'vs_prg_asgn_s',
          on: 'vs_prg_asgn_s.id = assignment.session_id',
        },
        condition: 'vs_prg_asgn_s.program_id IN (:...vsValues)',
      },
      pairs: {
        join: {
          table: 'sessions',
          alias: 'vs_prg_pair_s',
          on: 'vs_prg_pair_s.id = pair.session_id',
        },
        condition: 'vs_prg_pair_s.program_id IN (:...vsValues)',
      },
    },
  },

  // ─── subject ─────────────────────────────────────────────────────────────
  subject: {
    label: 'Matière',
    userSideQuery: `
      SELECT ups.specialty_id AS value
      FROM user_profile_specialties ups
      JOIN user_profiles up ON up.id = ups.user_profile_id
      WHERE up.user_id = :userId
    `,
    entitySides: {
      sessions: {
        // :...vsValues (spread) compatible avec le resolver ; ANY évite le problème de cast tableau
        condition: `EXISTS (SELECT 1 FROM jsonb_array_elements_text(session.subject_ids::jsonb) t(v) WHERE t.v = ANY(ARRAY[:...vsValues]::text[]))`,
      },
    },
  },

  // ─── assignment (session affectations) ───────────────────────────────────
  assignment: {
    label: 'Affectation (sessions assignées)',
    userSideQuery: `
      SELECT DISTINCT sp.session_id AS value
      FROM session_participants sp
      WHERE sp.user_id = :userId
    `,
    entitySides: {
      sessions: {
        condition: 'session.id IN (:...vsValues)',
      },
      reports: {
        condition: 'report.session_id IN (:...vsValues)',
      },
      vscReports: {
        condition: 'vsc_report.session_id IN (:...vsValues)',
      },
      vscDailyReports: {
        // vsc_daily_reports doesn't have session_id, no direct assignment link
        condition: '1 = 0', // block access
      },
      assignments: {
        condition: 'assignment.session_id IN (:...vsValues)',
      },
      pairs: {
        condition: 'pair.session_id IN (:...vsValues)',
      },
      sessionParticipants: {
        condition: 'session_participant.session_id IN (:...vsValues)',
      },
    },
  },

  // ─── department ──────────────────────────────────────────────────────────
  // Filters entities by the department of the user's assigned establishments.
  // "Same department" means sharing at least one establishment department.
  department: {
    label: 'Département',
    userSideQuery: `
      SELECT DISTINCT e.department AS value
      FROM user_establishments ue
      JOIN establishments e ON e.id = ue.establishment_id
      WHERE ue.user_id = :userId
        AND e.department IS NOT NULL
    `,
    entitySides: {
      establishments: {
        condition: 'establishment.department IN (:...vsValues)',
      },
      sessions: {
        // sessions → establishment → department
        join: {
          table: 'establishments',
          alias: 'vs_dept_s_e',
          on: 'vs_dept_s_e.id = session.establishment_id',
        },
        condition: 'vs_dept_s_e.department IN (:...vsValues)',
      },
      users: {
        // users → user_establishments → establishment → department
        join: {
          table: 'user_establishments',
          alias: 'vs_dept_u_ue',
          on: 'vs_dept_u_ue.user_id = "user".id',
        },
        condition: `EXISTS (
          SELECT 1 FROM establishments vs_dept_u_e2
          WHERE vs_dept_u_e2.id = vs_dept_u_ue.establishment_id
            AND vs_dept_u_e2.department IN (:...vsValues)
        )`,
      },
      reports: {
        join: {
          table: 'sessions',
          alias: 'vs_dept_rpt_s',
          on: 'vs_dept_rpt_s.id = report.session_id',
        },
        condition: `EXISTS (
          SELECT 1 FROM establishments vs_dept_rpt_e
          WHERE vs_dept_rpt_e.id = vs_dept_rpt_s.establishment_id
            AND vs_dept_rpt_e.department IN (:...vsValues)
        )`,
      },
      vscReports: {
        join: {
          table: 'sessions',
          alias: 'vs_dept_vr_s',
          on: 'vs_dept_vr_s.id = vsc_report.session_id',
        },
        condition: `EXISTS (
          SELECT 1 FROM establishments vs_dept_vr_e
          WHERE vs_dept_vr_e.id = vs_dept_vr_s.establishment_id
            AND vs_dept_vr_e.department IN (:...vsValues)
        )`,
      },
      vscDailyReports: {
        // vsc_daily_reports has direct establishment_id
        join: {
          table: 'establishments',
          alias: 'vs_dept_vdr_e',
          on: 'vs_dept_vdr_e.id = r.establishment_id',
        },
        condition: 'vs_dept_vdr_e.department IN (:...vsValues)',
      },
      assignments: {
        join: {
          table: 'sessions',
          alias: 'vs_dept_asgn_s',
          on: 'vs_dept_asgn_s.id = assignment.session_id',
        },
        condition: `EXISTS (
          SELECT 1 FROM establishments vs_dept_asgn_e
          WHERE vs_dept_asgn_e.id = vs_dept_asgn_s.establishment_id
            AND vs_dept_asgn_e.department IN (:...vsValues)
        )`,
      },
      pairs: {
        join: {
          table: 'sessions',
          alias: 'vs_dept_pair_s',
          on: 'vs_dept_pair_s.id = pair.session_id',
        },
        condition: `EXISTS (
          SELECT 1 FROM establishments vs_dept_pair_e
          WHERE vs_dept_pair_e.id = vs_dept_pair_s.establishment_id
            AND vs_dept_pair_e.department IN (:...vsValues)
        )`,
      },
    },
  },

  // ─── roleTarget (users of a specific role) ────────────────────────────────
  // Used for admin-style pages: coordinator sees coordinators they manage, etc.
  // The targetRoleCode in the scope JSONB drives the SQL filter.
  roleTarget: {
    label: 'Rôle cible',
    userSideQuery: `SELECT :userId AS value`,
    entitySides: {
      users: {
        // Resolver injects the targetRoleCode dynamically.
        // Condition is overridden in VisibilityScopeResolverService for this relation.
        condition: '"user".id IN (SELECT ur.user_id FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE r.code = :vsTargetRoleCode AND r.company_id = :vsCompanyId)',
      },
    },
  },
};

/** Supported entity type keys for the resolver. */
export type EntityType =
  | 'sessions'
  | 'reports'
  | 'vscReports'
  | 'vscDailyReports'
  | 'users'
  | 'tutors'
  | 'students'
  | 'volunteers'
  | 'admins'
  | 'roles'
  | 'establishments'
  | 'assignments'
  | 'pairs'
  | 'sessionParticipants'
  | 'programs'
  | 'levels'
  | 'subjects'
  | 'holidays'
  | 'schoolYears'
  | 'activities'
  | 'activityTypes'
  | 'specialties';
