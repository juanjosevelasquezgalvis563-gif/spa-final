import Cita from '../models/citas.js';
import Servicio from '../models/servicios.js';
import Usuario from '../models/Usuario.js';
import MovimientoPuntos from '../models/MovimientoPuntos.js';
import PagoReserva from '../models/PagoReserva.js';
import { Op } from "sequelize";
import db from "../config/db.js";
import { acreditarReservaCancelada } from "./PagoReservaController.js";
import {enviarCorreoCitaConfirmada} from "../utils/correo.js";
import { desglosarPrecioCita } from "../utils/precioCita.js";


const INCLUIR_RESERVA = {
    model: PagoReserva,
    as: 'reservasPago',
    attributes: ['monto_reserva', 'monto_credito', 'monto_pagado', 'estado'],
    required: false
};

function obtenerIdEmpleado(req) {
    return req.user?.empleadoActivoId || req.user?.id;
}

export async function empleado(req, res) {
    try {
        const empleadoId = obtenerIdEmpleado(req);

        const citas = await Cita.findAll({
            where: {
                empleado_id: empleadoId,
            },
            include: [
                {
                    model: Usuario,
                    as: 'cliente',
                    attributes: ['nombre']
                },
                {
                    model: Servicio,
                    attributes: ['nombre']
                },
                INCLUIR_RESERVA
            ],
            order:[
                ['fecha', 'DESC'],
                ['hora', 'ASC']
            ]

        });
        res.json(citas);

    } catch (error) {
        return res.status(500).json({ message:'Error al obtener las citas'});
    }
}


export async function citasHoy(req, res) {
    try {
        const empleadoId = obtenerIdEmpleado(req);
        const ahora = new Date();
        const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0);
        const finHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1, 0, 0, 0);

       
        const cantidad = await Cita.count({
            where: {
                empleado_id: empleadoId,
                estado: { [Op.in]: ['pendiente', 'confirmada', 'en_curso'] },

                fecha: {
                    [Op.gte]: inicioHoy,
                    [Op.lt]: finHoy
                }
            }
        });

        return res.json({
            Hoy: cantidad
        });

    } catch (error) {
        return res.status(500).json({
            message: "No se pudo obtener las citas de hoy"
        });
    }
}

export async function citasPendientesEmpleado(req, res) {
    try {

        const empleadoId = obtenerIdEmpleado(req);
        const citasPendientesEmpleado = await Cita.count({
            where: {
                empleado_id: empleadoId,
                estado: 'pendiente'
            }
        });
        res.json(citasPendientesEmpleado);

    } catch (error) {
        return res.status(500).json({ message: "no se pudo obtener las citas pendientes" });
    }
}

export async function citasFinalizadasEmpleado(req, res) {
    try {
        const empleadoId = obtenerIdEmpleado(req);
        const citasFinalizadas = await Cita.count({
            where: {
                empleado_id: empleadoId,
                estado: 'finalizada'
            }
        });
        res.json(citasFinalizadas);

    } catch (error) {
        return res.status(500).json({ message: "no se pudo obtener las citas finalizadas" });
    }
}



