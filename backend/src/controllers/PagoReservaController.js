import { randomUUID } from "node:crypto";
import { Op } from "sequelize";
import db from "../config/db.js";
import AbonoReserva from "../models/AbonoReserva.js";
import AbonoReservaUso from "../models/AbonoReservaUso.js";
import Cita from "../models/citas.js";
import MovimientoPuntos from "../models/MovimientoPuntos.js";
import PagoReserva from "../models/PagoReserva.js";
import Pago from "../models/pagos.js";
import Servicio from "../models/servicios.js";
import Usuario from "../models/Usuario.js";
import { generarFirmaCheckout, verificarFirmaEventoWompi } from "../utils/wompi.js";
import { puedeRealizarServicio } from "../utils/servicios.js";
import { normalizarHoraReserva, validarFechaHoraReserva } from "../utils/fechaHora.js";
import { NIVELES_DESCUENTO, calcularSaldo } from "./FidelizacionController.js";


const DURACION_RESERVA_MINUTOS = 30;
const MONEDA = "COP";
const ESTADOS_OCUPAN_HORARIO = ["pendiente", "confirmada", "en_curso"];
const ESTADOS_TERMINALES = [
    "aprobado",
    "rechazado",
    "error",
    "anulado",
    "expirado",
    "aprobado_abono"
];
const NIVELES_DE_MAYOR_A_MENOR = [15, 10, 5];

function pagosSimulados() {
    
    return process.env.PAGOS_SIMULADOS === "true" && process.env.NODE_ENV !== "production";
}

function obtenerPrecioPesos(servicio) {
    const precio = Number(servicio?.precio);
    if (!Number.isFinite(precio) || precio <= 0) return null;
    return Math.round(precio);
}


function obtenerMontoReserva(precioConDescuento) {
    return Math.round(precioConDescuento * 0.2);
}

function obtenerUrlCheckout(pagoReserva) {
    const publicKey = process.env.WOMPI_PUBLIC_KEY;
    const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;
    const frontendUrl = process.env.FRONTEND_URL?.replace(/\/+$/, "");

    if (!publicKey || !integritySecret || !frontendUrl) {
        throw new Error("Falta configurar WOMPI_PUBLIC_KEY, WOMPI_INTEGRITY_SECRET o FRONTEND_URL.");
    }

    const amountInCents = (pagoReserva.monto_reserva - pagoReserva.monto_credito) * 100;
    const expirationTime = new Date(pagoReserva.expira_en).toISOString();
    const signature = generarFirmaCheckout(
        pagoReserva.referencia,
        amountInCents,
        MONEDA,
        expirationTime,
        integritySecret
    );
    const redirectUrl = new URL("/cita", frontendUrl);
    redirectUrl.searchParams.set("reserva", pagoReserva.referencia);
    const checkoutUrl = new URL("https://checkout.wompi.co/p/");

    checkoutUrl.search = new URLSearchParams({
        "public-key": publicKey,
        currency: MONEDA,
        "amount-in-cents": String(amountInCents),
        reference: pagoReserva.referencia,
        "signature:integrity": signature,
        "expiration-time": expirationTime,
        "redirect-url": redirectUrl.toString()
    }).toString();

    return checkoutUrl.toString();
}

async function restaurarAbonos(pagoReserva, transaction) {
    const usos = await AbonoReservaUso.findAll({
        where: {
            pago_reserva_id: pagoReserva.id,
            restaurado_en: null
        },
        transaction,
        lock: transaction.LOCK.UPDATE
    });

    for (const uso of usos) {
        const abono = await AbonoReserva.findByPk(uso.abono_id, {
            transaction,
            lock: transaction.LOCK.UPDATE
        });
        if (!abono) {
            throw new Error(`No se encontró el abono ${uso.abono_id} para restaurar.`);
        }

        abono.saldo += uso.monto;
        abono.updated_at = new Date();
        await abono.save({ transaction });
        uso.restaurado_en = new Date();
        await uso.save({ transaction });
    }
}

async function expirarReservasUsuario(usuarioId, transaction) {
    const ahora = new Date();
    const reservasExpiradas = await PagoReserva.findAll({
        where: {
            usuario_id: usuarioId,
            estado: "pendiente",
            expira_en: { [Op.lte]: ahora }
        },
        transaction,
        lock: transaction.LOCK.UPDATE
    });

    for (const reserva of reservasExpiradas) {
        reserva.estado = "expirado";
        reserva.updated_at = ahora;
        await reserva.save({ transaction });
        await restaurarAbonos(reserva, transaction);
    }
}

