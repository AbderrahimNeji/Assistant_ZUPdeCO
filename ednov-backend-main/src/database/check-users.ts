import dataSource from '../../data-source';
import { User } from '../modules/users/entities/user.entity';

async function checkUsers() {
  try {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }

    const userRepo = dataSource.getRepository(User);
    const users = await userRepo.find({
      where: { companyId: '4d389bc2-d60b-43b1-97f3-b8dd51b9f26e' },
      select: ['id', 'email', 'firstName', 'lastName'],
      take: 10,
    });

    console.log('\n📋 Users in company 4d389bc2-d60b-43b1-97f3-b8dd51b9f26e:');
    console.log('='.repeat(60));
    
    if (users.length === 0) {
      console.log('❌ No users found in this company!');
    } else {
      users.forEach((user, index) => {
        console.log(`\n${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`);
        console.log(`   ID: ${user.id}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`Total: ${users.length} user(s)\n`);

    await dataSource.destroy();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUsers();
