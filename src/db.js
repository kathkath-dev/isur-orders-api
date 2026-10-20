const { Pool } = require('pg');
const { config, assertDbConfig } = require('./config');

assertDbConfig();

// Pool de conexiones: se conecta bajo demanda, por lo que la API no se cae
// si PostgreSQL tarda unos segundos en estar disponible.
const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  user: config.db.user,
  password: config.db.password,
  ssl: config.db.ssl,
  max: 10,
  connectionTimeoutMillis: 3000
});

module.exports = { pool };
