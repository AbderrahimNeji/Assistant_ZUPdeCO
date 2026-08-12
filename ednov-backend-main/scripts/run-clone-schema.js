/**
 * Script pour cloner le schema ednov_testing → remote via pg (node-postgres)
 * Usage: node scripts/run-clone-schema.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function main() {
  // Connection string depuis .env (on utilise DATABASE_URL dev)
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.dssxfzdxxbvihlpsihgp:evCUThLhhaTf4hZr@aws-0-eu-west-1.pooler.supabase.com:6543/postgres';
  
  console.log('🔌 Connexion à Supabase...');
  console.log('   Connection:', connectionString.replace(/:[^:@]+@/, ':****@'));

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connecté\n');

    // Lire le script SQL
    const sqlPath = path.join(__dirname, 'clone-schema-to-remote.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 Exécution du script SQL...');
    console.log('   (Cela peut prendre 2-5 minutes pour cloner 66k+ lignes)\n');

    // Exécuter le script complet
    await client.query(sql);

    console.log('✅ Schema "remote" créé avec succès !');
    console.log('   72 tables clonées depuis ednov_testing\n');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
