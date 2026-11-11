import { DataTypes } from "sequelize";
import db from "../config/db.js";

const Pedido = db.define("Pedido", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    referencia: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
    },
    usuario_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    estado: {
        type: DataTypes.ENUM(
            "REQUESTED",
            "CONFIRMED",
            "REJECTED"
        ),
        allowNull: false,
        defaultValue: "REQUESTED"
    },
    total_centavos: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    moneda: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: "COP"
    },
    creado_en: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: "pedidos",
    timestamps: false
});

export default Pedido;
