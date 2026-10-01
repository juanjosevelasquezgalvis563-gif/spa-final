import db from "../config/db.js";
import {DataTypes} from "sequelize";

const Producto = db.define('Producto',{

     id:{
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },

    image:{
        type: DataTypes.STRING,
    },

    nombre:{
        type: DataTypes.STRING,
        allowNull: false
    },

    precio:{
        type: DataTypes.FLOAT,
        allowNull: false
    },

    stock:{
        type: DataTypes.INTEGER,
        allowNull: false
    },

    estado:{
        type: DataTypes.ENUM('en stock','stock bajo','sin stock'),
        allowNull: false    
    }
},{
    tableName: 'productos',
    timestamps: false
});

export default Producto;