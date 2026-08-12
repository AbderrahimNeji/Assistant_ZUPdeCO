/**
 * Fetches the OpenAPI document from a running server and writes docs/swagger.json.
 * Start the server first (npm run dev), then run: node scripts/fetch-swagger.js
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 3000;
const url = `http://127.0.0.1:${port}/api-docs-json`;

http
  .get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => {
      if (res.statusCode !== 200) {
        console.error(`Failed to fetch: ${res.statusCode}`);
        process.exit(1);
      }
      const outDir = path.join(process.cwd(), 'docs');
      const outPath = path.join(outDir, 'swagger.json');
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(outPath, JSON.stringify(JSON.parse(data), null, 2), 'utf-8');
      console.log(`Swagger document written to ${outPath}`);
    });
  })
  .on('error', (err) => {
    console.error('Error:', err.message);
    console.error(`Make sure the server is running (e.g. npm run dev) on port ${port}.`);
    process.exit(1);
  });
