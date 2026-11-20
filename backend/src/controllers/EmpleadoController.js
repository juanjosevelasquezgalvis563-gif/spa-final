import Cita from '../models/citas.js';
import Servicio from '../models/servicios.js';
import Usuario from '../models/Usuario.js';
import MovimientoPuntos from '../models/MovimientoPuntos.js';
import { Op } from "sequelize";
import db from "../config/db.js";
import { acreditarReservaCancelada } from "./PagoReservaController.js";

export async function empleado(req, res) {
    try {
        const empleadoId = req.user.id;

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
                }

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
        const empleadoId = req.user.id;
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

        const empleadoId = req.user.id;
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
        const empleadoId = req.user.id;
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
        const empleadoId = req.user.id;
        const id = req.params.id;
        const cita = await Cita.findOne({
            where:{
                id:id,
                empleado_id:empleadoId
            }
        });

        if (!cita) {
            return res.status(404).json({ message: 'Cita no encontrada' });
        }

        if (cita.estado !== 'pendiente') {
            return res.status(400).json({ message: 'Solo se pueden confirmar citas pendientes' });
        }

        cita.estado = 'confirmada';
        await cita.save();

        return res.status(200).json({ message: 'Cita confirmada' });

    } catch (error) {
        return res.status(401).json({ message: 'error al comfirmar la cita' });
    }

}

export async function comenzarCita(req, res) {
    try {
        const cita = await Cita.findOne({
            where: {
                id: req.params.id,
                empleado_id: req.user.id
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
        const empleadoId = req.user.id;
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
        const empleadoId = req.user.id;
        const id = req.params.id;

        const resultado = await db.transaction(async (transaction) => {

            // Buscar y bloquear la cita para evitar procesos duplicados.
            const cita = await Cita.findOne({
                where: {
                    id,
                    empleado_id: empleadoId
                },
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!cita) {
                return {
                    status: 404,
                    message: "Cita no encontrada"
                };
            }

            if (cita.estado !== "en_curso" || !cita.inicio_atencion) {
                return {
                    status: 400,
                    message: "La cita debe estar en curso antes de finalizarla"
                };
            }

            const servicio = await Servicio.findByPk(
                cita.servicio_id,
                { transaction }
            );

            if (!servicio) {
                return {
                    status: 404,
                    message: "Servicio no encontrado"
                };
            }

            // Verificar que no existan puntos acreditados anteriormente.
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
                    message: "Esta cita ya tiene puntos acreditados"
                };
            }

            const finAtencion = new Date();

            const duracionMinutos = Math.max(
                0,
                Math.floor(
                    (finAtencion.getTime() -
                    new Date(cita.inicio_atencion).getTime()) / 60000
                )
            );

            // Un punto por cada $2.000 del servicio.
            const puntos = Math.floor(
                Number(servicio.precio) / 2000
            );

            if (!Number.isFinite(puntos) || puntos < 0) {
                throw new Error("El precio del servicio no es válido");
            }

            cita.estado = "finalizada";
            cita.fin_atencion = finAtencion;

            await cita.save({ transaction });

            if (puntos > 0) {
                await MovimientoPuntos.create({
                    usuario_id: cita.usuario_id,
                    cita_id: cita.id,
                    tipo: "acumulacion",
                    puntos,
                    descripcion:
                        `Puntos por finalizar el servicio: ${servicio.nombre}`
                }, { transaction });
            }

            return {
                status: 200,
                message: "Cita finalizada correctamente",
                puntos_ganados: puntos,
                duracion_minutos: duracionMinutos
            };
        });

        return res.status(resultado.status).json(resultado);

    } catch (error) {
        console.error("Error al finalizar la cita:", error);

        return res.status(500).json({
            message: "Error al finalizar la cita"
        });
    }
}




export async function citaRealizarEmpleado(req, res) {
    try {

        const empleadoId = req.user.id;
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
                }
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


