import Usuario from "./Usuario.js";
import Cita from "./citas.js";
import Servicio from "./servicios.js";
import Producto from "./productos.js";
import Compra from "./compras.js";
import PasswordReset from "./password_resets.js";


Usuario.hasMany(Cita, {
    foreignKey: "usuario_id",
    as: "citasComoCliente"
});


Cita.belongsTo(Usuario, {
    foreignKey: "usuario_id",
    as: "cliente"
});



Usuario.hasMany(Cita, {
    foreignKey: "empleado_id",
    as: "citasComoEmpleado"
});


Cita.belongsTo(Usuario, {
    foreignKey: "empleado_id",
    as: "empleado"
});



Servicio.hasMany(Cita, {
    foreignKey: "servicio_id"
});


Cita.belongsTo(Servicio, {
    foreignKey: "servicio_id"
});


Usuario.hasMany(PasswordReset, {
    foreignKey: "usuario_id",
    as: "recuperaciones"
});


PasswordReset.belongsTo(Usuario, {
    foreignKey: "usuario_id",
    as: "usuario"
});

Producto.hasMany(Compra,{
    foreignKey:'producto_id'
});

Compra.belongsTo(Producto,{
    foreignKey:'producto_id'
});
