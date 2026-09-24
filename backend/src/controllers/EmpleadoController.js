import Cita from '../models/citas.js';
import Servicio from '../models/servicios.js';
import Usuario from '../models/Usuario.js';
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

            ]

        });
        res.json(citas);

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}


export async function citasHoy(req, res) {
    try {
        const empleadoId = req.user.id;

        const cantidad = await Cita.count({
            where: {
                empleado_id: empleadoId,

                fecha: {
                    [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)),
                    [Op.lt]: new Date(new Date().setHours(24, 0, 0, 0))
                }
            }
        });

        return res.json({
            Hoy: cantidad
        });

    } catch (error) {
        return res.status(500).json({
            error: "No se pudo obtener las citas de hoy"
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
        return res.status(500).json({ error: "no se pudo obtener las citas pendientes" });
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
        return res.status(500).json({ error: "no se pudo obtener las citas finalizadas" });
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

        if (cita.estado === 'confirmada') {
            return res.status(400).json({ message: 'No se puede confirmar una cita que ya esta confirmada' });
        }

        if (cita.estado === 'finalizada') {
            return res.status(400).json({ message: 'No se puede confirmar una cita que ya esta finalizada' });
        }

        if (cita.estado === 'cancelada') {
            return res.status(400).json({ message: 'No se puede confirmar una cita que ya esta cancelada' });
        }
        await Cita.update(
            {
                estado: 'confirmada'
            },
            {
                where: {
                    id: id
                }
            }
        );

        return res.status(200).json({ message: 'Cita confirmada' });

    } catch (error) {
        return res.status(401).json({ error: 'error al comfirmar la cita' });
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

        if (cita.estado === 'finalizada') {
            return res.status(401).json({ message: 'No se puede cancelar una cita finalizada' });
        }
        if (cita.estado === 'cancelada') {
            return res.status(400).json({ message: 'No se puede finalizar una cita que ya esta cancelada' });

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
        return res.status(500).json({ error: "No se pudo cancelar la cita" });
    }

}

export async function finalizarCita(req, res) {
    try {
        const empleadoId = req.user.id;
        const id = req.params.id;
        const finalizarCita = await Cita.findOne({
            where:{
                id:id,
                empleado_id:empleadoId
            }
        });

        if (!finalizarCita) {
            return res.status(404).json({ message: 'Cita no encontrada' });
        }
        await Cita.update(
            {
                estado: 'finalizada'
            },
            {
                where: {
                    id: id,
                    empleado_id: empleadoId
                }
            }

        );

        return res.status(200).json({ message: 'Cita finalizada' });
    } catch (error) {
        return res.status(500).json({ error: 'Error al finalizar la cita' });
    }
}

export async function citaRealizarEmpleado(req, res) {
    try {

        const empleadoId = req.user.id;
        const citaRealizarEmpleado = await Cita.findOne({
            where: {
                empleado_id: empleadoId,
                estado: {
                    [Op.in]: ['pendiente', 'confirmada']
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
        res.json(citaRealizarEmpleado)

    } catch (error) {
        return res.status(403).json({ error: "no se pudieron obtener las citas" })
    }
}