import { DataTypes } from 'sequelize';
import db from '../config/db.js';

const Compra = db.define('Compra',{
    id:{
        type:DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },

    producto_id:{
        type: DataTypes.INTEGER,
        allowNull: false
    },

    fecha:{
        type: DataTypes.DATE,
        allowNull: false
    },

    cantidad:{
        type: DataTypes.INTEGER,
        allowNull: false
    },

    precio_compra:{
        type:DataTypes.DECIMAL(10,2),
        allowNull: false
    },
    
    total:{
        type:DataTypes.DECIMAL(10,2),
    }
},{
    tableName: 'compras',
    timestamps: false
});

export default Compra;