import { DataTypes } from 'sequelize';
import db from '../config/db.js';

const Pago = db.define('Pago', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    usuario_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    servicio_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    total_pago: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    fecha_pago: {
        type: DataTypes.DATE,
        allowNull: false
    },
    estado_pago: {
        type: DataTypes.ENUM('pendiente', 'pagada'),
        allowNull: false,
        defaultValue: 'pendiente'
    },
    cita_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'pagos',
    timestamps: false
});

export default Pago;