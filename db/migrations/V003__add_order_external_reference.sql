-- V003: nueva columna NULLABLE (patrón expand/contract).
-- Al permitir NULL, la versión anterior de la API sigue funcionando
-- mientras se despliega la nueva versión que usa este campo.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS external_reference VARCHAR(50);
