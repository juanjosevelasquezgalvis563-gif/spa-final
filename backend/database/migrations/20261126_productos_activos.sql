-- Conserva las compras históricas cuando un producto se retira del inventario.
ALTER TABLE productos
    ADD COLUMN activo TINYINT(1) NOT NULL DEFAULT 1;
