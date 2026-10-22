import { DataTypes } from "sequelize";
import db from "../config/db.js";

const RecordatorioCita = db.define("RecordatorioCita", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    cita_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true
    },
    enviado_en: {
        type: DataTypes.DATE,
        allowNull: false
    }
}, {
    tableName: "recordatorios_citas",
    timestamps: false
});

export default RecordatorioCita;