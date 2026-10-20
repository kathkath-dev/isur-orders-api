const express = require('express');
const { config } = require('./config');
const { pool } = require('./db');

const app = express();
app.use(express.json());

// Códigos de error de PostgreSQL usados para traducir restricciones a HTTP
const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';
const PG_CHECK_VIOLATION = '23514';

// ---------- Health checks ----------

// Liveness: el proceso de la API está activo (no consulta la BD)
app.get('/health/live', (req, res) => {
  res.json({ status: 'live' });
});

// Readiness: la API puede atender tráfico porque la BD responde
app.get('/health/ready', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ready', database: 'up' });
  } catch (err) {
    res.status(503).json({ status: 'not_ready', database: 'down', error: err.message });
  }
});

// Versión desplegada: permite saber qué código está operando
app.get('/version', (req, res) => {
  res.json({ name: 'isur-orders-api', version: config.version, commit: config.gitSha, env: config.env });
});

// ---------- Clientes ----------

app.get('/api/v1/customers', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, document_number, full_name, email, created_at FROM customers ORDER BY id'
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

app.post('/api/v1/customers', async (req, res, next) => {
  const { document_number, full_name, email } = req.body || {};
  if (!document_number || !full_name) {
    return res.status(400).json({ error: 'document_number y full_name son obligatorios' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO customers (document_number, full_name, email)
       VALUES ($1, $2, $3)
       RETURNING id, document_number, full_name, email, created_at`,
      [document_number, full_name, email || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === PG_UNIQUE_VIOLATION) {
      return res.status(409).json({
        error: 'Ya existe un cliente con ese document_number',
        constraint: err.constraint
      });
    }
    next(err);
  }
});

// ---------- Pedidos ----------

app.get('/api/v1/orders', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT o.id, o.customer_id, c.full_name AS customer_name, o.total, o.status,
              o.external_reference, o.created_at
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
       ORDER BY o.id`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

app.post('/api/v1/orders', async (req, res, next) => {
  const { customer_id, total, external_reference } = req.body || {};
  if (!customer_id || total === undefined) {
    return res.status(400).json({ error: 'customer_id y total son obligatorios' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO orders (customer_id, total, external_reference)
       VALUES ($1, $2, $3)
       RETURNING id, customer_id, total, status, external_reference, created_at`,
      [customer_id, total, external_reference || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === PG_FOREIGN_KEY_VIOLATION) {
      return res.status(422).json({
        error: 'El customer_id no existe',
        constraint: err.constraint
      });
    }
    if (err.code === PG_CHECK_VIOLATION) {
      return res.status(422).json({ error: 'Datos no válidos', constraint: err.constraint });
    }
    next(err);
  }
});

// ---------- Manejo de errores ----------

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = { app };
