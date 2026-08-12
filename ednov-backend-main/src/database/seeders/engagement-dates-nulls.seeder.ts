import { DataSource } from 'typeorm';

function escapePgIdent(ident: string): string {
  return `"${ident.replace(/"/g, '""')}"`;
}

function qualifyTable(ds: DataSource, tableName: string): string {
  const schema =
    ds.options && typeof (ds.options as { schema?: string }).schema === 'string'
      ? (ds.options as { schema?: string }).schema!
      : 'public';
  return `${escapePgIdent(schema)}.${escapePgIdent(tableName)}`;
}

function envFlagTrue(raw: string | undefined): boolean {
  const s = raw?.trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes';
}

/** Opt-out helpers for overwriting volunteer profiles (defaults are permissive — one-shot `npm run seed:…` works without extra env). */
function envFlagExplicitFalse(raw: string | undefined): boolean {
  const s = raw?.trim().toLowerCase();
  return s === '0' || s === 'false' || s === 'no' || s === 'off';
}

/**
 * **`SEED_ENGAGEMENT_BASE`** — optional ISO anchor `YYYY-MM-DD`. Default PostgreSQL **`CURRENT_DATE`**.
 *
 * **Volunteers (default)** — if any **`VOLUNTEER`** user has a **`user_profiles`** row, that profile’s engagement dates are **overwritten** with deterministic future ranges (`engagementDurationMonths` > 0).  
 * **`SEED_ENGAGEMENT_NULLS_ONLY=true`** — disable that default; then only **`SEED_ENGAGEMENT_FORCE_VOLUNTEERS=true`** turns volunteer overwrite back on (legacy “null columns only”).  
 * **`SEED_ENGAGEMENT_FORCE_VOLUNTEERS=false|0|no|off`** — skip volunteer overwrite even in default mode.
 *
 * **`SEED_ENGAGEMENT_FORCE_ESTABLISHMENTS`** — overwrite all non-deleted **`establishments`** (opt-in).
 */
function validatedAnchorIsoOrNull(): string | null {
  const s = process.env.SEED_ENGAGEMENT_BASE?.trim();
  if (s && /^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return s;
  }
  return null;
}

function pgDateAnchorExpr(): string {
  const iso = validatedAnchorIsoOrNull();
  return iso ? `'${iso}'::date` : 'CURRENT_DATE';
}

function rowCountFromQueryResult(result: unknown): number {
  if (Array.isArray(result) && result.length >= 2 && result[1] != null) {
    const n = Number(result[1]);
    if (!Number.isNaN(n)) {
      return n;
    }
  }
  if (result !== null && typeof result === 'object' && 'rowCount' in result) {
    return Number((result as { rowCount?: number }).rowCount ?? 0);
  }
  return 0;
}

async function selectIntCount(ds: DataSource, sql: string): Promise<number> {
  const rows = (await ds.query(sql)) as { c?: string | number }[];
  const raw = rows[0]?.c;
  const n = raw == null ? 0 : Number(raw);
  return Number.isNaN(n) ? 0 : n;
}

function volunteerExistsPred(ds: DataSource, profileAlias: string): string {
  const ur = qualifyTable(ds, 'user_roles');
  const rr = qualifyTable(ds, 'roles');
  return `EXISTS (
    SELECT 1
    FROM ${ur} AS ur
    INNER JOIN ${rr} AS r ON r.id = ur.role_id
    WHERE ur.user_id = ${profileAlias}.user_id
      AND UPPER(TRIM(COALESCE(r.code, ''))) = 'VOLUNTEER'
  )`;
}

function syntheticStartPreserveNull(alias: string, anchor: string): string {
  const h = `(abs(hashtext(${alias}.id::text))::bigint % 240)::integer`;
  return `
    CASE
      WHEN ${alias}.engagement_start_date IS NOT NULL THEN ${alias}.engagement_start_date
      WHEN ${alias}.engagement_end_date IS NOT NULL THEN LEAST(
        ${alias}.engagement_end_date - (31 + abs(hashtext(${alias}.id::text))::bigint % 150)::integer,
        ${alias}.engagement_end_date - 1
      )
      ELSE (${anchor}) - (60 + ${h})
    END::date`;
}

