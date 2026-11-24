import Usuario from "../models/Usuario.js";
import db from "../config/db.js";
import Producto from "../models/productos.js";
import Compra from "../models/compras.js";
import Cita from "../models/citas.js";
import Pago from "../models/pagos.js";
import PagoReserva from "../models/PagoReserva.js";
import Servicio from "../models/servicios.js";
import { adminProfileCookieOptions, authCookieOptions } from "../config/cookies.js";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { PRODUCT_IMAGES_DIR } from "../config/productImages.js";
import { Op } from 'sequelize';

const ROLES_PERFIL_ADMIN = ['empleado', 'cliente'];

export async function perfilesAdmin(req, res) {
    try {
        const rol = req.query.rol || 'empleado';
        if (!ROLES_PERFIL_ADMIN.includes(rol)) {
            return res.status(400).json({ message: 'El rol solicitado no se puede consultar desde este panel.' });
        }

        const usuarios = await Usuario.findAll({
            attributes: ['id', 'nombre', 'telefono', 'email', 'rol'],
            where: { rol },
            order: [['nombre', 'ASC']]
        });

        const perfiles = await Promise.all(usuarios.map(async (usuario) => {
            const campoId = rol === 'empleado' ? 'empleado_id' : 'usuario_id';
            const filtro = { [campoId]: usuario.id };
            const [total, pendientes, confirmadas, finalizadas, canceladas] = await Promise.all([
                Cita.count({ where: filtro }),
                Cita.count({ where: { ...filtro, estado: 'pendiente' } }),
                Cita.count({ where: { ...filtro, estado: 'confirmada' } }),
                Cita.count({ where: { ...filtro, estado: 'finalizada' } }),
                Cita.count({ where: { ...filtro, estado: 'cancelada' } })
            ]);

            return {
                ...usuario.toJSON(),
                resumenCitas: { total, pendientes, confirmadas, finalizadas, canceladas }
            };
        }));

        return res.json(perfiles);
    } catch (error) {
        return res.status(500).json({ message: 'No se pudieron obtener los perfiles.' });
    }
}

export async function activarPerfilAdmin(req, res) {
    try {
        const { id, rol } = req.body;

        if (!id || !ROLES_PERFIL_ADMIN.includes(rol)) {
            res.clearCookie('adminPerfil', authCookieOptions);
            return res.json({ message: 'Perfil administrativo limpiado.' });
        }

        const perfil = await Usuario.findOne({
            attributes: ['id'],
            where: { id, rol }
        });

        if (!perfil) {
            return res.status(404).json({ message: 'No se encontró el perfil seleccionado.' });
        }

        res.cookie('adminPerfil', JSON.stringify({ id: perfil.id, rol }), adminProfileCookieOptions);
        return res.json({ message: 'Perfil seleccionado.' });
    } catch (error) {
        return res.status(500).json({ message: 'No se pudo cargar el perfil seleccionado.' });
    }
}

export async function admin(req, res) {
    try {
        const adminId = req.user.id;

        const admin = await Usuario.findOne({
            attributes: ['id', 'nombre', 'rol'],
            where: {
                id: adminId
            }
        });

        res.json(admin);

    } catch (error) {
        return res.status(500).json({
            error: error.message
        });
    }
}


export async function productosAdmin(req, res) {
    try {

        const productos = await Producto.findAll({
            attributes: ['id', 'image', 'nombre', 'precio', 'stock', 'estado'],

        });
        for (let i = 0; i < productos.length; i++) {
            if (productos[i].stock > 5) {
                productos[i].estado = 'en stock'
            }
            if (productos[i].stock <= 5) {
                productos[i].estado = 'stock bajo'
            }
            if (productos[i].stock <= 0) {
                productos[i].estado = 'sin stock'
            }
        }
        res.json(productos);


    } catch (error) {
        return res.status(401).json({ message: 'no se pudieron obtener los productos' })
    }
}

