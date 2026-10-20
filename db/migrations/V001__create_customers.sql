-- V001: tabla de clientes
CREATE TABLE customers (
  id              SERIAL PRIMARY KEY,
  document_number VARCHAR(20)  NOT NULL,
  full_name       VARCHAR(120) NOT NULL,
  email           VARCHAR(120),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT uq_customers_document_number UNIQUE (document_number)
);
