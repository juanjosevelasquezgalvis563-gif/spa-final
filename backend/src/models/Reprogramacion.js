import { DataTypes } from "sequelize";
import db from "../config/db.js";

const Reprogramacion = db.define("Reprogramacion", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    cita_id: { type: DataTypes.INTEGER, allowNull: false },
    cliente_id: { type: DataTypes.INTEGER, allowNull: false },
    empleado_id: { type: DataTypes.INTEGER, allowNull: false },
    fecha_solicitada: { type: DataTypes.DATEONLY, allowNull: false },
    hora_solicitada: { type: DataTypes.TIME, allowNull: false },
    servicio_id: { type: DataTypes.INTEGER, allowNull: false },
    estado: { type: DataTypes.ENUM("pendiente", "propuesta", "aceptada", "rechazada"), allowNull: false, defaultValue: "pendiente" },
    fecha_propuesta: { type: DataTypes.DATEONLY, allowNull: true },
    hora_propuesta: { type: DataTypes.TIME, allowNull: true },
    mensaje: { type: DataTypes.TEXT, allowNull: true }
}, { tableName: "reprogramaciones", timestamps: true, createdAt: "created_at", updatedAt: "updated_at" });

export default Reprogramacion;

