/**
 * Script standalone pour ajouter l'élément de filtre "filter-recurrence"
 * dans la table interface_elements et créer les accès pour tous les rôles
 * qui ont déjà accès aux filtres de sessions (ex: filter-type).
 *
 * Run: 
 *   npm run script:add-filter-recurrence              → DB dev (par défaut)
 *   npm run script:add-filter-recurrence -- --env=recette  → DB recette
 */
import { config } from 'dotenv';
import { join } from 'path';
import dataSource from '../../data-source';
import { InterfaceElement } from '../modules/interface-elements/entities/interface-element.entity';
import { RoleInterfaceElement } from '../modules/interface-elements/entities/role-interface-element.entity';

config({ path: join(__dirname, '../../.env') });

const COMPANY_ID = '354eb5d0-17a4-4906-8b27-7c6339bdcd70';

// UUIDs pré-assignés pour une insertion reproductible (idempotente)
const FILTER_RECURRENCE_UUID = '8f3c2a9e-4b7d-4e1c-a5f8-2d6b3c9e1f4a';

// Rôles ayant accès aux filtres sessions (identiques à filter-type)
// Source: SELECT * FROM role_interface_elements WHERE element_id = '339d2cb7-5581-43c0-bb39-976d9e4cee36'
const ROLE_ACCESS = [
  {
    id: '1d4e7f2a-9c3b-4e8d-f5a1-6b2c8f4d3e7a',
    roleId: '47799c56-cfbd-46c9-9edf-ff657d677a35', // Administrateur
    visible: true,
    order: 2,
    width: 'auto' as const,
  },
  {
    id: '2e5f8a3b-1d4c-4f9e-a6b2-7c3d9a5e4f8b',
    roleId: 'bb9a001f-4090-42d8-9a0f-5dcbfcb4657a', // Coordinateur/trice
    visible: true,
    order: 2,
    width: 'auto' as const,
  },
  {
    id: '3f6a9b4c-2e5d-4a1f-b7c3-8d4e1b6f5a9c',
    roleId: 'c50b47d2-77be-450d-80a8-697559a060ee', // Manager
    visible: true,
    order: 2,
    width: 'auto' as const,
  },
  {
    id: '4a7b1c5d-3f6e-4b2a-c8d4-9e5f2c7a6b1d',
    roleId: '56ff89f1-efe9-48ba-b742-992b2f0700f9', // Professeur
    visible: null,
    order: null,
    width: null,
  },
  {
    id: '5b8c2d6e-4a7f-4c3b-d9e5-1f6a3d8b7c2e',
    roleId: '96f0f918-0067-44c5-a9f7-d1738edc6092', // student
    visible: true,
    order: 2,
    width: 'auto' as const,
  },
  {
    id: '6c9d3e7f-5b8a-4d4c-e1f6-2a7b4e9c8d3f',
    roleId: 'f332ee49-dcda-40a4-83f3-3debdb1ccd29', // Tuteur
    visible: true,
    order: 2,
    width: 'auto' as const,
  },
  {
    id: '7d1e4f8a-6c9b-4e5d-f2a7-3b8c5f1d9e4a',
    roleId: '0d337159-c148-45b2-8fde-f3f7375f24bd', // Volunteer
    visible: true,
    order: 2,
    width: 'auto' as const,
  },
];

async function run() {
  try {
    console.log('🔌 Connecting to database...');
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    console.log('✅ Database connected\n');

    const ieRepo = dataSource.getRepository(InterfaceElement);
    const rieRepo = dataSource.getRepository(RoleInterfaceElement);

    // ─── 1. InterfaceElement ────────────────────────────────────────────────
    const existing = await ieRepo.findOne({
      where: {
        companyId: COMPANY_ID,
        interfaceName: 'sessions',
        elementId: 'filter-recurrence',
      },
    });

    let elementUuid: string;

    if (existing) {
      console.log('⚠️  InterfaceElement "filter-recurrence" already exists.');
      console.log('   UUID:', existing.id);
      elementUuid = existing.id;
    } else {
      const element = ieRepo.create({
        id: FILTER_RECURRENCE_UUID,
        companyId: COMPANY_ID,
        interfaceName: 'sessions',
        elementId: 'filter-recurrence',
        elementType: 'filter',
        elementLabel: 'Récurrence',
        config: {},
        groupLabel: null,
        groupIcon: null,
        groupOrder: 0,
        parentId: null,
      });

      await ieRepo.save(element);
      elementUuid = element.id;
      console.log('✅ InterfaceElement "filter-recurrence" créé.');
      console.log('   UUID:', elementUuid);
    }

    // ─── 2. RoleInterfaceElements ───────────────────────────────────────────
    console.log('\n📋 Création des accès par rôle...');
    let created = 0;
    let skipped = 0;

    for (const roleAccess of ROLE_ACCESS) {
      const existingRie = await rieRepo.findOne({
        where: {
          roleId: roleAccess.roleId,
          elementId: elementUuid,
        },
      });

      if (existingRie) {
        console.log(`   ⚠️  Accès rôle ${roleAccess.roleId} déjà présent — ignoré`);
        skipped++;
        continue;
      }

      const rie = rieRepo.create({
        id: roleAccess.id,
        companyId: COMPANY_ID,
        roleId: roleAccess.roleId,
        elementId: elementUuid,
        visible: roleAccess.visible,
        order: roleAccess.order,
        width: roleAccess.width as any,
        visibilityScope: null,
      });

      await rieRepo.save(rie);
      console.log(`   ✅ Accès créé pour rôle ${roleAccess.roleId}`);
      created++;
    }

    console.log(`\n📊 Résultat : ${created} créé(s), ${skipped} ignoré(s)`);
    console.log('\n✅ Script terminé avec succès !');
    console.log('\n📝 UUID à reporter dans les fichiers JSON de seeding :');
    console.log(`   interface-elements.json   → id: "${elementUuid}"`);
    console.log(`   role-interface-elements.json → element_id: "${elementUuid}"`);

  } catch (err) {
    console.error('❌ Script échoué :', err);
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('\n🔌 Connexion base fermée');
    }
  }
}

run();
