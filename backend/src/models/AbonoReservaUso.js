import { DataTypes } from "sequelize";
import db from "../config/db.js";

const AbonoReservaUso = db.define("AbonoReservaUso", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    abono_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    pago_reserva_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    monto: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    restaurado_en: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: "abonos_reserva_usos",
    timestamps: false,
    indexes: [{
        unique: true,
        fields: ["abono_id", "pago_reserva_id"]
    }]
});

export default AbonoReservaUso;
