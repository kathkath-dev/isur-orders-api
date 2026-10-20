/*
 * Pruebas de integración contra PostgreSQL REAL (sin mocks).
 * Requieren que las migraciones ya se hayan aplicado (npm run migrate).
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('../src/app');
const { pool } = require('../src/db');

let server;
let baseUrl;
// Sufijo único para no chocar con datos de ejecuciones anteriores
const suffix = Date.now().toString().slice(-8);

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

function post(path, body) {
  return fetch(baseUrl + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

test('las migraciones V001-V003 están registradas en schema_migrations', async () => {
  const { rows } = await pool.query('SELECT version FROM schema_migrations ORDER BY version');
  const versions = rows.map((r) => r.version);
  for (const v of ['V001', 'V002', 'V003']) {
    assert.ok(versions.includes(v), `Falta la migración ${v}`);
  }
});

test('las tablas customers y orders existen', async () => {
  const { rows } = await pool.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name IN ('customers', 'orders')`
  );
  assert.equal(rows.length, 2);
});

test('GET /health/live responde 200', async () => {
  const res = await fetch(`${baseUrl}/health/live`);
  assert.equal(res.status, 200);
});

test('GET /health/ready responde 200 con la BD disponible', async () => {
  const res = await fetch(`${baseUrl}/health/ready`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.database, 'up');
});

test('crea un cliente válido (201) y rechaza el document_number duplicado (409)', async () => {
  const customer = {
    document_number: `T${suffix}`,
    full_name: 'Cliente de Prueba',
    email: 'prueba@example.test'
  };
  const ok = await post('/api/v1/customers', customer);
  assert.equal(ok.status, 201);

  const dup = await post('/api/v1/customers', customer);
  assert.equal(dup.status, 409, 'La restricción UNIQUE debe rechazar el duplicado');
});

test('crea un pedido válido (201) para un cliente existente', async () => {
  const c = await post('/api/v1/customers', {
    document_number: `P${suffix}`,
    full_name: 'Cliente con Pedido'
  });
  const customer = await c.json();
  const res = await post('/api/v1/orders', { customer_id: customer.id, total: 99.5 });
  assert.equal(res.status, 201);
});

test('rechaza un pedido para un customer_id inexistente (422 por FK)', async () => {
  const res = await post('/api/v1/orders', { customer_id: 999999, total: 10 });
  assert.equal(res.status, 422, 'La clave foránea debe impedir pedidos huérfanos');
});
