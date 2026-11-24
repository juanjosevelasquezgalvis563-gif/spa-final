import { DataTypes } from "sequelize";
import db from "../config/db.js";


const ReporteMensual = db.define("ReporteMensual", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    anio: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    mes: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    datos: {
        type: DataTypes.TEXT,
        allowNull: false,
        get() {
            const valor = this.getDataValue("datos");
            return valor ? JSON.parse(valor) : null;
        },
        set(valor) {
            this.setDataValue("datos", JSON.stringify(valor));
        }
    },
    generado_en: {
        type: DataTypes.DATE,
        allowNull: false
    },
    enviado_en: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: "reportes_mensuales",
    timestamps: false,
    indexes: [
        { unique: true, name: "uq_reporte_periodo", fields: ["anio", "mes"] }
    ]
});


ReporteMensual.sync().catch((error) => {
    console.error("[reportes] No se pudo crear/verificar la tabla reportes_mensuales:", error);
});

export default ReporteMensual;
