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


export async function citasFinalizadasParaPago(req, res) {
    try {
        const usuario = req.user;

        if (!usuario || !["administrador", "empleado"].includes(usuario.rol)) {
            return res.status(403).json({
                message: "No tienes permiso para consultar estas citas."
            });
        }

        const where = {
            estado: "finalizada"
        };

     
        if (usuario.rol === "empleado") {
            where.empleado_id = usuario.id;
        }

        const citas = await Cita.findAll({
            where,
            attributes: [
                "id",
                "usuario_id",
                "empleado_id",
                "servicio_id",
                "fecha",
                "hora",
                "precio_original",
                "descuento_porcentaje",
                "descuento_valor",
                "precio_final"
            ],
            include: [
                {
                    model: Usuario,
                    as: "cliente",
                    attributes: ["id", "nombre"],
                    required: false
                },
                {
                    model: Usuario,
                    as: "empleado",
                    attributes: ["id", "nombre"],
                    required: false
                },
                {
                    model: Servicio,
                    attributes: ["id", "nombre", "precio"],
                    required: false
                },
                {
                    model: PagoReserva,
                    as: "reservasPago",
                    attributes: ["id", "monto_reserva", "estado"],
                    where: {
                        estado: "aprobado"
                    },
                    required: false
                }
            ],
            order: [["fecha", "DESC"]]
        });

        
        const pagos = await Pago.findAll({
            attributes: ["cita_id"],
            where: {
                cita_id: {
                    [Op.ne]: null
                },
                estado_pago: "pagada"
            },
            raw: true
        });

        const citasPagadas = new Set(
            pagos.map(p => Number(p.cita_id))
        );

        const citasPendientes = [];

        for (const cita of citas) {
            if (citasPagadas.has(Number(cita.id))) {
                continue;
            }

            const resultado = cita.toJSON();

            const reserva = (resultado.reservasPago || [])
                .find(p => p.estado === "aprobado") || null;

            const precioOriginal = Number(
                resultado.precio_original ??
                resultado.Servicio?.precio ??
                0
            );

            const descuentoPorcentaje = Number(
                resultado.descuento_porcentaje || 0
            );

            const descuentoValor = Number(
                resultado.descuento_valor || 0
            );

            const precioFinal = Number(
                resultado.precio_final ??
                Math.max(0, precioOriginal - descuentoValor)
            );

            const reservaPagada = Number(
                reserva?.monto_reserva || 0
            );

            const saldoPendiente = Math.max(
                0,
                precioFinal - reservaPagada
            );

            citasPendientes.push({
                ...resultado,
                precio_original: precioOriginal,
                descuento_porcentaje: descuentoPorcentaje,
                descuento_valor: descuentoValor,
                precio_final: precioFinal,
                reserva_pagada: reservaPagada,
                saldo_pendiente: saldoPendiente
            });
        }

        return res.status(200).json(citasPendientes);

    } catch (error) {
        console.error("ERROR AL CONSULTAR CITAS PARA PAGO:", error);

        return res.status(500).json({
            message: "No se pudieron consultar las citas pendientes.",
            error: error.message
        });
    }
}



function desglosarPrecioCita(cita, servicio, reservaPagada) {

    const precioOriginal = Number(
        cita.precio_original || servicio.precio || 0
    );

    const descuentoPorcentaje = Number(
        cita.descuento_porcentaje || 0
    );

    const descuento = Number(
        cita.descuento_valor ||
        (precioOriginal * descuentoPorcentaje / 100)
    );

    const precioFinal = Math.max(
        0,
        precioOriginal - descuento
    );

    
    const reserva = reservaPagada
        ? Number(reservaPagada.monto_pagado || reservaPagada.monto_reserva || 0)
        : 0;

   
    const saldo = Math.max(
        0,
        precioFinal - reserva
    );

    return {
        precioOriginal,
        descuentoPorcentaje,
        descuento,
        precioFinal,
        reservaPagada: reserva,
        saldo
    };
}



