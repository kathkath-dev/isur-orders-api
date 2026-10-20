/*
 * Migrador de esquema ISUR
 * - Lee db/migrations y aplica en orden los archivos VNNN__descripcion.sql pendientes.
 * - Registra cada migración en schema_migrations con su checksum SHA-256.
 * - Si una migración ya aplicada fue modificada, se detiene (checksum mismatch).
 * - Cada migración se ejecuta en su propia transacción (todo o nada).
 * - Un advisory lock impide que dos migradores se ejecuten a la vez.
 * Termina con código 0 si todo fue correcto y 1 ante cualquier error.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client } = require('pg');
const { config, assertDbConfig } = require('../src/config');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'db', 'migrations');
const LOCK_ID = 727001; // identificador arbitrario del advisory lock
const FILE_PATTERN = /^V(\d{3,})__[\w-]+\.sql$/;

// Se normalizan los saltos de línea para que Windows (CRLF) y Linux (LF)
// produzcan el mismo checksum para el mismo contenido.
function checksumOf(content) {
  return crypto.createHash('sha256').update(content.replace(/\r\n/g, '\n')).digest('hex');
}

function loadMigrationFiles() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .map((file) => {
      const match = FILE_PATTERN.exec(file);
      if (!match) {
        throw new Error(`Nombre de migración inválido: ${file} (formato esperado VNNN__descripcion.sql)`);
      }
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      return { version: `V${match[1]}`, file, sql, checksum: checksumOf(sql) };
    })
    .sort((a, b) => a.file.localeCompare(b.file));
}

async function connectWithRetry(retries = 10, delayMs = 2000) {
  for (let attempt = 1; ; attempt++) {
    const client = new Client({
      host: config.db.host,
      port: config.db.port,
      database: config.db.database,
      user: config.db.user,
      password: config.db.password,
      ssl: config.db.ssl
    });
    try {
      await client.connect();
      return client;
    } catch (err) {
      if (attempt >= retries) throw err;
      console.log(`[migrate] BD no disponible (intento ${attempt}/${retries}): ${err.message}`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

async function main() {
  assertDbConfig();
  const migrations = loadMigrationFiles();
  const client = await connectWithRetry();

  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID]);
    console.log('[migrate] Lock adquirido');

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version     VARCHAR(20)  PRIMARY KEY,
        filename    VARCHAR(255) NOT NULL,
        checksum    CHAR(64)     NOT NULL,
        applied_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
      )
    `);

    const { rows } = await client.query('SELECT version, filename, checksum FROM schema_migrations');
    const applied = new Map(rows.map((r) => [r.version, r]));

    // 1) Verificar que ninguna migración aplicada haya sido modificada
    for (const m of migrations) {
      const prev = applied.get(m.version);
      if (prev && prev.checksum !== m.checksum) {
        throw new Error(
          `CHECKSUM MISMATCH en ${m.file}: la migración ya fue aplicada y su contenido cambió.\n` +
            `  registrado: ${prev.checksum}\n  actual:     ${m.checksum}\n` +
            '  Restaure el archivo original y cree una NUEVA migración para el cambio.'
        );
      }
    }

    // 2) Aplicar las pendientes, cada una en su propia transacción
    const pending = migrations.filter((m) => !applied.has(m.version));
    if (pending.length === 0) {
      console.log(`[migrate] Esquema al día (${migrations.length} migraciones aplicadas)`);
    }
    for (const m of pending) {
      console.log(`[migrate] Aplicando ${m.file} ...`);
      try {
        await client.query('BEGIN');
        await client.query(m.sql);
        await client.query(
          'INSERT INTO schema_migrations (version, filename, checksum) VALUES ($1, $2, $3)',
          [m.version, m.file, m.checksum]
        );
        await client.query('COMMIT');
        console.log(`[migrate] OK ${m.file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Falló ${m.file}: ${err.message} (cambios revertidos)`);
      }
    }
    if (pending.length > 0) {
      console.log(`[migrate] ${pending.length} migración(es) aplicada(s) correctamente`);
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]).catch(() => {});
    await client.end();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`[migrate] ERROR: ${err.message}`);
    process.exit(1);
  });
