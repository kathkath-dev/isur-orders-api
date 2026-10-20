-- Datos de demostración SOLO para entornos locales.
INSERT INTO customers (document_number, full_name, email) VALUES
  ('10000001', 'Ana Torres',   'ana@example.test'),
  ('10000002', 'Luis Mamani',  'luis@example.test'),
  ('10000003', 'Rosa Condori', 'rosa@example.test')
ON CONFLICT (document_number) DO NOTHING;

INSERT INTO orders (customer_id, total, status)
SELECT c.id, v.total, v.status
FROM (VALUES
  ('10000001', 150.00, 'PAID'),
  ('10000002',  89.90, 'PENDING'),
  ('10000003', 230.50, 'PENDING')
) AS v(document_number, total, status)
JOIN customers c ON c.document_number = v.document_number
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);
