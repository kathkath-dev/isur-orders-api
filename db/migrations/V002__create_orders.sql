-- V002: tabla de pedidos con clave foránea hacia clientes
CREATE TABLE orders (
  id          SERIAL PRIMARY KEY,
  customer_id INTEGER       NOT NULL,
  total       NUMERIC(10,2) NOT NULL,
  status      VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers (id),
  CONSTRAINT ck_orders_total_positive CHECK (total >= 0),
  CONSTRAINT ck_orders_status CHECK (status IN ('PENDING', 'PAID', 'CANCELLED'))
);

CREATE INDEX idx_orders_customer_id ON orders (customer_id);