export async function registrarPago(req, res) {
    try {
        const usuario = req.user;

        if (!usuario || !["administrador", "empleado"].includes(usuario.rol)) {
            return res.status(403).json({
                message: "No tienes permiso para registrar pagos."
            });
        }

        const citaId = Number(req.body.cita_id);
        const fechaPago = req.body.fecha_pago;

        if (
            !Number.isInteger(citaId) ||
            citaId <= 0 ||
            !fechaPago
        ) {
            return res.status(400).json({
                message: "Debes seleccionar una cita y una fecha de pago."
            });
        }

        const fecha = new Date(`${fechaPago}T12:00:00`);

        if (
            Number.isNaN(fecha.getTime()) ||
            fecha.toISOString().slice(0, 10) !== fechaPago
        ) {
            return res.status(400).json({
                message: "La fecha de pago no es válida."
            });
        }

        const resultado = await db.transaction(async (transaction) => {

          
            const whereCita = {
                id: citaId,
                estado: "finalizada"
            };

           
            if (usuario.rol === "empleado") {
                whereCita.empleado_id = usuario.id;
            }

            const cita = await Cita.findOne({
                where: whereCita,
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!cita) {
                throw Object.assign(
                    new Error("La cita no existe, no está finalizada o no te pertenece."),
                    { status: 404 }
                );
            }

    
            const pagoExistente = await Pago.findOne({
                where: {
                    cita_id: cita.id,
                    estado_pago: "pagada"
                },
                transaction
            });

            if (pagoExistente) {
                throw Object.assign(
                    new Error("Esta cita ya tiene un pago registrado."),
                    { status: 409 }
                );
            }

         
            const servicio = await Servicio.findByPk(cita.servicio_id, {
                transaction
            });

            if (!servicio) {
                throw Object.assign(
                    new Error("No se encontró el servicio."),
                    { status: 404 }
                );
            }

           
            const reservaPagada = await PagoReserva.findOne({
                where: {
                    cita_id: cita.id,
                    estado: ["aprobado", "aprobado_abono"]
                },
                transaction
            });

          
            const desglose = desglosarPrecioCita(
                cita,
                servicio,
                reservaPagada
            );

            const precioOriginal = Number(desglose.precioOriginal);
            const descuento = Number(desglose.descuento);
            const precioFinal = Number(desglose.precioFinal);
            const reserva = Number(desglose.reservaPagada);
            const saldo = Number(desglose.saldo);

            if (
                !Number.isFinite(precioOriginal) ||
                !Number.isFinite(descuento) ||
                !Number.isFinite(precioFinal) ||
                !Number.isFinite(reserva) ||
                !Number.isFinite(saldo) ||
                precioOriginal <= 0 ||
                descuento < 0 ||
                descuento > precioOriginal ||
                precioFinal < 0 ||
                reserva < 0 ||
                saldo < 0 ||
                saldo > precioFinal
            ) {
                throw Object.assign(
                    new Error("Los valores del pago no son válidos."),
                    { status: 400 }
                );
            }

         
            cita.precio_original = precioOriginal;
            cita.descuento_porcentaje =
                Number(desglose.descuentoPorcentaje) || 0;
            cita.descuento_valor = descuento;
            cita.precio_final = precioFinal;

            await cita.save({ transaction });

           
            const nuevoPago = await Pago.create({
                usuario_id: cita.usuario_id,
                servicio_id: cita.servicio_id,
                cita_id: cita.id,
                total_pago: saldo,
                fecha_pago: fecha,
                estado_pago: "pagada"
            }, { transaction });

            return {
                pago: nuevoPago,
                precio_original: precioOriginal,
                descuento_porcentaje:
                    Number(desglose.descuentoPorcentaje) || 0,
                descuento_aplicado: descuento,
                precio_final: precioFinal,
                reserva_pagada: reserva,
                total_pagado: saldo
            };
        });

        return res.status(201).json({
            message: "Pago registrado correctamente.",
            pago: resultado.pago,
            detalle: {
                precio_original: resultado.precio_original,
                descuento_porcentaje: resultado.descuento_porcentaje,
                descuento_aplicado: resultado.descuento_aplicado,
                precio_final: resultado.precio_final,
                reserva_pagada: resultado.reserva_pagada,
                total_pagado: resultado.total_pagado
            }
        });

    } catch (error) {
        console.error("Error al registrar pago:", error);

        return res.status(error.status || 500).json({
            message: error.status
                ? error.message
                : "Error al registrar el pago."
        });
    }
}







export async function historialPagos(req, res) {
    try {
        if (req.user?.rol !== 'administrador') {
            return res.status(403).json({
                message: 'No tienes permiso para consultar el historial de pagos.'
            });
        }

        const [pagos, reservasPagadas] = await Promise.all([
            Pago.findAll({
                include: [
                    {
                        model: Cita,
                        as: 'cita',
                        required: false,
                        include: [
                            {
                                model: Usuario,
                                as: 'cliente',
                                attributes: ['id', 'nombre']
                            },
                            {
                                model: Usuario,
                                as: 'empleado',
                                attributes: ['id', 'nombre']
                            },
                            {
                                model: Servicio,
                                attributes: ['id', 'nombre', 'precio']
                            }
                        ]
                    }
                ],
                order: [['fecha_pago', 'DESC']]
            }),
            PagoReserva.findAll({
                where: {
                    estado: { [Op.in]: ['aprobado', 'aprobado_abono'] }
                },
                include: [
                    { model: Usuario, as: 'cliente', attributes: ['id', 'nombre'] },
                    { model: Usuario, as: 'empleado', attributes: ['id', 'nombre'] },
                    { model: Servicio, attributes: ['id', 'nombre', 'precio'] }
                ],
                order: [['updated_at', 'DESC']]
            })
        ]);

        const pagosCombinados = [
            ...pagos.map((pago) => ({
                ...pago.toJSON(),
                tipo_pago: 'Saldo en el salón',
                credito_aplicado: 0
            })),
            ...reservasPagadas.map((reserva) => ({
                id: `reserva-${reserva.id}`,
                fecha_pago: reserva.updated_at,
                total_pago: reserva.monto_pagado,
                credito_aplicado: reserva.estado === 'aprobado' ? reserva.monto_credito : 0,
                estado_pago: reserva.estado === 'aprobado' ? 'Reserva pagada' : 'Abono disponible',
                tipo_pago: 'Reserva en línea (Wompi)',
                cita: {
                    cliente: reserva.cliente,
                    empleado: reserva.empleado,
                    Servicio: reserva.Servicio,
                    fecha: reserva.fecha_reserva,
                    hora: reserva.hora_reserva
                }
            }))
        ].sort((a, b) => new Date(b.fecha_pago).getTime() - new Date(a.fecha_pago).getTime());

        return res.status(200).json(pagosCombinados);

    } catch (error) {
        console.error('Error al consultar historial de pagos:', error);

        return res.status(500).json({
            message: 'No se pudo cargar el historial de pagos.'
        });
    }
}
