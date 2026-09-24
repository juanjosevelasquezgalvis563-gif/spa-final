import { DataTypes } from "sequelize";
import db from "../config/db.js";

const Usuario = db.define("Usuario", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },

    nombre: {
        type: DataTypes.STRING,
        allowNull: false
    },

    telefono: {
        type: DataTypes.STRING,
        allowNull: false
    },

    email: {
        type: DataTypes.STRING,
        allowNull: false
    },

    password: {
        type: DataTypes.STRING,
        allowNull: false
    },

    rol: {
        type: DataTypes.ENUM("cliente", "empleado", "administrador"),
        allowNull: false
    }
}, {
    tableName: "usuarios",
    timestamps: false
});

export default Usuario;