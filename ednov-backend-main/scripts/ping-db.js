/**
 * Test database connectivity. Loads .env from repo root and tries one query.
 * Usage: node scripts/ping-db.js   (from ednov-backend directory)
 */
require('dotenv').config();
const { Client } = require('pg');

const url = process.env.DATABASE_URL;
const ssl = process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false;

if (!url) {
  console.error('Missing DATABASE_URL in .env');
  process.exit(1);
}

const client = new Client({ connectionString: url, ssl });

client
  .connect()
  .then(() => client.query('SELECT 1'))
  .then(() => {
    console.log('Database connection OK');
    return client.end();
  })
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  });
