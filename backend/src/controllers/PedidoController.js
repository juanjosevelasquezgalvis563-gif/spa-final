import { randomUUID } from "node:crypto";
import { Op } from "sequelize";
import db from "../config/db.js";
import Pedido from "../models/pedidos.js";
import PedidoDetalle from "../models/pedidoDetalles.js";
import Producto from "../models/productos.js";
import Usuario from "../models/Usuario.js";

function leerCantidadesCarrito(lineas) {
    if (!Array.isArray(lineas) || lineas.length === 0 || lineas.length > 30) {
        return { error: "El carrito no contiene productos válidos." };
    }

    const cantidades = new Map();
    for (const linea of lineas) {
        const productoId = Number(linea?.producto_id);
        const cantidad = Number(linea?.cantidad);
        if (!Number.isInteger(productoId) || productoId < 1
            || !Number.isInteger(cantidad) || cantidad < 1 || cantidad > 20
            || cantidades.has(productoId)) {
            return { error: "El carrito contiene productos o cantidades inválidas." };
        }
        cantidades.set(productoId, cantidad);
    }
    return { cantidades };
}

export async function solicitarCompra(req, res) {
    const { cantidades, error: errorCarrito } = leerCantidadesCarrito(req.body?.items);
    if (errorCarrito) return res.status(400).json({ message: errorCarrito });

    const referencia = `JC-SOL-${randomUUID()}`;
    try {
        const pedido = await db.transaction(async (transaction) => {
            const cliente = await Usuario.findByPk(req.user.id, {
                attributes: ["id"],
                transaction,
                lock: transaction.LOCK.UPDATE
            });
            if (!cliente) throw new Error("No se encontró la cuenta del cliente.");

            let totalCentavos = 0;
            const detalles = [];
            for (const [productoId, cantidad] of [...cantidades].sort(([a], [b]) => a - b)) {
                const producto = await Producto.findByPk(productoId, {
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });
                if (!producto || producto.stock < cantidad) {
                    throw new Error(`No hay suficientes unidades disponibles de ${producto?.nombre || "un producto"}.`);
                }

                const precioCentavos = Math.round(Number(producto.precio) * 100);
                const subtotalCentavos = precioCentavos * cantidad;
                if (!Number.isSafeInteger(subtotalCentavos) || subtotalCentavos <= 0) {
                    throw new Error(`El precio de ${producto.nombre} no es válido para procesar la solicitud.`);
                }
                totalCentavos += subtotalCentavos;
                detalles.push({
                    producto_id: producto.id,
                    nombre_producto: producto.nombre,
                    precio_unitario_centavos: precioCentavos,
                    cantidad,
                    subtotal_centavos: subtotalCentavos
                });
            }

            if (!Number.isSafeInteger(totalCentavos) || totalCentavos <= 0
                || totalCentavos > 2_147_483_647) {
                throw new Error("El total del carrito no es válido.");
            }

            const nuevaSolicitud = await Pedido.create({
                referencia,
                usuario_id: req.user.id,
                estado: "REQUESTED",
                total_centavos: totalCentavos,
                moneda: "COP"
            }, { transaction });

            await PedidoDetalle.bulkCreate(detalles.map((detalle) => ({
                pedido_id: nuevaSolicitud.id,
                ...detalle
            })), { transaction });
            return nuevaSolicitud;
        });

        return res.status(201).json({
            message: "Solicitud enviada al salón para confirmación.",
            pedido: pedido.referencia
        });
    } catch (error) {
        if (error.message.startsWith("No hay suficientes unidades")
            || error.message.includes("no es válido")
            || error.message.includes("El total")) {
            return res.status(409).json({ message: error.message });
        }
        console.error("No se pudo registrar la solicitud de compra:", error);
        return res.status(500).json({ message: "No se pudo enviar la solicitud. Inténtalo nuevamente." });
    }
}

export async function solicitudesCompraAdmin(req, res) {
    try {
        const solicitudes = await Pedido.findAll({
            where: {
                estado: { [Op.in]: ["REQUESTED", "CONFIRMED", "REJECTED"] }
            },
            attributes: ["id", "referencia", "estado", "total_centavos", "creado_en"],
            include: [
                {
                    model: Usuario,
                    as: "cliente",
                    attributes: ["nombre", "email", "telefono"]
                },
                {
                    model: PedidoDetalle,
                    as: "detalles",
                    attributes: ["id", "nombre_producto", "cantidad", "subtotal_centavos"]
                }
            ],
            order: [["creado_en", "DESC"]],
            limit: 100
        });
        return res.json(solicitudes);
    } catch (error) {
        console.error("No se pudieron cargar las solicitudes de compra:", error);
        return res.status(500).json({ message: "No se pudieron cargar las solicitudes." });
    }
}

export async function actualizarSolicitudCompra(req, res) {
    const nuevoEstado = req.body?.estado;
    if (!["CONFIRMED", "REJECTED"].includes(nuevoEstado)) {
        return res.status(400).json({ message: "El estado solicitado no es válido." });
    }

    try {
        const resultado = await db.transaction(async (transaction) => {
            const pedido = await Pedido.findByPk(req.params.id, {
                transaction,
                lock: transaction.LOCK.UPDATE
            });
            if (!pedido) return { error: "No se encontró la solicitud.", status: 404 };
            if (pedido.estado !== "REQUESTED") {
                return { error: "Esta solicitud ya fue atendida.", status: 409 };
            }

            if (nuevoEstado === "CONFIRMED") {
                const detalles = await PedidoDetalle.findAll({
                    where: { pedido_id: pedido.id },
                    transaction
                });
                for (const detalle of detalles) {
                    if (detalle.producto_id === null) {
                        return { error: `El producto "${detalle.nombre_producto}" ya no está disponible.`, status: 409 };
                    }
                    const producto = await Producto.findByPk(detalle.producto_id, {
                        attributes: ["id", "nombre", "stock"],
                        transaction,
                        lock: transaction.LOCK.UPDATE
                    });
                    if (!producto || producto.stock < detalle.cantidad) {
                        return { error: `No hay suficientes unidades de "${detalle.nombre_producto}" para confirmar.`, status: 409 };
                    }
                }
            }

            pedido.estado = nuevoEstado;
            await pedido.save({ transaction });
            return { pedido };
        });

        if (resultado.error) {
            return res.status(resultado.status).json({ message: resultado.error });
        }
        return res.json({
            message: nuevoEstado === "CONFIRMED"
                ? "Solicitud confirmada. Contacta al cliente para coordinar la compra."
                : "Solicitud rechazada.",
            pedido: resultado.pedido
        });
    } catch (error) {
        console.error("No se pudo actualizar la solicitud de compra:", error);
        return res.status(500).json({ message: "No se pudo actualizar la solicitud." });
    }
}
