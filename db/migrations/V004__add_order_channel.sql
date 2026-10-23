ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS channel VARCHAR(20);

ALTER TABLE orders
  ADD CONSTRAINT ck_orders_channel
  CHECK (channel IS NULL OR channel IN ('WEB','MOBILE','BACKOFFICE'));