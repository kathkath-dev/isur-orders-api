// Configuración leída exclusivamente desde variables de entorno.
// Ninguna credencial se escribe en el código ni en la imagen.
const pkg = require('../package.json');

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  version: pkg.version,
  gitSha: process.env.GIT_SHA || 'local',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  }
};

function assertDbConfig() {
  const missing = ['database', 'user', 'password'].filter((k) => !config.db[k]);
  if (missing.length > 0) {
    throw new Error(
      'Faltan variables de conexión a la BD: ' +
        missing.map((k) => 'DB_' + (k === 'database' ? 'NAME' : k.toUpperCase())).join(', ')
    );
  }
}

module.exports = { config, assertDbConfig };
