import Cita from '../models/citas.js';
import Servicio from '../models/servicios.js';
import Usuario from '../models/Usuario.js';
import MovimientoPuntos from '../models/MovimientoPuntos.js';
import PagoReserva from '../models/PagoReserva.js';
import Resena from '../models/reseña.js';
import { Op } from "sequelize";
import db from "../config/db.js";
import {enviarCorreoCitaConfirmada} from "../utils/correo.js";
import { desglosarPrecioCita } from "../utils/precioCita.js";
import { fechaActualBogota } from "../utils/fechaHora.js";

const PESOS_POR_PUNTO_FIDELIZACION = 3000;

const INCLUIR_RESERVA = {
    model: PagoReserva,
    as: 'reservasPago',
    attributes: ['monto_reserva', 'monto_credito', 'monto_pagado', 'estado'],
    required: false
};

function obtenerIdEmpleado(req) {
    return req.user?.empleadoActivoId || req.user?.id;
}

export async function resenasEmpleado(req, res) {
    try {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        const empleadoId = Number(obtenerIdEmpleado(req));
        if (!Number.isInteger(empleadoId) || empleadoId <= 0) {
            return res.status(403).json({ message: 'No se pudo identificar al empleado de estas reseñas.' });
        }
        
        const citas = await Cita.findAll({
            attributes: ['id', 'fecha', 'servicio_id', 'empleado_id'],
            where: { empleado_id: empleadoId }
        });
        const citaIds = citas.map((cita) => Number(cita.id));
        const resenasEmpleado = citaIds.length
            ? await Resena.findAll({
                attributes: ['id', 'cita_id', 'calificacion', 'comentario', 'fecha_creacion'],
                where: { estado: 'visible', cita_id: { [Op.in]: citaIds } },
                order: [['fecha_creacion', 'DESC']]
            })
            : [];
        const citasPorId = new Map(citas.map((cita) => [Number(cita.id), cita]));
        const servicioIds = [...new Set(citas
            .filter((cita) => resenasEmpleado.some((resena) => Number(resena.cita_id) === Number(cita.id)))
            .map((cita) => cita.servicio_id)
            .filter(Boolean))];
        const servicios = servicioIds.length
            ? await Servicio.findAll({ where: { id: servicioIds }, attributes: ['id', 'nombre'] })
            : [];
        const nombresServicio = new Map(servicios.map((servicio) => [Number(servicio.id), servicio.nombre]));
        const resenas = resenasEmpleado.map((resena) => {
            const cita = citasPorId.get(Number(resena.cita_id));
            return {
                id: resena.id,
                calificacion: resena.calificacion,
                comentario: resena.comentario,
                fecha_creacion: resena.fecha_creacion,
                cita: {
                    id: cita.id,
                    fecha: cita.fecha,
                    servicio_id: cita.servicio_id,
                    empleado_id: Number(cita.empleado_id),
                    Servicio: { nombre: nombresServicio.get(Number(cita.servicio_id)) || 'Servicio' }
                }
            };
        });
        const total = resenas.length;
        const promedio = total
            ? Number((resenas.reduce((suma, resena) => suma + Number(resena.calificacion || 0), 0) / total).toFixed(1))
            : 0;

        return res.json({ empleado_id: empleadoId, total, promedio, resenas });
    } catch (error) {
        console.error('Error al consultar reseñas del empleado:', error);
        return res.status(500).json({ message: 'No se pudieron cargar las reseñas.' });
    }
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
                    attributes: ['nombre', 'precio']
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
        const hoy = fechaActualBogota();
        const cantidad = await Cita.count({
            where: {
                empleado_id: empleadoId,
                estado: { [Op.in]: ['pendiente', 'confirmada', 'en_curso'] },
                fecha: hoy
            }
        });

        return res.json({
            Hoy: cantidad,
            fecha: hoy
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



async function enviarCorreoConfirmacionCita(cita) {
    const reservaPagada = (cita.reservasPago || []).find(
        (reserva) => reserva.estado === 'aprobado'
    );
    const desglose = desglosarPrecioCita(cita, cita.Servicio, reservaPagada);

    return enviarCorreoCitaConfirmada({
        email: cita.cliente?.email,
        emailProfesional: cita.empleado?.email,
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
}

async function procesarCorreoConfirmacionCita(citaId) {
    try {
        const cita = await Cita.findByPk(citaId, {
            include: [
                { model: Usuario, as: 'cliente', attributes: ['id', 'nombre', 'email'] },
                { model: Usuario, as: 'empleado', attributes: ['id', 'nombre', 'email'] },
                { model: Servicio, attributes: ['id', 'nombre', 'precio'] },
                INCLUIR_RESERVA
            ]
        });
        if (!cita || cita.estado !== 'confirmada') return;
        const enviado = await enviarCorreoConfirmacionCita(cita);
        await Cita.update(
            { correo_confirmacion_estado: enviado ? 'enviado' : 'fallido' },
            { where: { id: citaId, estado: 'confirmada' } }
        );
    } catch (error) {
        console.error('No se pudo completar el correo de confirmación:', error);
        await Cita.update(
            { correo_confirmacion_estado: 'fallido' },
            { where: { id: citaId, estado: 'confirmada' } }
        ).catch((updateError) => console.error('No se pudo guardar el estado del correo:', updateError));
    }
}

export async function comfirmarCita(req, res) {
    try {
        const empleadoId = obtenerIdEmpleado(req);
        const cita = await Cita.findOne({
            where: { id: req.params.id, empleado_id: empleadoId },
            include: [
                { model: Usuario, as: 'cliente', attributes: ['id', 'nombre', 'email'] },
                { model: Usuario, as: 'empleado', attributes: ['id', 'nombre', 'email'] },
                { model: Servicio, attributes: ['id', 'nombre', 'precio'] },
                INCLUIR_RESERVA
            ]
        });

        if (!cita) return res.status(404).json({ message: 'Cita no encontrada' });

        if (cita.estado === 'confirmada') {
            if (req.body?.reenviar_correo === true) {
                if (cita.correo_confirmacion_estado !== 'fallido') {
                    return res.status(200).json({
                        message: cita.correo_confirmacion_estado === 'enviado'
                            ? 'El correo ya fue enviado al cliente.'
                            : 'El correo ya está en proceso de envío.',
                        correo_enviado: cita.correo_confirmacion_estado === 'enviado',
                        correo_pendiente: cita.correo_confirmacion_estado === 'pendiente',
                        ya_confirmada: true
                    });
                }
                const [reintentoEncolado] = await Cita.update(
                    { correo_confirmacion_estado: 'pendiente' },
                    { where: { id: cita.id, estado: 'confirmada', correo_confirmacion_estado: 'fallido' } }
                );
                if (!reintentoEncolado) {
                    return res.status(409).json({ message: 'El correo ya fue procesado. Actualiza el panel para ver su estado.' });
                }
                void procesarCorreoConfirmacionCita(cita.id);
                return res.status(200).json({
                    message: 'Cita confirmada. Se está enviando el correo al cliente.',
                    correo_enviado: null,
                    correo_pendiente: true,
                    ya_confirmada: true
                });
            }
            return res.status(200).json({
                message: cita.correo_confirmacion_estado === 'pendiente'
                    ? 'La cita está confirmada y el correo se está enviando.'
                    : 'La cita ya estaba confirmada.',
                correo_enviado: cita.correo_confirmacion_estado === 'enviado',
                correo_pendiente: cita.correo_confirmacion_estado === 'pendiente',
                ya_confirmada: true
            });
        }

        if (cita.estado !== 'pendiente') {
            return res.status(400).json({ message: 'Solo se pueden confirmar citas pendientes' });
        }

        const [actualizadas] = await Cita.update(
            { estado: 'confirmada', correo_confirmacion_estado: 'pendiente' },
            { where: { id: cita.id, empleado_id: empleadoId, estado: 'pendiente' } }
        );
        if (!actualizadas) {
            const actual = await Cita.findOne({
                where: { id: cita.id, empleado_id: empleadoId },
                attributes: ['estado', 'correo_confirmacion_estado']
            });
            if (actual?.estado === 'confirmada') {
                return res.status(200).json({
                    message: 'La cita ya estaba confirmada.',
                    correo_enviado: actual.correo_confirmacion_estado === 'enviado',
                    correo_pendiente: actual.correo_confirmacion_estado === 'pendiente',
                    ya_confirmada: true
                });
            }
            return res.status(400).json({ message: 'Solo se pueden confirmar citas pendientes' });
        }

        void procesarCorreoConfirmacionCita(cita.id);
        return res.status(200).json({
            message: 'Cita confirmada. Se está enviando el correo al cliente.',
            correo_enviado: null,
            correo_pendiente: true
        });
    } catch (error) {
        console.error('Error al confirmar la cita:', error);
        return res.status(500).json({ message: 'No se pudo confirmar la cita.' });
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
            return { message: 'Cita cancelada.' };
        });

        if (resultado.error) return res.status(resultado.status).json({ message: resultado.error });
        return res.status(200).json({ message: resultado.message });

    } catch (error) {
        console.error('Error al cancelar la cita:', error);
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
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!cita) {
                return {
                    status: 404,
                    message: "Cita no encontrada o no te pertenece."
                };
            }

            if (cita.estado === "finalizada") {
                return {
                    status: 200,
                    message: "La cita ya estaba finalizada.",
                    ya_finalizada: true,
                    precio_original: Number(cita.precio_original) || 0,
                    precio_final: Number(cita.precio_final) || 0
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

        
            const precioConfigurado = Number(servicio.precio);
            const servicioTienePrecioFijo = Number.isFinite(precioConfigurado) && precioConfigurado > 0;
            const precioIngresado = Number(req.body?.precio_servicio);
            const precioOriginal = Number(cita.precio_original) > 0
                ? Math.round(Number(cita.precio_original))
                : servicioTienePrecioFijo
                    ? Math.round(precioConfigurado)
                    : Number.isFinite(precioIngresado) && precioIngresado > 0
                        ? Math.round(precioIngresado)
                        : 0;

            if (
                !Number.isFinite(precioOriginal) ||
                precioOriginal <= 0
            ) {
                return {
                    status: 400,
                    message: "Indica el precio acordado con el cliente para finalizar este servicio."
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

           
            const puntos = Math.floor(precioOriginal / PESOS_POR_PUNTO_FIDELIZACION);

            let puntosAcreditados = 0;

          
            if (!movimientoExistente && puntos > 0 && Number.isInteger(cita.usuario_id) && cita.usuario_id > 0) {
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