export async function productosCatalogo(req, res) {
    try {
        const productos = await Producto.findAll({
            attributes: ['id', 'image', 'nombre', 'precio', 'stock'],
            order: [['nombre', 'ASC']]
        });

        return res.json(productos.map((producto) => ({
            id: producto.id,
            image: producto.image,
            nombre: producto.nombre,
            precio: producto.precio,
            disponible: producto.stock > 0
        })));
    } catch (error) {
        console.error('No se pudo obtener el catálogo de productos:', error);
        return res.status(500).json({ message: 'No se pudo cargar el catálogo de productos.' });
    }
}

export async function productosCreate(req, res) {
    const nombre = typeof req.body.nombre === "string" ? req.body.nombre.trim() : "";
    const precio = Number(req.body.precio);
    const stock = Number(req.body.stock);
    const file = req.file;

    if (!nombre || !Number.isFinite(precio) || precio < 0 || !Number.isInteger(stock) || stock < 0) {
        return res.status(400).json({
            message: "Ingresa un nombre, un precio válido y un stock entero igual o mayor a cero."
        });
    }

    if (!file) {
        return res.status(400).json({
            message: "Selecciona una imagen PNG, JPG o WEBP de hasta 5 MB."
        });
    }

    const imagen = file.buffer;
    const esJpeg = imagen[0] === 0xff && imagen[1] === 0xd8 && imagen[2] === 0xff;
    const esPng = imagen.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const esWebp = imagen.toString("ascii", 0, 4) === "RIFF"
        && imagen.toString("ascii", 8, 12) === "WEBP";
    const extension = esJpeg ? ".jpg" : esPng ? ".png" : esWebp ? ".webp" : null;

    if (!extension) {
        return res.status(400).json({
            message: "El archivo no es una imagen PNG, JPG o WEBP válida."
        });
    }

    const fileName = `${randomUUID()}${extension}`;
    const imagePath = path.join(PRODUCT_IMAGES_DIR, fileName);
    let imageSaved = false;

    try {
        await mkdir(PRODUCT_IMAGES_DIR, { recursive: true });
        await writeFile(imagePath, file.buffer, { flag: "wx" });
        imageSaved = true;

        const producto = await Producto.create({
            image: `/uploads/products/${fileName}`,
            nombre,
            precio,
            stock,
            estado: stock > 5 ? "en stock" : stock > 0 ? "stock bajo" : "sin stock"
        });

        return res.status(201).json({
            message: "Producto agregado correctamente.",
            producto
        });
    } catch (error) {
        console.error("No se pudo crear el producto:", error);

        if (imageSaved) {
            try {
                await unlink(imagePath);
            } catch (cleanupError) {
                if (cleanupError.code !== "ENOENT") {
                    console.error("No se pudo limpiar la imagen del producto:", cleanupError);
                }
            }
        }

        return res.status(500).json({
            message: "No se pudo guardar el producto. Inténtalo nuevamente."
        });
    }
}


export async function productosUpdate(req, res) {
    try {
        const id = req.params.id;
        const { nombre: nombreBody, precio: precioBody, stock: stockBody } = req.body;
        const nombre = typeof nombreBody === "string" ? nombreBody.trim() : "";
        const precio = Number(precioBody);
        const stock = Number(stockBody);

        if (!nombre || precioBody === "" || precioBody === undefined || precioBody === null
            || !Number.isFinite(precio) || precio < 0 || stockBody === "" || stockBody === undefined
            || stockBody === null || !Number.isInteger(stock) || stock < 0) {
            return res.status(400).json({
                message: 'Ingresa un nombre, un precio válido y un stock entero igual o mayor a cero.'
            });
        }
        const productos = await Producto.findOne({
            where: {
                id: id
            }
        });
        if (!productos) {
            return res.status(401).json({ message: 'El producto no existe' })
        }
        await Producto.update(
            {
                nombre: nombre,
                precio: precio,
                stock: stock,
                estado: stock > 5 ? "en stock" : stock > 0 ? "stock bajo" : "sin stock"
            },

            {
                where: {
                    id: id
                }
            }


        );
        return res.status(200).json({ message: 'Producto actualizado correctamente' })

    } catch (error) {
        return res.status(401).json({ message: 'no se pudo actualizar el producto' })
    }
}