export async function comfirmarCita(req, res) {
    try {
        const empleadoId = obtenerIdEmpleado(req);
        const id = req.params.id;

        const cita = await Cita.findOne({
            where: {
                id: id,
                empleado_id: empleadoId
            },
            include: [
                {
                    model: Usuario,
                    as: 'cliente',
                    attributes: ['id', 'nombre', 'email']
                },
                {
                    model: Usuario,
                    as: 'empleado',
                    attributes: ['id', 'nombre']
                },
                {
                    model: Servicio,
                    attributes: ['id', 'nombre', 'precio']
                },
                INCLUIR_RESERVA
            ]
        });

        if (!cita) {
            return res.status(404).json({ message: 'Cita no encontrada' });
        }

        if (cita.estado !== 'pendiente') {
            return res.status(400).json({ message: 'Solo se pueden confirmar citas pendientes' });
        }

        cita.estado = 'confirmada';
        await cita.save();

      
        const reservaPagada = (cita.reservasPago || []).find(
            (reserva) => reserva.estado === 'aprobado'
        );
        const desglose = desglosarPrecioCita(cita, cita.Servicio, reservaPagada);

        const correoEnviado = await enviarCorreoCitaConfirmada({
            email: cita.cliente?.email,
            nombreCliente: cita.cliente?.nombre,
            servicio: cita.Servicio?.nombre,
            profesional: cita.empleado?.nombre,
            fecha: cita.fecha,
            hora: cita.hora,
            descuentoPorcentaje: desglose.descuentoPorcentaje,
            precioFinal: desglose.precioFinal,
            reservaPagada: desglose.reservaPagada,
            saldo: desglose.saldo
        });

        return res.status(200).json({
            message: correoEnviado
                ? 'Cita confirmada. Se envió un correo al cliente.'
                : 'Cita confirmada, pero no se pudo enviar el correo al cliente.',
            correo_enviado: correoEnviado
        });

    } catch (error) {
        console.error('Error al confirmar la cita:', error);
        return res.status(500).json({ message: 'error al comfirmar la cita' });
    }

}

export async function comenzarCita(req, res) {
    try {
        const cita = await Cita.findOne({
            where: {
                id: req.params.id,
                empleado_id: obtenerIdEmpleado(req)
            }
        });

        if (!cita) {
            return res.status(404).json({ message: 'Cita no encontrada' });
        }

        if (cita.estado !== 'confirmada') {
            return res.status(400).json({ message: 'Solo se puede comenzar una cita confirmada' });
        }

        cita.estado = 'en_curso';
        cita.inicio_atencion = new Date();
        cita.fin_atencion = null;
        await cita.save();

        return res.status(200).json({
            message: 'Servicio iniciado',
            inicio_atencion: cita.inicio_atencion
        });
    } catch (error) {
        console.error('Error al comenzar la cita:', error);
        return res.status(500).json({ message: 'No se pudo comenzar la cita' });
    }
}

