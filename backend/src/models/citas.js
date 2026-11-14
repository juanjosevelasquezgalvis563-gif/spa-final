import { DataTypes } from "sequelize";
import db from "../config/db.js";




const Cita = db.define('Cita', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },

    fecha: {
        type: DataTypes.DATE,
        allowNull: false
    },

    hora: {
        type: DataTypes.TIME,
        allowNull: false
    },

    usuario_id: {
        type: DataTypes.INTEGER,
    },

    empleado_id: {
        type: DataTypes.INTEGER,
    },

    servicio_id: {
        type: DataTypes.INTEGER,
    },

    inicio_atencion: {
        type: DataTypes.DATE,
        allowNull: true
    },

    fin_atencion: {
        type: DataTypes.DATE,
        allowNull: true
    },

    estado:{
        type: DataTypes.ENUM('pendiente', 'confirmada', 'en_curso', 'cancelada', 'finalizada'),
        allowNull: false

    }
},{
    tableName: 'citas',
    timestamps: false

});

export default Cita;