import { DataTypes } from "sequelize";
import db from "../config/db.js";

const PedidoDetalle = db.define("PedidoDetalle", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    pedido_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    producto_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    nombre_producto: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    precio_unitario_centavos: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    cantidad: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    subtotal_centavos: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    tableName: "pedido_detalles",
    timestamps: false
});

export default PedidoDetalle;
