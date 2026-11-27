import { randomUUID } from "node:crypto";
import { Op } from "sequelize";
import db from "../config/db.js";
import Cita from "../models/citas.js";
import MovimientoPuntos from "../models/MovimientoPuntos.js";
import PagoReserva from "../models/PagoReserva.js";
import Pago from "../models/pagos.js";
import Servicio from "../models/servicios.js";
import Usuario from "../models/Usuario.js";
import { generarFirmaCheckout, verificarFirmaEventoWompi } from "../utils/wompi.js";
import { puedeRealizarServicio } from "../utils/servicios.js";
import { horarioAtencionValido, normalizarHoraReserva, validarFechaHoraReserva } from "../utils/fechaHora.js";
import { NIVELES_DESCUENTO, calcularSaldo } from "./FidelizacionController.js";


const DURACION_RESERVA_MINUTOS = 30;
const DURACION_BLOQUE_CITA_MINUTOS = 60;
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

function minutosDelDia(hora) {
    const [horas, minutos] = String(hora || "").split(":").map(Number);
    return horas * 60 + minutos;
}

function minutosActualesBogota() {
    const partes = new Intl.DateTimeFormat("en-GB", {
        timeZone: "America/Bogota",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
    }).formatToParts(new Date());
    const valores = Object.fromEntries(partes.map(({ type, value }) => [type, value]));
    return Number(valores.hour) * 60 + Number(valores.minute);
}

function fechaActualBogota() {
    const partes = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Bogota",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date());
    const valores = Object.fromEntries(partes.map(({ type, value }) => [type, value]));
    return `${valores.year}-${valores.month}-${valores.day}`;
}

function hayCruceDeBloques(horaSolicitada, horaOcupada, citaEnCurso, fecha) {
    const inicioSolicitado = minutosDelDia(horaSolicitada);
    const finSolicitado = inicioSolicitado + DURACION_BLOQUE_CITA_MINUTOS;
    let inicioOcupado = minutosDelDia(horaOcupada);
    let finOcupado = inicioOcupado + DURACION_BLOQUE_CITA_MINUTOS;

    // Si el empleado sigue atendiendo una cita de hoy, su bloque permanece ocupado
    // hasta al menos una hora desde el momento actual.
    const hoyBogota = fechaActualBogota();
    if (citaEnCurso && fecha === hoyBogota) {
        const ahora = minutosActualesBogota();
        inicioOcupado = Math.min(inicioOcupado, ahora);
        finOcupado = Math.max(finOcupado, ahora + DURACION_BLOQUE_CITA_MINUTOS);
    }

    return inicioSolicitado < finOcupado && inicioOcupado < finSolicitado;
}

