ALTER TABLE citas
    ADD COLUMN correo_confirmacion_estado ENUM('pendiente', 'enviado', 'fallido') NULL DEFAULT NULL;
 