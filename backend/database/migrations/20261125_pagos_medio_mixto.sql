ALTER TABLE pagos
    MODIFY COLUMN medio_pago ENUM('online', 'local', 'mixto') NOT NULL;

UPDATE pagos
SET medio_pago = 'mixto'
WHERE monto_online > 0
  AND monto_local > 0
  AND medio_pago <> 'mixto';
