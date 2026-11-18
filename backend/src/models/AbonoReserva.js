import { DataTypes } from "sequelize";
import db from "../config/db.js";

const AbonoReserva = db.define("AbonoReserva", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    usuario_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    pago_reserva_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true
    },
    monto_original: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    saldo: {
        type: DataTypes.INTEGER,
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
    tableName: "abonos_reserva",
    timestamps: false
});

export default AbonoReserva;