function syntheticEndPreserveNull(alias: string, anchor: string, minFuture: number, finSalt: string): string {
  const startDup = `
    CASE
      WHEN ${alias}.engagement_start_date IS NOT NULL THEN ${alias}.engagement_start_date
      WHEN ${alias}.engagement_end_date IS NOT NULL THEN LEAST(
        ${alias}.engagement_end_date - (31 + abs(hashtext(${alias}.id::text))::bigint % 150)::integer,
        ${alias}.engagement_end_date - 1
      )
      ELSE (${anchor}) - (60 + (abs(hashtext(${alias}.id::text))::bigint % 240)::integer)
    END::date`;

  const span = `(120 + abs(hashtext(${alias}.id::text || '${finSalt}'))::bigint % 548)::integer`;

  return `
    CASE
      WHEN ${alias}.engagement_end_date IS NOT NULL THEN ${alias}.engagement_end_date
      ELSE GREATEST(${startDup} + ${span}, (${anchor}) + ${minFuture})
    END::date`;
}

/** Full overwrite (`SET` RHS only) — end ≥ anchor + `minFuture` always. */
function overwriteProfileEngagementRhs(alias: string, anchor: string, minFuture: number, salt: string): string {
  const span = `(120 + abs(hashtext(${alias}.id::text || '${salt}'))::bigint % 548)::integer`;
  return `
  engagement_start_date = ((${anchor}) - (60 + (abs(hashtext(${alias}.id::text))::bigint % 240)::integer))::date,
  engagement_end_date = (
    GREATEST(
      ((${anchor}) - (60 + (abs(hashtext(${alias}.id::text))::bigint % 240)::integer))
        + ${span},
      (${anchor}) + ${minFuture}
    )
  )::date`;
}

function overwriteEstablishmentEngagementRhs(alias: string, anchor: string, minFuture: number, salt: string): string {
  const span = `(120 + abs(hashtext(${alias}.id::text || '${salt}'))::bigint % 548)::integer`;
  return `
  engagement_start_date = ((${anchor}) - (60 + (abs(hashtext(${alias}.id::text))::bigint % 240)::integer))::date,
  engagement_end_date = (
    GREATEST(
      ((${anchor}) - (60 + (abs(hashtext(${alias}.id::text))::bigint % 240)::integer))
        + ${span},
      (${anchor}) + ${minFuture}
    )
  )::date`;
}