async function buscarConflictoHorario({ empleadoId, fecha, hora, transaction, excluirCitaId, excluirReservaId }) {
    const fechaInicio = `${fecha} 00:00:00`;
    const fechaFin = new Date(`${fecha}T00:00:00.000Z`);
    fechaFin.setUTCDate(fechaFin.getUTCDate() + 1);
    const citas = await Cita.findAll({
        where: {
            empleado_id: empleadoId,
            fecha: { [Op.gte]: fechaInicio, [Op.lt]: fechaFin.toISOString().slice(0, 10) },
            estado: { [Op.in]: ESTADOS_OCUPAN_HORARIO },
            ...(excluirCitaId ? { id: { [Op.ne]: excluirCitaId } } : {})
        },
        attributes: ["id", "hora", "estado"],
        transaction,
        lock: transaction.LOCK.UPDATE
    });
    const citasEnCurso = citas.filter((cita) => cita.estado === "en_curso");
    const citaEnCurso = citasEnCurso.find((cita) =>
        hayCruceDeBloques(hora, cita.hora, true, fecha)
    );
    if (citaEnCurso) return { citaEnCurso };

    const cita = citas.find((item) => hayCruceDeBloques(hora, item.hora, false, fecha));
    if (cita) return { cita };

    const reservas = await PagoReserva.findAll({
        where: {
            empleado_id: empleadoId,
            fecha_reserva: fecha,
            estado: "pendiente",
            expira_en: { [Op.gt]: new Date() },
            ...(excluirReservaId ? { id: { [Op.ne]: excluirReservaId } } : {})
        },
        attributes: ["id", "hora_reserva"],
        transaction,
        lock: transaction.LOCK.UPDATE
    });
    const reserva = reservas.find((item) =>
        hayCruceDeBloques(hora, item.hora_reserva, false, fecha)
    );
    return reserva ? { reserva } : null;
}

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
    }
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

    const pagosCita = await Pago.findAll({
        where: { cita_id: cita.id },
        transaction,
        lock: transaction.LOCK.UPDATE
    });
    const pagoExistente = pagosCita.find((pago) =>
        Number(pago.monto_online) > 0 || ["online", "mixto"].includes(pago.medio_pago)
    );
    const montoLocalExistente = Number(pagoExistente?.monto_local) || 0;
    const datosPago = {
        usuario_id: pagoReserva.usuario_id,
        servicio_id: pagoReserva.servicio_id,
        cita_id: cita.id,
        total_pago: Number(cita.precio_final) > 0
            ? Number(cita.precio_final)
            : montoOnline + montoLocalExistente,
        monto_online: montoOnline,
        monto_local: montoLocalExistente,
        medio_pago: montoLocalExistente > 0 ? "mixto" : "online",
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

    const usuarioId = req.user.id;
    const fecha = req.body?.fecha;
    const horaSolicitada = req.body?.hora;
    const empleadoId = Number(req.body?.empleado_id);
    const servicioId = Number(req.body?.servicio_id);
    const aplicarDescuento = req.body?.aplicar_descuento === true;
    const porcentajeDescuentoSolicitado = req.body?.porcentaje_descuento == null
        ? null
        : Number(req.body.porcentaje_descuento);
    const tipoPago = req.body?.tipo_pago === "completo" ? "completo" : "reserva";

    if (!horarioAtencionValido(horaSolicitada)) {
        return res.status(400).json({
            message: "El spa atiende de 8:00 a. m. a 6:00 p. m. Las citas duran una hora; la última debe iniciar a las 5:00 p. m."
        });
    }

    if (!validarFechaHoraReserva(fecha, horaSolicitada) || !Number.isInteger(empleadoId)
        || empleadoId < 1 || !Number.isInteger(servicioId) || servicioId < 1) {
        return res.status(400).json({ message: "Ingresa una fecha, hora, empleado y servicio válidos." });
    }

    if (porcentajeDescuentoSolicitado !== null
        && ![0, 5, 10, 15].includes(porcentajeDescuentoSolicitado)) {
        return res.status(400).json({ message: "El porcentaje de descuento seleccionado no es v\u00e1lido." });
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
                const conflicto = await buscarConflictoHorario({ empleadoId, fecha, hora, transaction });
                if (conflicto?.citaEnCurso) {
                    return { error: "El empleado tiene una cita en curso en este momento. Agenda a otra hora.", status: 409 };
                }
                if (conflicto?.cita) {
                    return { error: "El empleado ya tiene una cita en ese horario. Elige otra hora.", status: 409 };
                }
                if (conflicto?.reserva) {
                    return { error: "Este horario se cruza con una reserva que está completando el pago. Elige otra hora.", status: 409 };
                }

                const cita = await Cita.create({
                    fecha,
                    hora,
                    usuario_id: usuarioId,
                    empleado_id: empleadoId,
                    servicio_id: servicioId,
                    estado: "pendiente",
                    precio_original: null,
                    descuento_porcentaje: 0,
                    descuento_valor: 0,
                    precio_final: null
                }, { transaction });

                return { citaSinPago: cita };
            }

            if (!simulado) {
                if (
                    !process.env.WOMPI_PUBLIC_KEY
                    || !process.env.WOMPI_INTEGRITY_SECRET
                    || !process.env.WOMPI_EVENTS_SECRET
                    || !process.env.FRONTEND_URL
                ) {
                    return { error: "Los pagos en línea aún no están configurados. Contacta al salón.", status: 503 };
                }
                try {
                    new URL(process.env.FRONTEND_URL);
                } catch {
                    return { error: "La URL del sitio no está configurada correctamente para los pagos.", status: 503 };
                }
            }

          
            let descuentoPorcentaje = 0;
            let descuentoValor = 0;
            let puntosCanje = 0;

            const seleccionarDescuento = porcentajeDescuentoSolicitado === null
                ? aplicarDescuento
                : porcentajeDescuentoSolicitado > 0;
            if (seleccionarDescuento) {
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
                const porcentaje = porcentajeDescuentoSolicitado === null
                    ? NIVELES_DE_MAYOR_A_MENOR.find(
                        (nivel) => puntosLibres >= NIVELES_DESCUENTO[nivel].puntos
                    )
                    : porcentajeDescuentoSolicitado;
                const nivel = porcentaje ? NIVELES_DESCUENTO[porcentaje] : null;
                if (!nivel || puntosLibres < nivel.puntos) {
                    return { error: "No tienes puntos suficientes para el porcentaje de descuento seleccionado.", status: 400 };
                }

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

            const conflicto = await buscarConflictoHorario({ empleadoId, fecha, hora, transaction });
            if (conflicto?.citaEnCurso) {
                return { error: "El empleado tiene una cita en curso en este momento. Agenda a otra hora.", status: 409 };
            }
            if (conflicto?.cita) {
                return { error: "El empleado ya tiene una cita en ese horario. Elige otra hora.", status: 409 };
            }
            if (conflicto?.reserva) {
                return { error: "Este horario se cruza con una reserva que está completando el pago. Elige otra hora.", status: 409 };
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
                monto_credito: 0,
                monto_pagado: montoReserva,
                referencia: `JC${randomUUID().replace(/-/g, "").toUpperCase()}`,
                
                estado: simulado ? "aprobado" : "pendiente",
                expira_en: expiraEn,
                created_at: ahora,
                updated_at: ahora
            }, { transaction });

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

        if (resultado.citaSinPago) {
            return res.status(201).json({
                message: "Tu cita quedó reservada. El precio se acordará en el salón según el estado de tu cabello o las necesidades del servicio.",
                estado: "sin_pago",
                cita_id: resultado.citaSinPago.id
            });
        }

        const { pagoReserva } = resultado;
        if (pagoReserva.estado === "aprobado") {
            return res.status(201).json({
                message: simulado
                    ? "Reserva pagada (pago simulado en modo de pruebas). Tu cita quedó pendiente de confirmación del profesional."
                    : "Tu reserva quedó pagada. Tu cita quedó pendiente de confirmación del profesional.",
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

                console.log("Pago aprobado después del vencimiento; requiere atención manual.");
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

                console.log("Empleado no disponible; el pago requiere atención manual.");
                return;
            }

          
            const conflicto = await buscarConflictoHorario({
                empleadoId: pagoReserva.empleado_id,
                fecha: pagoReserva.fecha_reserva,
                hora: pagoReserva.hora_reserva,
                transaction,
                excluirReservaId: pagoReserva.id
            });

            if (conflicto) {
                pagoReserva.estado = "aprobado_abono";
                await pagoReserva.save({ transaction });

                console.log("Horario ocupado por cruce de citas; el pago requiere atención manual.");
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




