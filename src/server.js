const { app } = require('./app');
const { config } = require('./config');
const { pool } = require('./db');

const server = app.listen(config.port, () => {
  console.log(
    `isur-orders-api v${config.version} (${config.gitSha}) escuchando en puerto ${config.port} [${config.env}]`
  );
});

// Apagado ordenado: Docker envía SIGTERM al detener el contenedor
function shutdown(signal) {
  console.log(`Recibido ${signal}, cerrando servidor...`);
  server.close(() => {
    pool.end().finally(() => process.exit(0));
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
