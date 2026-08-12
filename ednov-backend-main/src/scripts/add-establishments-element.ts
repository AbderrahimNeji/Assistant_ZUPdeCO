/**
 * Script pour ajouter l'élément "establishments-table" au dashboard
 * Run: ts-node src/scripts/add-establishments-element.ts
 */
import { config } from 'dotenv';
import { join } from 'path';
import dataSource from '../../data-source';
import { InterfaceElement } from '../modules/interface-elements/entities/interface-element.entity';

config({ path: join(__dirname, '../../.env') });

async function run() {
  try {
    console.log('🔌 Connecting to database...');
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    console.log('✅ Database connected\n');

    const interfaceElementRepository = dataSource.getRepository(InterfaceElement);
    const companyId = '354eb5d0-17a4-4906-8b27-7c6339bdcd70';

    // Vérifier si l'élément existe déjà
    const existing = await interfaceElementRepository.findOne({
      where: {
        companyId,
        interfaceName: 'dashboard',
        elementId: 'establishments-table',
      },
    });

    if (existing) {
      console.log('✅ Element "establishments-table" already exists!');
      console.log('   ID:', existing.id);
      return;
    }

    // Créer le nouvel élément
    const element = interfaceElementRepository.create({
      companyId,
      interfaceName: 'dashboard',
      elementId: 'establishments-table',
      elementType: 'table',
      elementLabel: 'Établissements',
        config: {
        type: 'establishments',
        showFilters: true,
        showPagination: true,
      },
    });

    await interfaceElementRepository.save(element);
    console.log('✅ Element "establishments-table" created successfully!');
    console.log('   ID:', element.id);

  } catch (err) {
    console.error('❌ Script failed:', err);
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('\n🔌 Database connection closed');
    }
  }
}

run();
