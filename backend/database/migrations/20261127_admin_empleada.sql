-- Run once against the production MySQL database before deploying this change.
-- Keeps Luz Mariela's administrator role and grants her employee capabilities.
ALTER TABLE usuarios
    ADD COLUMN es_empleado TINYINT(1) NOT NULL DEFAULT 0;

UPDATE usuarios
SET es_empleado = 1
WHERE rol = 'administrador'
  AND LOWER(TRIM(nombre)) = 'luz mariela';