async function crearAbonoPorPago(pagoReserva, transaction) {
    if (pagoReserva.monto_pagado <= 0) return;

    await AbonoReserva.findOrCreate({
        where: { pago_reserva_id: pagoReserva.id },
        defaults: {
            usuario_id: pagoReserva.usuario_id,
            pago_reserva_id: pagoReserva.id,
            monto_original: pagoReserva.monto_pagado,
            saldo: pagoReserva.monto_pagado,
            created_at: new Date(),
            updated_at: new Date()
        },
        transaction
    });
}

async function crearAbonoPorCancelacion(cita, transaction) {
    const pagoReserva = await PagoReserva.findOne({
        where: {
            cita_id: cita.id,
            estado: "aprobado"
        },
        transaction,
        lock: transaction.LOCK.UPDATE
    });

    if (!pagoReserva) return;

    await crearAbonoPorPago(pagoReserva, transaction);
    await restaurarAbonos(pagoReserva, transaction);
}


async function crearCitaDesdeReserva(pagoReserva, transaction) {
    let precioOriginal = Number(pagoReserva.precio_original);

    if (!(precioOriginal > 0)) {
        const servicio = await Servicio.findByPk(pagoReserva.servicio_id, { transaction });
        precioOriginal = Math.round(Number(servicio?.precio) || 0);
    }

    let descuentoPorcentaje = 0;
    let descuentoValor = 0;
    let puntosCanje = 0;

    if (Number(pagoReserva.puntos_canje) > 0) {
       
        await Usuario.findByPk(pagoReserva.usuario_id, {
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        const { saldo } = await calcularSaldo(pagoReserva.usuario_id, transaction);

        if (saldo >= pagoReserva.puntos_canje) {
            descuentoPorcentaje = Number(pagoReserva.descuento_porcentaje) || 0;
            descuentoValor = Number(pagoReserva.descuento_valor) || 0;
            puntosCanje = Number(pagoReserva.puntos_canje);
        } else {
            console.warn(
                `El cliente ${pagoReserva.usuario_id} ya no tiene puntos suficientes para el descuento de la reserva ${pagoReserva.referencia}.`
            );
        }
    }

    const cita = await Cita.create({
        fecha: pagoReserva.fecha_reserva,
        hora: pagoReserva.hora_reserva,
        usuario_id: pagoReserva.usuario_id,
        empleado_id: pagoReserva.empleado_id,
        servicio_id: pagoReserva.servicio_id,
        estado: "pendiente",
        precio_original: precioOriginal,
        descuento_porcentaje: descuentoPorcentaje,
        descuento_valor: descuentoValor,
        precio_final: Math.max(0, precioOriginal - descuentoValor)
    }, { transaction });

    if (puntosCanje > 0) {
        await MovimientoPuntos.create({
            usuario_id: pagoReserva.usuario_id,
            cita_id: cita.id,
            tipo: "canje",
            puntos: puntosCanje,
            descripcion:
                `Canje ${descuentoPorcentaje}% de descuento al reservar. ` +
                `Descuento: $${descuentoValor} COP`
        }, { transaction });
    }

    pagoReserva.cita_id = cita.id;
    return cita;
}

async function registrarPagoOnlineCita(pagoReserva, cita, transaction, fechaPago) {
    const montoRegistrado = Number(pagoReserva.monto_pagado) || 0;
    const montoOnline = montoRegistrado > 0
        ? montoRegistrado
        : Math.max(0, (Number(pagoReserva.monto_reserva) || 0) - (Number(pagoReserva.monto_credito) || 0));
    if (montoOnline <= 0) return null;

    const pagoExistente = await Pago.findOne({
        where: { cita_id: cita.id, medio_pago: "online" },
        transaction,
        lock: transaction.LOCK.UPDATE
    });
    const montoLocalExistente = Number(pagoExistente?.monto_local) || 0;
    const datosPago = {
        usuario_id: pagoReserva.usuario_id,
        servicio_id: pagoReserva.servicio_id,
        cita_id: cita.id,
        total_pago: montoOnline + montoLocalExistente,
        monto_online: montoOnline,
        monto_local: montoLocalExistente,
        medio_pago: "online",
        fecha_pago: fechaPago,
        estado_pago: "pagada"
    };

    if (pagoExistente) {
        await pagoExistente.update(datosPago, { transaction });
        return pagoExistente;
    }

    return Pago.create(datosPago, { transaction });
}

export async function crearPagoReserva(req, res) {
    const simulado = pagosSimulados();

    
    if (!simulado) {
        if (
            !process.env.WOMPI_PUBLIC_KEY
            || !process.env.WOMPI_INTEGRITY_SECRET
            || !process.env.WOMPI_EVENTS_SECRET
            || !process.env.FRONTEND_URL
        ) {
            return res.status(503).json({
                message: "Los pagos en línea aún no están configurados. Contacta al salón."
            });
        }
        try {
            new URL(process.env.FRONTEND_URL);
        } catch {
            return res.status(503).json({
                message: "La URL del sitio no está configurada correctamente para los pagos."
            });
        }
    }

    const usuarioId = req.user.id;
    const fecha = req.body?.fecha;
    const horaSolicitada = req.body?.hora;
    const empleadoId = Number(req.body?.empleado_id);
    const servicioId = Number(req.body?.servicio_id);
    const aplicarDescuento = req.body?.aplicar_descuento === true;
    const tipoPago = req.body?.tipo_pago === "completo" ? "completo" : "reserva";

    if (!validarFechaHoraReserva(fecha, horaSolicitada) || !Number.isInteger(empleadoId)
        || empleadoId < 1 || !Number.isInteger(servicioId) || servicioId < 1) {
        return res.status(400).json({ message: "Ingresa una fecha, hora, empleado y servicio válidos." });
    }

    const hora = normalizarHoraReserva(horaSolicitada);
    const expiraEn = new Date(Date.now() + DURACION_RESERVA_MINUTOS * 60 * 1000);
    const ahora = new Date();

    try {
        const resultado = await db.transaction(async (transaction) => {
            await expirarReservasUsuario(usuarioId, transaction);

            const empleado = await Usuario.findOne({
                where: { id: empleadoId, rol: "empleado" },
                transaction,
                lock: transaction.LOCK.UPDATE
            });
            if (!empleado) return { error: "Selecciona un empleado válido.", status: 400 };

            const servicio = await Servicio.findByPk(servicioId, { transaction });
            if (!servicio) return { error: "El servicio seleccionado no existe.", status: 404 };
            if (!puedeRealizarServicio(empleado, servicio)) {
                return {
                    error: `Este empleado no puede realizar el servicio ${servicio.nombre}.`,
                    status: 400
                };
            }

            const precioPesos = obtenerPrecioPesos(servicio);
            if (precioPesos === null) {
                return { error: "El servicio no tiene un precio válido para calcular la reserva.", status: 400 };
            }

          
            let descuentoPorcentaje = 0;
            let descuentoValor = 0;
            let puntosCanje = 0;

            if (aplicarDescuento) {
                await Usuario.findByPk(usuarioId, {
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });

                const { saldo } = await calcularSaldo(usuarioId, transaction);

               
                const puntosComprometidos = Number(await PagoReserva.sum("puntos_canje", {
                    where: {
                        usuario_id: usuarioId,
                        estado: "pendiente",
                        expira_en: { [Op.gt]: ahora }
                    },
                    transaction
                })) || 0;

                const puntosLibres = saldo - puntosComprometidos;
                const porcentaje = NIVELES_DE_MAYOR_A_MENOR.find(
                    (nivel) => puntosLibres >= NIVELES_DESCUENTO[nivel].puntos
                );

                if (!porcentaje) {
                    return { error: "No tienes puntos suficientes para aplicar un descuento.", status: 400 };
                }

                const nivel = NIVELES_DESCUENTO[porcentaje];
                descuentoPorcentaje = porcentaje;
                descuentoValor = Math.min(
                    Math.round(precioPesos * porcentaje / 100),
                    nivel.descuentoMaximo
                );
                puntosCanje = nivel.puntos;
            }

            const precioConDescuento = precioPesos - descuentoValor;
            const montoReserva = tipoPago === "completo"
                ? precioConDescuento
                : obtenerMontoReserva(precioConDescuento);
            if (!montoReserva) {
                return { error: "El servicio no tiene un precio válido para calcular la reserva.", status: 400 };
            }

            const citaEnCurso = await Cita.findOne({
                where: {
                    fecha,
                    hora,
                    empleado_id: empleadoId,
                    estado: { [Op.in]: ESTADOS_OCUPAN_HORARIO }
                },
                transaction,
                lock: transaction.LOCK.UPDATE
            });
            if (citaEnCurso) {
                return { error: "El empleado ya tiene una cita a esa hora. Elige otro horario.", status: 409 };
            }

            const reservaActiva = await PagoReserva.findOne({
                where: {
                    empleado_id: empleadoId,
                    fecha_reserva: fecha,
                    hora_reserva: hora,
                    estado: "pendiente",
                    expira_en: { [Op.gt]: ahora }
                },
                transaction,
                lock: transaction.LOCK.UPDATE
            });
            if (reservaActiva) {
                return { error: "Este horario está reservado mientras se completa otro pago. Elige otro horario.", status: 409 };
            }

            const abonos = tipoPago === "completo" ? [] : await AbonoReserva.findAll({
                where: {
                    usuario_id: usuarioId,
                    saldo: { [Op.gt]: 0 }
                },
                order: [["id", "ASC"]],
                transaction,
                lock: transaction.LOCK.UPDATE
            });
            let creditoAplicado = 0;
            const usosAbono = [];
            for (const abono of abonos) {
                const aplicar = Math.min(abono.saldo, montoReserva - creditoAplicado);
                if (aplicar <= 0) break;
                creditoAplicado += aplicar;
                usosAbono.push({ abono, monto: aplicar });
            }

            const pagoReserva = await PagoReserva.create({
                usuario_id: usuarioId,
                empleado_id: empleadoId,
                servicio_id: servicioId,
                fecha_reserva: fecha,
                hora_reserva: hora,
                precio_original: precioPesos,
                descuento_porcentaje: descuentoPorcentaje,
                descuento_valor: descuentoValor,
                puntos_canje: puntosCanje,
                monto_reserva: montoReserva,
                monto_credito: creditoAplicado,
                monto_pagado: montoReserva - creditoAplicado,
                referencia: `JC${randomUUID().replace(/-/g, "").toUpperCase()}`,
                
                estado: (simulado || creditoAplicado === montoReserva) ? "aprobado" : "pendiente",
                expira_en: expiraEn,
                created_at: ahora,
                updated_at: ahora
            }, { transaction });

            for (const { abono, monto } of usosAbono) {
                abono.saldo -= monto;
                abono.updated_at = ahora;
                await abono.save({ transaction });
                await AbonoReservaUso.create({
                    abono_id: abono.id,
                    pago_reserva_id: pagoReserva.id,
                    monto,
                    restaurado_en: null,
                    created_at: ahora
                }, { transaction });
            }

            if (pagoReserva.estado === "aprobado") {
                const cita = await crearCitaDesdeReserva(pagoReserva, transaction);
                await registrarPagoOnlineCita(pagoReserva, cita, transaction, ahora);
                await pagoReserva.save({ transaction });
            }

            return { pagoReserva };
        });

        if (resultado.error) {
            return res.status(resultado.status).json({ message: resultado.error });
        }

        const { pagoReserva } = resultado;
        if (pagoReserva.estado === "aprobado") {
            return res.status(201).json({
                message: simulado
                    ? "Reserva pagada (pago simulado en modo de pruebas). Tu cita quedó pendiente de confirmación del profesional."
                    : "Tu reserva quedó pagada con tu abono. Tu cita quedó pendiente de confirmación del profesional.",
                referencia: pagoReserva.referencia,
                estado: pagoReserva.estado,
                monto_reserva: pagoReserva.monto_reserva,
                monto_credito: pagoReserva.monto_credito,
                monto_pagado: pagoReserva.monto_pagado,
                monto_online: pagoReserva.monto_pagado,
                saldo_pendiente: Math.max(0,
                    Number(pagoReserva.precio_original)
                    - Number(pagoReserva.descuento_valor)
                    - Number(pagoReserva.monto_pagado)
                    - Number(pagoReserva.monto_credito)
                ),
                tipo_pago: tipoPago,
                descuento_porcentaje: pagoReserva.descuento_porcentaje,
                descuento_valor: pagoReserva.descuento_valor
            });
        }

        return res.status(201).json({
            message: "Completa el pago de la reserva para continuar con tu cita.",
            referencia: pagoReserva.referencia,
            estado: pagoReserva.estado,
            monto_reserva: pagoReserva.monto_reserva,
            monto_credito: pagoReserva.monto_credito,
            monto_pagado: pagoReserva.monto_pagado,
            monto_online: pagoReserva.monto_pagado,
            saldo_pendiente: Math.max(0,
                Number(pagoReserva.precio_original)
                - Number(pagoReserva.descuento_valor)
                - Number(pagoReserva.monto_pagado)
                - Number(pagoReserva.monto_credito)
            ),
            tipo_pago: tipoPago,
            descuento_porcentaje: pagoReserva.descuento_porcentaje,
            descuento_valor: pagoReserva.descuento_valor,
            checkout_url: obtenerUrlCheckout(pagoReserva)
        });
    } catch (error) {
        console.error("No se pudo iniciar el pago de la reserva:", error);
        if (error.name === "SequelizeUniqueConstraintError") {
            return res.status(409).json({ message: "Este horario ya está reservado. Elige otro." });
        }
        return res.status(500).json({ message: "No se pudo iniciar el pago de la reserva." });
    }
}

export async function obtenerEstadoPagoReserva(req, res) {
    try {
        const pagoReserva = await PagoReserva.findOne({
            where: {
                referencia: req.params.referencia,
                usuario_id: req.user.id
            }
        });

        if (!pagoReserva) {
            return res.status(404).json({ message: "No se encontró esta reserva." });
        }

        if (pagoReserva.estado === "pendiente" && pagoReserva.expira_en <= new Date()) {
            await db.transaction(async (transaction) => {
                const pagoBloqueado = await PagoReserva.findByPk(pagoReserva.id, {
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });
                if (pagoBloqueado?.estado === "pendiente" && pagoBloqueado.expira_en <= new Date()) {
                    pagoBloqueado.estado = "expirado";
                    pagoBloqueado.updated_at = new Date();
                    await pagoBloqueado.save({ transaction });
                    await restaurarAbonos(pagoBloqueado, transaction);
                }
            });
            await pagoReserva.reload();
        }

        return res.json({
            referencia: pagoReserva.referencia,
            estado: pagoReserva.estado,
            monto_reserva: pagoReserva.monto_reserva,
            monto_credito: pagoReserva.monto_credito,
            monto_pagado: pagoReserva.monto_pagado,
            monto_online: pagoReserva.monto_pagado,
            saldo_pendiente: Math.max(0,
                Number(pagoReserva.precio_original)
                - Number(pagoReserva.descuento_valor)
                - Number(pagoReserva.monto_pagado)
                - Number(pagoReserva.monto_credito)
            ),
            tipo_pago: Number(pagoReserva.monto_reserva) >=
                Number(pagoReserva.precio_original) - Number(pagoReserva.descuento_valor)
                ? "completo"
                : "reserva",
            descuento_porcentaje: pagoReserva.descuento_porcentaje,
            descuento_valor: pagoReserva.descuento_valor,
            cita_id: pagoReserva.cita_id
        });
    } catch (error) {
        console.error("No se pudo consultar el estado del pago de reserva:", error);
        return res.status(500).json({ message: "No se pudo consultar el estado de la reserva." });
    }
}

export async function obtenerAbonosReserva(req, res) {
    try {
        const saldo = await AbonoReserva.sum("saldo", {
            where: { usuario_id: req.user.id }
        });
        return res.json({ saldo_disponible: Number(saldo) || 0 });
    } catch (error) {
        console.error("No se pudo consultar el saldo de abonos:", error);
        return res.status(500).json({ message: "No se pudo consultar el saldo disponible." });
    }
}


export async function recibirEventoWompi(req, res) {

    const eventsSecret = process.env.WOMPI_EVENTS_SECRET;

    if (!eventsSecret) {
        console.error("WOMPI_EVENTS_SECRET no está configurado.");
        return res.sendStatus(503);
    }

    if (!verificarFirmaEventoWompi(req.body, eventsSecret)) {
        console.error("Firma del webhook Wompi inválida.");
        return res.sendStatus(401);
    }

    const transaccionWompi = req.body?.data?.transaction;

    if (
        req.body?.event !== "transaction.updated"
        || !transaccionWompi
        || !transaccionWompi.reference
    ) {
        console.log("Evento Wompi ignorado.");
        return res.sendStatus(200);
    }

    try {
        await db.transaction(async (transaction) => {
            const pagoReserva = await PagoReserva.findOne({
                where: {
                    referencia: transaccionWompi.reference
                },
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!pagoReserva) {
                console.warn(
                    "Referencia Wompi desconocida:",
                    transaccionWompi.reference
                );
                return;
            }

            console.log("PAGO ENCONTRADO:", pagoReserva.id);
            console.log("ESTADO ACTUAL:", pagoReserva.estado);

            
            const montoEsperado =
                (Number(pagoReserva.monto_reserva)
                    - Number(pagoReserva.monto_credito)) * 100;

            if (
                transaccionWompi.currency !== MONEDA
                || Number(transaccionWompi.amount_in_cents) !== montoEsperado
            ) {
                throw new Error(
                    `Monto o moneda incorrectos para ${pagoReserva.referencia}`
                );
            }

            
            pagoReserva.transaction_id = transaccionWompi.id || null;
            pagoReserva.updated_at = new Date();

           
            if (transaccionWompi.status === "PENDING") {
                await pagoReserva.save({ transaction });
                return;
            }

            const estadosWompi = {
                DECLINED: "rechazado",
                ERROR: "error",
                VOIDED: "anulado"
            };

            const nuevoEstado = estadosWompi[transaccionWompi.status];

            if (nuevoEstado) {
                if (pagoReserva.estado === "pendiente") {
                    pagoReserva.estado = nuevoEstado;
                    await pagoReserva.save({ transaction });
                    await restaurarAbonos(pagoReserva, transaction);
                }
                return;
            }

        
            if (transaccionWompi.status !== "APPROVED") {
                console.log(
                    "Estado Wompi no procesable:",
                    transaccionWompi.status
                );
                return;
            }

            if (
                pagoReserva.estado === "aprobado"
                || pagoReserva.estado === "aprobado_abono"
            ) {
                console.log("Pago ya procesado anteriormente.");
                return;
            }

            const ahora = new Date();

            const reservaVencida =
                pagoReserva.estado === "expirado"
                || pagoReserva.expira_en <= ahora;

            if (reservaVencida) {
                pagoReserva.estado = "aprobado_abono";
                await pagoReserva.save({ transaction });

                await crearAbonoPorPago(pagoReserva, transaction);
                await restaurarAbonos(pagoReserva, transaction);

                console.log("Pago aprobado después del vencimiento. Convertido en abono.");
                return;
            }

           
            const empleado = await Usuario.findOne({
                where: {
                    id: pagoReserva.empleado_id,
                    rol: "empleado"
                },
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!empleado) {
                pagoReserva.estado = "aprobado_abono";
                await pagoReserva.save({ transaction });

                await crearAbonoPorPago(pagoReserva, transaction);
                await restaurarAbonos(pagoReserva, transaction);

                console.log("Empleado no disponible. Pago convertido en abono.");
                return;
            }

          
            const citaOcupada = await Cita.findOne({
                where: {
                    empleado_id: pagoReserva.empleado_id,
                    fecha: pagoReserva.fecha_reserva,
                    hora: pagoReserva.hora_reserva,
                    estado: {
                        [Op.in]: ESTADOS_OCUPAN_HORARIO
                    }
                },
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            const otraReservaActiva = await PagoReserva.findOne({
                where: {
                    id: { [Op.ne]: pagoReserva.id },
                    empleado_id: pagoReserva.empleado_id,
                    fecha_reserva: pagoReserva.fecha_reserva,
                    hora_reserva: pagoReserva.hora_reserva,
                    estado: "pendiente",
                    expira_en: { [Op.gt]: ahora }
                },
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (citaOcupada || otraReservaActiva) {
                pagoReserva.estado = "aprobado_abono";
                await pagoReserva.save({ transaction });

                await crearAbonoPorPago(pagoReserva, transaction);
                await restaurarAbonos(pagoReserva, transaction);

                console.log("Horario ocupado. Pago convertido en abono.");
                return;
            }

            
            const cita = await crearCitaDesdeReserva(
                pagoReserva,
                transaction
            );

            await registrarPagoOnlineCita(pagoReserva, cita, transaction, ahora);

            pagoReserva.estado = "aprobado";
            pagoReserva.transaction_id = transaccionWompi.id || null;
            pagoReserva.updated_at = ahora;

            await pagoReserva.save({ transaction });

         
        });

        return res.sendStatus(200);

    } catch (error) {
        console.error("ERROR PROCESANDO WEBHOOK WOMPI:", error);
        return res.sendStatus(500);
    }
}


export async function acreditarReservaCancelada(cita, transaction) {
    await crearAbonoPorCancelacion(cita, transaction);
}
