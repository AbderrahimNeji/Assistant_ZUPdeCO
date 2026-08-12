/**
 * Dev -> recette sync for professor/recruiter scoped role_interface_elements only.
 * Batched (minimal round-trips).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client } = require('pg');

const COMPANY_ID = '354eb5d0-17a4-4906-8b27-7c6339bdcd70';

function loadEnvFile(envPath) {
  const txt = fs.readFileSync(envPath, 'utf8');
  const out = {};
  for (const line of txt.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1).replace(/\\n/g, '\n');
    }
    out[key] = val;
  }
  return out;
}

const RIE_SCOPE_SQL = `
WITH targeted_ie AS (
  SELECT id FROM interface_elements
  WHERE company_id = $1
    AND (
      element_id ~* '(professor|recruiter)'
      OR (config->>'targetRole') ~* '(professor|recruiter)'
      OR (config->>'targetRoleCode') ~* '(professor|recruiter)'
      OR (config->>'tabValue') ~* '(professor|recruiter)'
    )
),
prof_rec AS (
  SELECT id FROM roles WHERE company_id = $1 AND code IN ('professor','recruiter')
)
SELECT r.id, r.company_id, r.role_id, r.element_id,
       r.visibility_scope::text AS visibility_scope,
       r."order", r.visible, r.width
FROM role_interface_elements r
WHERE r.company_id = $1
  AND (
    r.role_id IN (SELECT id FROM prof_rec)
    OR r.element_id IN (SELECT id FROM targeted_ie)
  )
ORDER BY r.role_id, r.element_id;
`;

async function fetchIeClosure(dev, rootIds) {
  const { rows } = await dev.query(
    `
    WITH RECURSIVE chain AS (
      SELECT id, parent_id FROM interface_elements
      WHERE id = ANY($1::uuid[])
      UNION ALL
      SELECT ie.id, ie.parent_id
      FROM interface_elements ie
      INNER JOIN chain c ON ie.id = c.parent_id
    )
    SELECT ie.*
    FROM interface_elements ie
    WHERE ie.id IN (SELECT id FROM chain)
    `,
    [rootIds],
  );
  return rows;
}

function topoSorted(rows) {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const visiting = new Set();
  const done = new Set();
  const out = [];

  function visit(id) {
    if (!id) return;
    if (done.has(id)) return;
    if (visiting.has(id)) return;
    const row = byId.get(id);
    if (!row) return;
    visiting.add(id);
    visit(row.parent_id);
    visiting.delete(id);
    done.add(id);
    out.push(row);
  }

  for (const r of rows) visit(r.id);
  return out;
}

async function ensureAllInterfaceElements(rec, sortedRows, tenantCompanyId) {
  const insertSql = `
    INSERT INTO interface_elements (
      id, company_id, interface_name, element_id, element_type, element_label, config,
      created_at, updated_at, deleted_at, group_label, group_icon, group_order,
      parent_id, entity_sub_key, entity_filter, mode
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17
    )
    ON CONFLICT (id) DO NOTHING
  `;

  const mapDevToRec = new Map();

  for (const row of sortedRows) {
    const nk = await rec.query(
      `SELECT id FROM interface_elements
       WHERE company_id = $1 AND interface_name = $2 AND element_id = $3`,
      [tenantCompanyId, row.interface_name, row.element_id],
    );

    let recId = nk.rowCount ? nk.rows[0].id : null;

    let recParentId = row.parent_id;
    if (recParentId && mapDevToRec.has(recParentId)) {
      recParentId = mapDevToRec.get(recParentId);
    }

    if (!recId) {
      const cfg =
        typeof row.config === 'string' ? row.config : JSON.stringify(row.config ?? {});
      const newId = crypto.randomUUID();
      try {
        await rec.query(insertSql, [
          newId,
          tenantCompanyId,
          row.interface_name,
          row.element_id,
          row.element_type,
          row.element_label,
          cfg,
          row.created_at,
          row.updated_at,
          row.deleted_at,
          row.group_label,
          row.group_icon,
          row.group_order,
          recParentId,
          row.entity_sub_key,
          row.entity_filter,
          row.mode,
        ]);
      } catch (e) {
        if (e.code !== '23505') throw e;
      }
      const nk2 = await rec.query(
        `SELECT id FROM interface_elements
         WHERE company_id = $1 AND interface_name = $2 AND element_id = $3`,
        [tenantCompanyId, row.interface_name, row.element_id],
      );
      recId = nk2.rows[0]?.id ?? null;
    }

    if (!recId) {
      throw new Error(`Could not resolve recette IE ${row.id} ${row.interface_name}/${row.element_id}`);
    }

    mapDevToRec.set(row.id, recId);
  }

  return mapDevToRec;
}

async function upsertRie(rec, row, recElementId) {
  const upd = await rec.query(
    `
    UPDATE role_interface_elements SET
      visibility_scope = $1::jsonb,
      "order" = $2,
      visible = $3,
      width = $4,
      company_id = $5
    WHERE role_id = $6 AND element_id = $7
    `,
    [
      row.visibility_scope,
      row.order,
      row.visible,
      row.width,
      row.company_id,
      row.role_id,
      recElementId,
    ],
  );
  if (upd.rowCount > 0) return;

  let insertId = row.id;
  const byPk = await rec.query(`SELECT role_id, element_id FROM role_interface_elements WHERE id = $1`, [
    insertId,
  ]);
  if (
    byPk.rowCount &&
    (byPk.rows[0].role_id !== row.role_id || byPk.rows[0].element_id !== recElementId)
  ) {
    insertId = crypto.randomUUID();
  }

  await rec.query(
    `
    INSERT INTO role_interface_elements (
      id, company_id, role_id, element_id, visibility_scope, "order", visible, width
    ) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8)
    `,
    [
      insertId,
      row.company_id,
      row.role_id,
      recElementId,
      row.visibility_scope,
      row.order,
      row.visible,
      row.width,
    ],
  );
}

async function main() {
  const envPath = path.join(__dirname, '..', '.env');
  const env = loadEnvFile(envPath);
  const devUrl = env.DATABASE_URL;
  const recUrl = env.DATABASE_URL_RECETTE;
  if (!devUrl || !recUrl) {
    throw new Error('DATABASE_URL and DATABASE_URL_RECETTE required in .env');
  }

  const dev = new Client({
    connectionString: devUrl,
    ssl: { rejectUnauthorized: false },
  });
  const rec = new Client({
    connectionString: recUrl,
    ssl: { rejectUnauthorized: false },
  });

  await dev.connect();
  await rec.connect();

  const { rows: devRies } = await dev.query(RIE_SCOPE_SQL, [COMPANY_ID]);
  const rootIds = [...new Set(devRies.map((r) => r.element_id))];

  const ieRows = await fetchIeClosure(dev, rootIds);
  const sorted = topoSorted(ieRows);
  console.log(`Scoped RIE: ${devRies.length}, IE closure: ${sorted.length}`);

  const devToRec = await ensureAllInterfaceElements(rec, sorted, COMPANY_ID);

  let ok = 0;
  let fail = 0;

  for (const r of devRies) {
    try {
      const recEl = devToRec.get(r.element_id);
      if (!recEl) throw new Error(`No mapped IE for ${r.element_id}`);

      await upsertRie(rec, r, recEl);
      ok++;
    } catch (e) {
      fail++;
      console.error(`RIE ${r.id} failed:`, e.message);
    }
  }

  console.log(`Done. Upserted OK: ${ok}, failed: ${fail}`);
  await dev.end();
  await rec.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
