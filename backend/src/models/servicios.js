import { DataTypes } from "sequelize";
import db from "../config/db.js";

const Servicio = db.define('Servicio',{
    id:{
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },

    nombre:{
        type: DataTypes.STRING,
        allowNull: false
    },

    descripcion:{
        type: DataTypes.STRING,
        allowNull: false
    },

    precio:{
        type: DataTypes.FLOAT,
        allowNull: false
    },

   image:{
    type: DataTypes.STRING,
   },
},{
    tableName: 'servicios',
    timestamps: false
});

export default Servicio;