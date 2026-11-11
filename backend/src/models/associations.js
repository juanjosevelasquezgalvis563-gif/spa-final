import Usuario from "./Usuario.js";
import Cita from "./citas.js";
import Servicio from "./servicios.js";
import Producto from "./productos.js";
import Compra from "./compras.js";
import Pedido from "./pedidos.js";
import PedidoDetalle from "./pedidoDetalles.js";
import PasswordReset from "./password_resets.js";
import Resena from "./reseña.js";


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

Cita.hasOne(Resena, {
    foreignKey: "cita_id",
    as: "resena"
});

Resena.belongsTo(Cita, {
    foreignKey: "cita_id",
    as: "cita"
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

Usuario.hasMany(Pedido, {
    foreignKey: "usuario_id",
    as: "pedidos"
});

Pedido.belongsTo(Usuario, {
    foreignKey: "usuario_id",
    as: "cliente"
});

Pedido.hasMany(PedidoDetalle, {
    foreignKey: "pedido_id",
    as: "detalles"
});

PedidoDetalle.belongsTo(Pedido, {
    foreignKey: "pedido_id"
});

PedidoDetalle.belongsTo(Producto, {
    foreignKey: "producto_id"
});
