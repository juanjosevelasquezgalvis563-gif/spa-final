import { DataTypes } from "sequelize";
import db from "../config/db.js";

const PagoReserva = db.define("PagoReserva", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    cita_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    usuario_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    empleado_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    servicio_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    fecha_reserva: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    hora_reserva: {
        type: DataTypes.TIME,
        allowNull: false
    },
    monto_reserva: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    monto_credito: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    monto_pagado: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    referencia: {
        type: DataTypes.STRING(80),
        allowNull: false,
        unique: true
    },
    transaction_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
        unique: true
    },
    estado: {
        type: DataTypes.ENUM(
            "pendiente",
            "aprobado",
            "rechazado",
            "error",
            "anulado",
            "expirado",
            "aprobado_abono"
        ),
        allowNull: false,
        defaultValue: "pendiente"
    },
    expira_en: {
        type: DataTypes.DATE,
        allowNull: false
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: false
    }
}, {
    tableName: "pagos_reserva",
    timestamps: false
});

export default PagoReserva;