export async function cancelarCita(req, res) {
    try {
        const empleadoId = obtenerIdEmpleado(req);
        const id = req.params.id;
        const resultado = await db.transaction(async (transaction) => {
            const cita = await Cita.findOne({
                where: { id, empleado_id: empleadoId },
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!cita) return { error: 'Cita no encontrada', status: 404 };
            if (cita.estado === 'finalizada' || cita.estado === 'en_curso') {
                return {
                    error: 'No se puede cancelar una cita en curso o finalizada',
                    status: 400
                };
            }
            if (cita.estado === 'cancelada') {
                return { error: 'La cita ya está cancelada', status: 400 };
            }

            cita.estado = 'cancelada';
            await cita.save({ transaction });
            await acreditarReservaCancelada(cita, transaction);
            return { message: 'Cita cancelada; el pago se conservó como abono del cliente.' };
        });

        if (resultado.error) return res.status(resultado.status).json({ message: resultado.error });
        return res.status(200).json({ message: resultado.message });

    } catch (error) {
        console.error('Error al cancelar la cita y conservar el abono:', error);
        return res.status(500).json({ message: "No se pudo cancelar la cita" });
    }

}



export async function finalizarCita(req, res) {
    try {
       
        const empleadoId = obtenerIdEmpleado(req);
        const citaId = Number(req.params.id);

        if (!citaId || !Number.isFinite(citaId) || citaId <= 0) {
            return res.status(400).json({ message: "ID de cita inválido." });
        }

        const resultado = await db.transaction(async (transaction) => {

            const cita = await Cita.findOne({
                where: {
                    id: citaId,
                    empleado_id: empleadoId
                },
                transaction
            });

            if (!cita) {
                return {
                    status: 404,
                    message: "Cita no encontrada o no te pertenece."
                };
            }

            if (
                cita.estado !== "en_curso" ||
                !cita.inicio_atencion
            ) {
                return {
                    status: 400,
                    message: "La cita debe estar en curso antes de finalizarla."
                };
            }

            const servicio = await Servicio.findByPk(
                cita.servicio_id,
                { transaction }
            );

            if (!servicio) {
                return {
                    status: 404,
                    message: "Servicio no encontrado."
                };
            }

            
            const movimientoExistente = await MovimientoPuntos.findOne({
                where: {
                    cita_id: cita.id,
                    tipo: "acumulacion"
                },
                transaction
            });

            if (movimientoExistente) {
                return {
                    status: 409,
                    message: "Esta cita ya tiene puntos acreditados."
                };
            }

            const finAtencion = new Date();

            const inicioMs = new Date(cita.inicio_atencion).getTime();
            if (!Number.isFinite(inicioMs)) {
                return {
                    status: 400,
                    message: "La fecha de inicio de la cita no es válida."
                };
            }

            const duracionMinutos = Math.max(
                0,
                Math.floor(
                    (finAtencion.getTime() - inicioMs) / 60000
                )
            );

        
            const precioOriginal = Number(cita.precio_original) > 0
                ? Math.round(Number(cita.precio_original))
                : Math.round(Number(servicio.precio) || 0);

            if (
                !Number.isFinite(precioOriginal) ||
                precioOriginal <= 0
            ) {
                return {
                    status: 400,
                    message: "El precio del servicio no es válido."
                };
            }

            const descuentoValor = Math.max(0, Math.round(Number(cita.descuento_valor) || 0));
            const descuento = Math.min(descuentoValor, precioOriginal);
            const precioFinal = precioOriginal - descuento;

            cita.precio_original = precioOriginal;
            cita.descuento_valor = descuento;
            cita.precio_final = precioFinal;

            cita.estado = "finalizada";
            cita.fin_atencion = finAtencion;

            await cita.save({ transaction });

           
            const puntos = Math.floor(precioOriginal / 2000);

            let puntosAcreditados = 0;

          
            if (puntos > 0 && Number.isInteger(cita.usuario_id) && cita.usuario_id > 0) {
                try {
                    await MovimientoPuntos.create({
                        usuario_id: cita.usuario_id,
                        cita_id: cita.id,
                        tipo: "acumulacion",
                        puntos,
                        fecha_creacion: new Date(),
                        descripcion:
                            `Puntos por finalizar el servicio: ${servicio.nombre}`.slice(0, 255)
                    }, { transaction });
                    puntosAcreditados = puntos;
                } catch (puntosError) {
                    console.error("No se pudo acreditar movimiento de puntos (no bloquea la cita):", {
                        message: puntosError.message,
                        citaId: cita.id,
                        usuario_id: cita.usuario_id,
                        puntos
                    });
                }
            }

            return {
                status: 200,
                message: "Cita finalizada correctamente.",
                puntos_ganados: puntosAcreditados,
                duracion_minutos: duracionMinutos,
                precio_original: precioOriginal,
                descuento_aplicado: descuento,
                precio_final: precioFinal
            };
        });

        return res.status(resultado.status).json(resultado);

    } catch (error) {
        console.error("Error al finalizar la cita:", {
            message: error.message,
            stack: error.stack,
            citaId: req.params.id,
            empleadoId: req.user?.id,
            empleadoActivoId: req.user?.empleadoActivoId
        });

        return res.status(500).json({
            message: "Error al finalizar la cita.",
            detalle: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
}


export async function citaRealizarEmpleado(req, res) {
    try {

        const empleadoId = obtenerIdEmpleado(req);
        const citaRealizarEmpleado = await Cita.findOne({
            where: {
                empleado_id: empleadoId,
                estado: {
                    [Op.in]: ['pendiente', 'confirmada', 'en_curso']
                },
            },
            include: [
                {
                    model: Usuario,
                    as: 'cliente',
                    attributes: ['nombre']
                },
                {
                    model: Servicio,
                    attributes: ['nombre']
                },
                INCLUIR_RESERVA
            ],

            order: [
                ['fecha', 'ASC'],
                ['hora', 'ASC']
            ]

        });
        return res.json(citaRealizarEmpleado)

    } catch (error) {
        return res.status(403).json({ message: "no se pudieron obtener las citas" })
    }
}

