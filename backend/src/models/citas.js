
import { DataTypes } from "sequelize";
import db from "../config/db.js";

const Cita = db.define("Cita", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },

    fecha: {
        type: DataTypes.DATE,
        allowNull: false
    },

    hora: {
        type: DataTypes.TIME,
        allowNull: false
    },

    usuario_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },

    empleado_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },

    servicio_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },

    precio_original: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0
    },

    descuento_porcentaje: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },

    descuento_valor: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },

    precio_final: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0
    },

    inicio_atencion: {
        type: DataTypes.DATE,
        allowNull: true
    },

    fin_atencion: {
        type: DataTypes.DATE,
        allowNull: true
    },

    estado: {
        type: DataTypes.ENUM(
            "pendiente",
            "confirmada",
            "en_curso",
            "cancelada",
            "finalizada"
        ),
        allowNull: false
    }

}, {
    tableName: "citas",
    timestamps: false
});

export default Cita;
