import { DataTypes } from "sequelize";
import db from "../config/db.js";

const MovimientoPuntos = db.define("MovimientoPuntos", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },

    usuario_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },

    cita_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        unique: true
    },

    resena_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        unique: true
    },

    tipo: {
        type: DataTypes.ENUM("acumulacion", "canje", "ajuste"),
        allowNull: false
    },

    puntos: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1,
            isInt: true
        }
    },

    descripcion: {
        type: DataTypes.STRING(255),
        allowNull: true
    },

    fecha_creacion: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: "movimientos_puntos",
    timestamps: false
});

export default MovimientoPuntos;