export async function seedEngagementDatesFromNulls(ds: DataSource): Promise<void> {
  const anchor = pgDateAnchorExpr();
  const anchorNote = validatedAnchorIsoOrNull() ?? 'CURRENT_DATE';
  const forceEst = envFlagTrue(process.env.SEED_ENGAGEMENT_FORCE_ESTABLISHMENTS);

  console.log(
    '🌱 Filling engagement dates (profiles + establishments, deterministic per id)...',
    { anchor: anchorNote, SEED_ENGAGEMENT_FORCE_ESTABLISHMENTS: forceEst },
  );

  const userProfilesTab = qualifyTable(ds, 'user_profiles');
  const establishmentsTab = qualifyTable(ds, 'establishments');
  const volPred = volunteerExistsPred(ds, 'up');

  const profilesNullGap = await selectIntCount(
    ds,
    `SELECT COUNT(*)::int AS c FROM ${userProfilesTab} AS up
     WHERE engagement_start_date IS NULL OR engagement_end_date IS NULL`,
  );
  const volunteerProfileCount = await selectIntCount(
    ds,
    `SELECT COUNT(*)::int AS c FROM ${userProfilesTab} AS up WHERE ${volPred}`,
  );

  const nullsOnly = envFlagTrue(process.env.SEED_ENGAGEMENT_NULLS_ONLY);
  const overwriteVolunteers =
    volunteerProfileCount > 0 &&
    (nullsOnly
      ? envFlagTrue(process.env.SEED_ENGAGEMENT_FORCE_VOLUNTEERS)
      : !envFlagExplicitFalse(process.env.SEED_ENGAGEMENT_FORCE_VOLUNTEERS));

  const establishmentsGap = await selectIntCount(
    ds,
    `SELECT COUNT(*)::int AS c FROM ${establishmentsTab} AS e
     WHERE deleted_at IS NULL AND (engagement_start_date IS NULL OR engagement_end_date IS NULL)`,
  );

  console.log(
    `   Pre-check: user_profiles with null engagement (${profilesNullGap}), volunteer profiles (${volunteerProfileCount}), establishments with null (${establishmentsGap})`,
  );
  console.log(`   Volunteer profile refresh this run: ${overwriteVolunteers} (NULLS_ONLY=${nullsOnly})`);

  const minFutureDays = 93;
  let profilesUpdatedTotal = 0;
  let establishmentsUpdatedTotal = 0;

  /** 1) Refresh volunteer **`user_profiles`** (default whenever volunteers exist unless opted out). */
  if (overwriteVolunteers) {
    const profForceSql = `
UPDATE ${userProfilesTab} AS up
SET ${overwriteProfileEngagementRhs('up', anchor, minFutureDays, '|up_ovr').trim()},
  updated_at = NOW()
WHERE ${volPred}
`;
    const r1 = await ds.query(profForceSql);
    const n1 = rowCountFromQueryResult(r1);
    profilesUpdatedTotal += n1;
    console.log(`✅ user_profiles volunteer overwrite: ${n1} row(s)`);
  }

  /** 2) NULL-only fills for profiles not covered above; exclude volunteers once they were overwritten. */
  const nonVolunteerOrNullTail = overwriteVolunteers
    ? `(up.engagement_start_date IS NULL OR up.engagement_end_date IS NULL) AND NOT (${volPred})`
    : `up.engagement_start_date IS NULL OR up.engagement_end_date IS NULL`;

  const profPreserveSql = `
UPDATE ${userProfilesTab} AS up
SET
  engagement_start_date = ${syntheticStartPreserveNull('up', anchor).trim()},
  engagement_end_date = ${syntheticEndPreserveNull('up', anchor, minFutureDays, '|up_fin').trim()},
  updated_at = NOW()
WHERE ${nonVolunteerOrNullTail}
`;
  const r2 = await ds.query(profPreserveSql);
  const n2 = rowCountFromQueryResult(r2);
  profilesUpdatedTotal += n2;
  console.log(`✅ user_profiles null-fill (preserve rules): ${n2} row(s)`);

  /** Establishments */

  if (forceEst) {
    const sqlAll = `
UPDATE ${establishmentsTab} AS e
SET ${overwriteEstablishmentEngagementRhs('e', anchor, minFutureDays, '|est_ovr').trim()},
  updated_at = NOW()
WHERE e.deleted_at IS NULL
`;
    const rr = await ds.query(sqlAll);
    const nf = rowCountFromQueryResult(rr);
    establishmentsUpdatedTotal += nf;
    console.log(`✅ establishments full overwrite (non-deleted): ${nf} row(s)`);
  }

  const estPreserveSql = `
UPDATE ${establishmentsTab} AS e
SET
  engagement_start_date = ${syntheticStartPreserveNull('e', anchor).trim()},
  engagement_end_date = ${syntheticEndPreserveNull('e', anchor, minFutureDays, '|est_fin').trim()},
  updated_at = NOW()
WHERE (
  e.deleted_at IS NULL
  AND (e.engagement_start_date IS NULL OR e.engagement_end_date IS NULL)
)
`;
  const res = await ds.query(estPreserveSql);
  const nes = rowCountFromQueryResult(res);
  establishmentsUpdatedTotal += nes;
  console.log(`✅ establishments null-fill (preserve rules): ${nes} row(s)`);

  console.log(
    `   Totals updated this run: user_profiles=${profilesUpdatedTotal}, establishments=${establishmentsUpdatedTotal}`,
  );
}
