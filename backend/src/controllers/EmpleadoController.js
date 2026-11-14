import Cita from '../models/citas.js';
import Servicio from '../models/servicios.js';
import Usuario from '../models/Usuario.js';
import MovimientoPuntos from '../models/MovimientoPuntos.js';
import { Op } from "sequelize";

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
        const cita = await Cita.findOne({
            where: {
                id: id,
                empleado_id: empleadoId

            }
        });

        if (!cita) {
            return res.status(404).json({ message: 'Cita no encontrada' });
        }

        if (cita.estado === 'finalizada' || cita.estado === 'en_curso') {
            return res.status(400).json({ message: 'No se puede cancelar una cita en curso o finalizada' });
        }
        if (cita.estado === 'cancelada') {
            return res.status(400).json({ message: 'La cita ya está cancelada' });
        }

        await Cita.update(
            {
                estado: 'cancelada'
            },
            {
                where: {
                    id: id,
                    empleado_id: empleadoId
                }
            }

        );

        return res.status(200).json({ message: "Cita cancelada" });

    } catch (error) {
        return res.status(500).json({ message: "No se pudo cancelar la cita" });
    }

}


export async function finalizarCita(req, res) {
    try {
        const empleadoId = req.user.id;
        const id = req.params.id;

        const cita = await Cita.findOne({
            where: {
                id: id,
                empleado_id: empleadoId
            }
        });

        if (!cita) {
            return res.status(404).json({
                message: 'Cita no encontrada'
            });
        }

        if (cita.estado !== 'en_curso' || !cita.inicio_atencion) {
            return res.status(400).json({
                message: 'La cita debe estar en curso antes de finalizarla'
            });
        }

        const servicio = await Servicio.findByPk(cita.servicio_id);

        if (!servicio) {
            return res.status(404).json({
                message: 'Servicio no encontrado'
            });
        }

        const finAtencion = new Date();
        const duracionMinutos = Math.max(
            0,
            Math.floor((finAtencion.getTime() - new Date(cita.inicio_atencion).getTime()) / 60000)
        );
        cita.estado = 'finalizada';
        cita.fin_atencion = finAtencion;
        await cita.save();

        const puntos = Math.floor(Number(servicio.precio) / 1000);

        if (puntos > 0) {
            await MovimientoPuntos.create({
                usuario_id: cita.usuario_id,
                cita_id: cita.id,
                tipo: 'acumulacion',
                puntos: puntos,
                descripcion: `Puntos por el servicio: ${servicio.nombre}`
            });
        }

        return res.status(200).json({
            message: 'Cita finalizada',
            puntos_ganados: puntos,
            duracion_minutos: duracionMinutos
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: 'Error al finalizar la cita'
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