export async function descontarStockProducto(req, res) {
    const cantidad = Number(req.body?.cantidad);
    if (!Number.isInteger(cantidad) || cantidad < 1) {
        return res.status(400).json({ message: 'Ingresa una cantidad entera mayor que cero.' });
    }

    try {
        const resultado = await db.transaction(async (transaction) => {
            const producto = await Producto.findByPk(req.params.id, {
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!producto) return { error: 'El producto no existe.', status: 404 };
            if (producto.stock < cantidad) {
                return { error: `No puedes descontar ${cantidad} unidades; solo hay ${producto.stock}.`, status: 409 };
            }

            producto.stock -= cantidad;
            producto.estado = producto.stock > 5
                ? 'en stock'
                : producto.stock > 0
                    ? 'stock bajo'
                    : 'sin stock';
            await producto.save({ transaction });

            return { producto };
        });

        if (resultado.error) {
            return res.status(resultado.status).json({ message: resultado.error });
        }

        return res.json({
            message: `Se descontaron ${cantidad} unidades de ${resultado.producto.nombre}.`,
            producto: resultado.producto
        });
    } catch (error) {
        console.error('No se pudo descontar el stock del producto:', error);
        return res.status(500).json({ message: 'No se pudo descontar el stock.' });
    }
}


export async function productosDelete(req, res) {
    try {
        const id = req.params.id;
        const productos = await Producto.findOne({
            where: {
                id: id
            },
        });
        if (!productos) {
            return res.status(401).json({ message: 'El producto no existe' })
        }
        await Producto.destroy({
            where: {
                id: id
            }
        })
        return res.status(200).json({ message: 'Producto eliminado correctamente' })
    } catch (error) {
        return res.status(500).json({ message: 'Error al eliminar el producto' })
    }
}



export async function comprasAdmin(req, res) {
    try {

        const { producto_id, fecha, cantidad, precio_compra } = req.body;

        if (!producto_id || !fecha || !cantidad || !precio_compra) {
            return res.status(400).json({
                message: 'Todos los campos son obligatorios'
            });
        }

        const producto = await Producto.findOne({
            attributes: ['id', 'stock'],
            where: {
                id: producto_id
            }
        });

        if (!producto) {
            return res.status(404).json({
                message: 'El producto no existe'
            });
        }

        const compra = await Compra.create({
            producto_id,
            fecha,
            cantidad,
            precio_compra,
            total: precio_compra * cantidad
        });

        producto.stock = producto.stock + cantidad;

        await producto.save();

        return res.status(201).json({
            message: 'Compra realizada correctamente',
            compra,
            stock_actual: producto.stock
        });

    } catch (error) {



        return res.status(500).json({
            message: 'No se pudo realizar la compra'
        });
    }
}

export async function historialCompras(req, res) {
    try {
        const historial = await Compra.findAll({
            include: [
                {
                    model: Producto,
                    attributes: ['nombre']
                }

            ],
            order: [
                ['fecha', 'DESC']
            ]
        });
        return res.json(historial)

    } catch (error) {
        return res.status(500).json({
            message: 'No se pudo obtener el historial de compras'
        });
    }
}

const dinero = (valor) => Math.round((Number(valor) || 0) * 100) / 100;
const montoOnlineReserva = (reserva) => {
    const pagado = dinero(reserva?.monto_pagado);
    return pagado > 0
        ? pagado
        : Math.max(0, dinero(reserva?.monto_reserva) - dinero(reserva?.monto_credito));
};

function resumirMovimientosPago(pagos, reservas, citaId) {
    const movimientos = pagos.filter((pago) => Number(pago.cita_id) === Number(citaId));
    const reservasCita = reservas.filter((reserva) => Number(reserva.cita_id) === Number(citaId));
    let montoOnlineEnPagos = 0;
    let montoLocal = 0;

    for (const pago of movimientos) {
        const online = dinero(pago.monto_online);
        const local = dinero(pago.monto_local);
        if (online > 0 || local > 0) {
            montoOnlineEnPagos += online;
            montoLocal += local;
        } else if (pago.medio_pago === 'online') {
            // Compatibilidad con movimientos online antiguos guardados antes
            // de que el desglose monto_online/monto_local estuviera poblado.
            montoOnlineEnPagos += dinero(pago.total_pago);
        } else {
            // Los registros antiguos sin desglose se registraban en caja.
            montoLocal += dinero(pago.total_pago);
        }
    }

    const creditoAplicado = reservasCita.reduce((suma, reserva) => suma + dinero(reserva.monto_credito), 0);
    const montoOnlineEnReservas = reservasCita.reduce((suma, reserva) => suma + montoOnlineReserva(reserva), 0);
    // Las dos tablas pueden representar el mismo cobro online. Se toma el
    // mayor agregado para recuperar datos antiguos sin duplicar el ingreso.
    const montoOnline = Math.max(montoOnlineEnPagos, montoOnlineEnReservas);
    return { monto_online: dinero(montoOnline), monto_local: dinero(montoLocal), credito_aplicado: creditoAplicado };
}

async function cargarMovimientosCitas(citaIds, transaction) {
    if (!citaIds.length) return { pagos: [], reservas: [] };
    const [pagos, reservas] = await Promise.all([
        Pago.findAll({ where: { cita_id: { [Op.in]: citaIds }, estado_pago: 'pagada' }, raw: true, transaction }),
        PagoReserva.findAll({
            where: { cita_id: { [Op.in]: citaIds }, estado: 'aprobado' },
            attributes: ['id', 'cita_id', 'monto_reserva', 'monto_pagado', 'monto_credito'], raw: true, transaction
        })
    ]);
    return { pagos, reservas };
}

export async function citasFinalizadasParaPago(req, res) {
    if (!['administrador', 'empleado'].includes(req.user?.rol)) {
        return res.status(403).json({ message: 'No tienes permiso para consultar estas citas.' });
    }
    try {
        const where = { estado: 'finalizada' };
        if (req.user.rol === 'empleado') where.empleado_id = req.user.id;
        const citas = await Cita.findAll({
            where,
            attributes: ['id', 'usuario_id', 'empleado_id', 'servicio_id', 'fecha', 'hora', 'estado', 'precio_original', 'descuento_porcentaje', 'descuento_valor', 'precio_final'],
            include: [
                { model: Usuario, as: 'cliente', attributes: ['id', 'nombre'], required: false },
                { model: Usuario, as: 'empleado', attributes: ['id', 'nombre'], required: false },
                { model: Servicio, attributes: ['id', 'nombre', 'precio'], required: false }
            ],
            order: [['fecha', 'DESC'], ['hora', 'DESC']]
        });
        const ids = citas.map((cita) => Number(cita.id));
        const { pagos, reservas } = await cargarMovimientosCitas(ids);
        const citasConSaldo = citas.map((cita) => {
            const item = cita.toJSON();
            const precioOriginal = dinero(item.precio_original ?? item.Servicio?.precio);
            const descuento = dinero(item.descuento_valor);
            const precioFinal = dinero(item.precio_final ?? Math.max(0, precioOriginal - descuento));
            const resumen = resumirMovimientosPago(pagos, reservas, item.id);
            const saldoPendiente = Math.max(0, dinero(precioFinal - resumen.monto_online - resumen.monto_local - resumen.credito_aplicado));
            return {
                ...item, precio_original: precioOriginal, descuento_valor: descuento, precio_final: precioFinal,
                monto_online: resumen.monto_online, monto_local: saldoPendiente,
                monto_local_recibido: resumen.monto_local,
                credito_aplicado: resumen.credito_aplicado, saldo_pendiente: saldoPendiente,
                pago_completo: saldoPendiente <= 0
            };
        }).filter((cita) => !cita.pago_completo);

        return res.json(citasConSaldo);
    } catch (error) {
        console.error('No se pudieron cargar las citas finalizadas para pagos:', error);
        return res.status(500).json({ message: 'No se pudieron cargar las citas finalizadas.' });
    }
}

export async function registrarPago(req, res) {
    if (!['administrador', 'empleado'].includes(req.user?.rol)) {
        return res.status(403).json({ message: 'No tienes permiso para registrar pagos.' });
    }
    const citaId = Number(req.body?.cita_id);
    const fechaEntrada = req.body?.fecha_pago;
    if (!Number.isInteger(citaId) || citaId <= 0 || !fechaEntrada) {
        return res.status(400).json({ message: 'Selecciona una cita y la fecha del pago.' });
    }
    const fecha = /^\d{4}-\d{2}-\d{2}$/.test(String(fechaEntrada))
        ? new Date(String(fechaEntrada) + 'T12:00:00')
        : new Date(fechaEntrada);
    if (Number.isNaN(fecha.getTime())) return res.status(400).json({ message: 'La fecha del pago no es v?lida.' });

    try {
        const pago = await db.transaction(async (transaction) => {
            const whereCita = { id: citaId, estado: 'finalizada' };
            if (req.user.rol === 'empleado') whereCita.empleado_id = req.user.id;
            const cita = await Cita.findOne({ where: whereCita, transaction, lock: transaction.LOCK.UPDATE });
            if (!cita) throw Object.assign(new Error('La cita no existe, no est? finalizada o no te pertenece.'), { status: 404 });
            const servicio = await Servicio.findByPk(cita.servicio_id, { transaction });
            if (!servicio) throw Object.assign(new Error('No se encontr? el servicio asociado a la cita.'), { status: 404 });

            const precioOriginal = dinero(cita.precio_original ?? servicio.precio);
            const descuento = dinero(cita.descuento_valor);
            const precioFinal = dinero(cita.precio_final ?? Math.max(0, precioOriginal - descuento));
            const { pagos, reservas } = await cargarMovimientosCitas([cita.id], transaction);
            const resumen = resumirMovimientosPago(pagos, reservas, cita.id);
            const saldoPendiente = Math.max(0, dinero(precioFinal - resumen.monto_online - resumen.monto_local - resumen.credito_aplicado));
            const montoLocal = req.body?.monto_local == null && req.body?.total_pago == null
                ? saldoPendiente
                : dinero(req.body.monto_local ?? req.body.total_pago);

            if (!Number.isFinite(montoLocal) || montoLocal <= 0) {
                throw Object.assign(new Error('El monto local debe ser mayor que cero.'), { status: 400 });
            }
            if (montoLocal > saldoPendiente) {
                throw Object.assign(new Error('El saldo pendiente es de $' + saldoPendiente.toLocaleString('es-CO') + ' COP.'), { status: 400 });
            }
            const onlineTotal = resumen.monto_online;
            const localTotal = dinero(resumen.monto_local + montoLocal);
            const pagoPrincipal = pagos.find((movimiento) =>
                Number(movimiento.cita_id) === Number(cita.id) &&
                (dinero(movimiento.monto_online) > 0 || movimiento.medio_pago === 'online')
            ) || pagos.find((movimiento) => Number(movimiento.cita_id) === Number(cita.id));
            const datosPago = {
                usuario_id: cita.usuario_id,
                servicio_id: cita.servicio_id,
                cita_id: cita.id,
                total_pago: dinero(onlineTotal + localTotal),
                monto_online: onlineTotal,
                monto_local: localTotal,
                medio_pago: onlineTotal > 0 ? 'online' : 'local',
                fecha_pago: fecha,
                estado_pago: 'pagada'
            };

            if (pagoPrincipal) {
                const pagoPersistido = await Pago.findByPk(pagoPrincipal.id, {
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });
                if (pagoPersistido) {
                    await pagoPersistido.update(datosPago, { transaction });
                    return pagoPersistido;
                }
            }
            return Pago.create(datosPago, { transaction });
        });
        return res.status(201).json({ message: 'Pago local registrado correctamente.', pago });
    } catch (error) {
        console.error('Error al registrar el pago local:', error);
        return res.status(error.status || 500).json({ message: error.status ? error.message : 'No se pudo registrar el pago.' });
    }
}

export async function historialPagos(req, res) {
    if (req.user?.rol !== 'administrador') {
        return res.status(403).json({ message: 'No tienes permiso para consultar el historial de pagos.' });
    }
    try {
        const [pagos, reservas] = await Promise.all([
            Pago.findAll({
                include: [{ model: Cita, as: 'cita', required: false, include: [
                    { model: Usuario, as: 'cliente', attributes: ['id', 'nombre'] },
                    { model: Usuario, as: 'empleado', attributes: ['id', 'nombre'] },
                    { model: Servicio, attributes: ['id', 'nombre', 'precio'] }
                ] }],
                order: [['fecha_pago', 'DESC']]
            }),
            PagoReserva.findAll({
                where: { estado: { [Op.in]: ['aprobado', 'aprobado_abono'] } },
                include: [
                    { model: Usuario, as: 'cliente', attributes: ['id', 'nombre'] },
                    { model: Usuario, as: 'empleado', attributes: ['id', 'nombre'] },
                    { model: Servicio, attributes: ['id', 'nombre', 'precio'] }
                ],
                order: [['updated_at', 'DESC']]
            })
        ]);
        const filasPago = await Promise.all(pagos.map(async (instancia) => {
            const pago = instancia.toJSON();
            let online = dinero(pago.monto_online);
            let local = dinero(pago.monto_local);
            const camposActualizar = {};
            if (online === 0 && pago.medio_pago === 'online' && dinero(pago.total_pago) > 0) {
                online = dinero(pago.total_pago);
                camposActualizar.monto_online = online;
            }
            if (local === 0 && pago.medio_pago === 'local' && dinero(pago.total_pago) > 0) {
                local = dinero(pago.total_pago);
                camposActualizar.monto_local = local;
            }
            if (Object.keys(camposActualizar).length) {
                await instancia.update(camposActualizar);
            }
            if (online === 0 && local === 0) local = dinero(pago.total_pago);
            return {
                ...pago, monto_online: online, monto_local: local, total_pago: dinero(pago.total_pago),
                tipo_pago: online > 0 && local === 0 ? 'Pago online' : 'Pago local'
            };
        }));
        const citasConMovimientoOnline = new Set(filasPago.filter((p) => p.monto_online > 0).map((p) => Number(p.cita_id)));
    
        for (const reserva of reservas) {
            const citaId = Number(reserva.cita_id);
            const montoOnline = montoOnlineReserva(reserva);
            if (reserva.estado !== 'aprobado' || !citaId || montoOnline <= 0) {
                continue;
            }
            const pagoOnlineExistente = filasPago.find((pago) =>
                Number(pago.cita_id) === citaId && pago.medio_pago === 'online'
            );
            if (pagoOnlineExistente) {
                if (dinero(pagoOnlineExistente.monto_online) <= 0) {
                    await Pago.update({
                        total_pago: montoOnline,
                        monto_online: montoOnline,
                        monto_local: 0
                    }, { where: { id: pagoOnlineExistente.id } });
                    pagoOnlineExistente.total_pago = montoOnline;
                    pagoOnlineExistente.monto_online = montoOnline;
                    pagoOnlineExistente.monto_local = 0;
                    pagoOnlineExistente.tipo_pago = 'Pago online';
                }
                citasConMovimientoOnline.add(citaId);
                continue;
            }
            if (citasConMovimientoOnline.has(citaId)) continue;
            const pagoOnline = await Pago.create({
                usuario_id: reserva.usuario_id,
                servicio_id: reserva.servicio_id,
                cita_id: citaId,
                total_pago: montoOnline,
                monto_online: montoOnline,
                monto_local: 0,
                medio_pago: 'online',
                fecha_pago: reserva.updated_at,
                estado_pago: 'pagada'
            });
            filasPago.push({
                ...pagoOnline.toJSON(),
                monto_online: montoOnline,
                monto_local: 0,
                total_pago: montoOnline,
                tipo_pago: 'Pago online'
            });
            citasConMovimientoOnline.add(citaId);
        }
        const resumenPorCita = new Map();
        for (const pago of filasPago) {
            if (!pago.cita_id) continue;
            const id = Number(pago.cita_id);
            const resumen = resumenPorCita.get(id) || { online: 0, local: 0, credito: 0 };
            resumen.online += pago.monto_online;
            resumen.local += pago.monto_local;
            resumenPorCita.set(id, resumen);
        }
        for (const reserva of reservas) {
            if (!reserva.cita_id) continue;
            const id = Number(reserva.cita_id);
            const resumen = resumenPorCita.get(id) || { online: 0, local: 0, credito: 0 };
            if (!citasConMovimientoOnline.has(id)) resumen.online += montoOnlineReserva(reserva);
            if (reserva.estado === 'aprobado') resumen.credito += dinero(reserva.monto_credito);
            resumenPorCita.set(id, resumen);
        }
        for (const [id, resumen] of resumenPorCita) {
            const cita = filasPago.find((pago) => Number(pago.cita_id) === id)?.cita;
            const reserva = reservas.find((pago) => Number(pago.cita_id) === id);
            const precioOriginal = dinero(cita?.precio_original ?? reserva?.precio_original ?? cita?.Servicio?.precio ?? reserva?.Servicio?.precio);
            const descuento = dinero(cita?.descuento_valor ?? reserva?.descuento_valor);
            const precioFinal = dinero(cita?.precio_final ?? Math.max(0, precioOriginal - descuento));
            resumenPorCita.set(id, Math.max(0, dinero(precioFinal - resumen.online - resumen.local - resumen.credito)));
        }
        const filasReserva = reservas
            .filter((reserva) => !reserva.cita_id || !citasConMovimientoOnline.has(Number(reserva.cita_id)))
            .filter((reserva) => montoOnlineReserva(reserva) > 0)
            .map((reserva) => ({
                id: 'reserva-' + reserva.id, cita_id: reserva.cita_id, fecha_pago: reserva.updated_at,
                total_pago: montoOnlineReserva(reserva), monto_online: montoOnlineReserva(reserva), monto_local: 0,
                estado_pago: reserva.estado === 'aprobado' ? 'pagada' : 'abono disponible',
                tipo_pago: 'Reserva online (Wompi)',
                credito_aplicado: reserva.estado === 'aprobado' ? dinero(reserva.monto_credito) : 0,
                cita: {
                    cliente: reserva.cliente, empleado: reserva.empleado, Servicio: reserva.Servicio,
                    fecha: reserva.fecha_reserva, hora: reserva.hora_reserva,
                    precio_original: dinero(reserva.precio_original),
                    descuento_valor: dinero(reserva.descuento_valor),
                    precio_final: Math.max(0, dinero(reserva.precio_original) - dinero(reserva.descuento_valor))
                }
            }));
        return res.json([...filasPago, ...filasReserva].map((pago) => ({
            ...pago,
            saldo_pendiente_local: pago.cita_id ? (resumenPorCita.get(Number(pago.cita_id)) || 0) : 0
        }))
            .sort((a, b) => new Date(b.fecha_pago).getTime() - new Date(a.fecha_pago).getTime()));
    } catch (error) {
        console.error('Error al consultar historial de pagos:', error);
        return res.status(500).json({ message: 'No se pudo cargar el historial de pagos.' });
    }
}
