CREATE TABLE reprogramaciones (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    cita_id INT NOT NULL,
    cliente_id INT NOT NULL,
    empleado_id INT NOT NULL,
    fecha_solicitada DATE NOT NULL,
    hora_solicitada TIME NOT NULL,
    servicio_id INT NOT NULL,
    estado ENUM('pendiente', 'propuesta', 'aceptada', 'rechazada') NOT NULL DEFAULT 'pendiente',
    fecha_propuesta DATE NULL,
    hora_propuesta TIME NULL,
    mensaje TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_reprogramaciones_cita_estado (cita_id, estado),
    INDEX idx_reprogramaciones_empleado_estado (empleado_id, estado)
);

