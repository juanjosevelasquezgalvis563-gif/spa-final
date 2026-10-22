import db from "../config/db.js";
import { DataTypes } from "sequelize";

const Resena = db.define("Resena", {
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
        allowNull: false,
        unique: true
    },

    calificacion: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1,
            max: 5,
            isInt: true
        }
    },

    comentario: {
        type: DataTypes.TEXT,
        allowNull: true
    },

    estado: {
        type: DataTypes.ENUM("visible", "oculta"),
        allowNull: false,
        defaultValue: "visible"
    },

    fecha_creacion: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: "resenas",
    timestamps: false
});

export default Resena;