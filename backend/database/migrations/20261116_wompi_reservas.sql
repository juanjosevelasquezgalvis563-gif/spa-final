CREATE TABLE pagos_reserva (
    id INT NOT NULL AUTO_INCREMENT,
    cita_id INT NULL,
    usuario_id INT NOT NULL,
    empleado_id INT NOT NULL,
    servicio_id INT NOT NULL,
    fecha_reserva DATE NOT NULL,
    hora_reserva TIME NOT NULL,
    monto_reserva INT NOT NULL,
    monto_credito INT NOT NULL DEFAULT 0,
    monto_pagado INT NOT NULL DEFAULT 0,
    referencia VARCHAR(80) NOT NULL,
    transaction_id VARCHAR(100) NULL,
    estado ENUM(
        'pendiente',
        'aprobado',
        'rechazado',
        'error',
        'anulado',
        'expirado',
        'aprobado_abono'
    ) NOT NULL DEFAULT 'pendiente',
    expira_en DATETIME(3) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_pagos_reserva_referencia (referencia),
    UNIQUE KEY uq_pagos_reserva_transaction (transaction_id),
    KEY ix_pagos_reserva_slot (empleado_id, fecha_reserva, hora_reserva, estado, expira_en),
    KEY ix_pagos_reserva_usuario (usuario_id, estado),
    CONSTRAINT fk_pagos_reserva_cita
        FOREIGN KEY (cita_id) REFERENCES citas (id),
    CONSTRAINT fk_pagos_reserva_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id),
    CONSTRAINT fk_pagos_reserva_empleado
        FOREIGN KEY (empleado_id) REFERENCES usuarios (id),
    CONSTRAINT fk_pagos_reserva_servicio
        FOREIGN KEY (servicio_id) REFERENCES servicios (id)
) ENGINE=InnoDB;

CREATE TABLE abonos_reserva (
    id INT NOT NULL AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    pago_reserva_id INT NOT NULL,
    monto_original INT NOT NULL,
    saldo INT NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_abonos_reserva_pago (pago_reserva_id),
    KEY ix_abonos_reserva_usuario_saldo (usuario_id, saldo),
    CONSTRAINT fk_abonos_reserva_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id),
    CONSTRAINT fk_abonos_reserva_pago
        FOREIGN KEY (pago_reserva_id) REFERENCES pagos_reserva (id)
) ENGINE=InnoDB;

CREATE TABLE abonos_reserva_usos (
    id INT NOT NULL AUTO_INCREMENT,
    abono_id INT NOT NULL,
    pago_reserva_id INT NOT NULL,
    monto INT NOT NULL,
    restaurado_en DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_abonos_reserva_uso (abono_id, pago_reserva_id),
    CONSTRAINT fk_abonos_reserva_usos_abono
        FOREIGN KEY (abono_id) REFERENCES abonos_reserva (id),
    CONSTRAINT fk_abonos_reserva_usos_pago
        FOREIGN KEY (pago_reserva_id) REFERENCES pagos_reserva (id)
) ENGINE=InnoDB;
