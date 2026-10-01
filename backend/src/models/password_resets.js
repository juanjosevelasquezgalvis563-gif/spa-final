import { DataTypes } from "sequelize";
import db from "../config/db.js";


const PasswordReset = db.define('PasswordReset', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },

    usuario_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },

    token: {
        type: DataTypes.STRING,
        allowNull: false
    },

    expires_at: {
        type: DataTypes.DATE,
        allowNull: false
    }
}, {
    tableName: 'password_resets',
    timestamps: false
});


export default PasswordReset;