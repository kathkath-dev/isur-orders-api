/*
 * Carga datos de demostración. Bloqueado en producción.
 */
const fs = require('fs');
const path = require('path');
const { config } = require('../src/config');

if (config.env === 'production') {
  console.error('[seed] Bloqueado: no se cargan datos de demostración con NODE_ENV=production');
  process.exit(1);
}

const { pool } = require('../src/db');
const SEEDS_DIR = path.join(__dirname, '..', 'db', 'seeds');

async function main() {
  const files = fs.readdirSync(SEEDS_DIR).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    console.log(`[seed] Ejecutando ${file}`);
    await pool.query(fs.readFileSync(path.join(SEEDS_DIR, file), 'utf8'));
  }
  console.log('[seed] Datos de demostración cargados');
}

main()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error(`[seed] ERROR: ${err.message}`);
    await pool.end();
    process.exit(1);
  });
