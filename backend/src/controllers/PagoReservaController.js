import { randomUUID } from "node:crypto";
import { Op } from "sequelize";
import db from "../config/db.js";
import AbonoReserva from "../models/AbonoReserva.js";
import AbonoReservaUso from "../models/AbonoReservaUso.js";
import Cita from "../models/citas.js";
import PagoReserva from "../models/PagoReserva.js";
import Servicio from "../models/servicios.js";
import Usuario from "../models/Usuario.js";
import { generarFirmaCheckout, verificarFirmaEventoWompi } from "../utils/wompi.js";
import { puedeRealizarServicio } from "../utils/servicios.js";
import { normalizarHoraReserva, validarFechaHoraReserva } from "../utils/fechaHora.js";

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

function obtenerPrecioPesos(servicio) {
    const precio = Number(servicio?.precio);
    if (!Number.isFinite(precio) || precio <= 0) return null;
    return Math.round(precio);
}

function obtenerMontoReserva(precioPesos) {
    return Math.round(precioPesos * 0.2);
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

export async function crearPagoReserva(req, res) {
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

    const usuarioId = req.user.id;
    const fecha = req.body?.fecha;
    const horaSolicitada = req.body?.hora;
    const empleadoId = Number(req.body?.empleado_id);
    const servicioId = Number(req.body?.servicio_id);

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
            const montoReserva = precioPesos === null ? null : obtenerMontoReserva(precioPesos);
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

            const abonos = await AbonoReserva.findAll({
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
                monto_reserva: montoReserva,
                monto_credito: creditoAplicado,
                monto_pagado: montoReserva - creditoAplicado,
                referencia: `JC${randomUUID().replace(/-/g, "").toUpperCase()}`,
                estado: creditoAplicado === montoReserva ? "aprobado" : "pendiente",
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
                const cita = await Cita.create({
                    fecha,
                    hora,
                    usuario_id: usuarioId,
                    empleado_id: empleadoId,
                    servicio_id: servicioId,
                    estado: "confirmada"
                }, { transaction });
                pagoReserva.cita_id = cita.id;
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
                message: "La reserva se confirmó usando tu abono disponible.",
                referencia: pagoReserva.referencia,
                estado: pagoReserva.estado,
                monto_reserva: pagoReserva.monto_reserva,
                monto_credito: pagoReserva.monto_credito,
                monto_pagado: pagoReserva.monto_pagado
            });
        }

        return res.status(201).json({
            message: "Completa el pago de la reserva para confirmar tu cita.",
            referencia: pagoReserva.referencia,
            estado: pagoReserva.estado,
            monto_reserva: pagoReserva.monto_reserva,
            monto_credito: pagoReserva.monto_credito,
            monto_pagado: pagoReserva.monto_pagado,
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
        return res.status(503).json({ message: "El webhook de pagos no está configurado." });
    }
    if (!verificarFirmaEventoWompi(req.body, eventsSecret)) {
        return res.status(401).json({ message: "La firma del evento de pago no es válida." });
    }

    const transaccion = req.body?.data?.transaction;
    if (req.body?.event !== "transaction.updated" || !transaccion) {
        return res.sendStatus(200);
    }

    try {
        await db.transaction(async (transaction) => {
            const pagoReserva = await PagoReserva.findOne({
                where: { referencia: transaccion.reference },
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!pagoReserva) {
                console.warn("Wompi notificó una referencia de reserva desconocida:", transaccion.reference);
                return;
            }

            const montoEsperado = (pagoReserva.monto_reserva - pagoReserva.monto_credito) * 100;
            if (transaccion.currency !== MONEDA || Number(transaccion.amount_in_cents) !== montoEsperado) {
                throw new Error(`El monto o la moneda no coinciden con la reserva ${pagoReserva.referencia}.`);
            }

            const reservaVencida = pagoReserva.estado === "expirado"
                || pagoReserva.expira_en <= new Date();
            if (
                ESTADOS_TERMINALES.includes(pagoReserva.estado)
                && !(reservaVencida && transaccion.status === "APPROVED")
            ) return;

            if (transaccion.status === "PENDING") return;

            const estadosWompi = {
                DECLINED: "rechazado",
                ERROR: "error",
                VOIDED: "anulado"
            };
            const nuevoEstado = estadosWompi[transaccion.status];

            if (transaccion.status !== "APPROVED" && !nuevoEstado) return;

            pagoReserva.transaction_id = transaccion.id || null;
            pagoReserva.updated_at = new Date();

            if (nuevoEstado) {
                pagoReserva.estado = nuevoEstado;
                await pagoReserva.save({ transaction });
                await restaurarAbonos(pagoReserva, transaction);
                return;
            }

            if (reservaVencida) {
                pagoReserva.estado = "aprobado_abono";
                await pagoReserva.save({ transaction });
                await crearAbonoPorPago(pagoReserva, transaction);
                await restaurarAbonos(pagoReserva, transaction);
                return;
            }

            const empleado = await Usuario.findByPk(pagoReserva.empleado_id, {
                transaction,
                lock: transaction.LOCK.UPDATE
            });
            const citaOcupada = await Cita.findOne({
                where: {
                    empleado_id: pagoReserva.empleado_id,
                    fecha: pagoReserva.fecha_reserva,
                    hora: pagoReserva.hora_reserva,
                    estado: { [Op.in]: ESTADOS_OCUPAN_HORARIO }
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
                    expira_en: { [Op.gt]: new Date() }
                },
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (empleado && !citaOcupada && !otraReservaActiva) {
                const cita = await Cita.create({
                    fecha: pagoReserva.fecha_reserva,
                    hora: pagoReserva.hora_reserva,
                    usuario_id: pagoReserva.usuario_id,
                    empleado_id: pagoReserva.empleado_id,
                    servicio_id: pagoReserva.servicio_id,
                    estado: "confirmada"
                }, { transaction });
                pagoReserva.cita_id = cita.id;
                pagoReserva.estado = "aprobado";
                await pagoReserva.save({ transaction });
                return;
            }

            pagoReserva.estado = "aprobado_abono";
            await pagoReserva.save({ transaction });
            await crearAbonoPorPago(pagoReserva, transaction);
            await restaurarAbonos(pagoReserva, transaction);
        });

        return res.sendStatus(200);
    } catch (error) {
        console.error("No se pudo procesar el evento de Wompi:", error);
        return res.status(500).json({ message: "No se pudo procesar el evento de pago." });
    }
}

export async function acreditarReservaCancelada(cita, transaction) {
    await crearAbonoPorCancelacion(cita, transaction);
}
