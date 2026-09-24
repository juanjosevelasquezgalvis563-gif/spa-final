import Servicio from '../models/servicios.js';
import Cita from '../models/citas.js';
import Usuario from '../models/Usuario.js';
import { Op } from "sequelize";


export async function servicios(req, res) {
    try {
        const servicio = await Servicio.findAll({
            attributes: ['nombre', 'precio', 'image'],

        });
        res.json(servicio);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function cliente(req, res) {

    try {
        const usuarioId = req.user.id;
        const { fecha, hora, empleado_id, servicio_id } = req.body;
        if (!fecha || !hora || !empleado_id || !servicio_id) {
            return res.status(400).json({ error: 'Todos los campos son requeridos' });
        }
        const horaExistente = await Cita.findOne({
            where: {
                fecha: fecha,
                hora: hora,
                empleado_id: empleado_id
            }

        });

        if (horaExistente) {
            return res.status(400).json({ error: 'El empleado ya tiene una cita a esa hora, Por favor ingresa otra hora' });
        }
        await Cita.create({
            fecha,
            hora,
            usuario_id:usuarioId,
            empleado_id,
            servicio_id,
            estado: 'pendiente'
        });
        return res.status(201).json({ message: 'Cita creada exitosamente' });


    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

export async function obtenerCliente(req, res) {
    try {

        const usuarioId = req.user.id;

        const clientes = await Cita.findAll({
            where: {
                usuario_id: usuarioId
            },

            include: [
                {
                    model: Usuario,
                    as: "cliente",
                    attributes: ["nombre"]
                },
                {
                    model: Servicio,
                    attributes: ["nombre"]
                }
            ],

            order: [
                ["fecha", "ASC"],
                ["hora", "ASC"]
            ]
        });

        return res.json(clientes);

    } catch (error) {
        return res.status(500).json({
            error: error.message
        });
    }
}

export async function cancelarSuCita(req, res) {
    try {
        const usuarioId = req.user.id;
        const id = req.params.id;
        const cita = await Cita.findOne({
            where: {
                id: id,
                usuario_id: usuarioId,

            }
        });

        if (!cita) {
            return res.status(403).json({ message: 'Cita no encontrada' });
        }

        if (cita.estado === 'finalizada') {
            return res.status(403).json({ message: 'No se puede cancelar una cita finalizada' });
        }
        await Cita.update(
            {
                estado: 'cancelada'

            },
            {
                where: {
                    id: id,
                    usuario_id: usuarioId
                }
            }
        );

        return res.json({ message: 'Cita cancelada exitosamente' });
    } catch (error) {
        return res.status(500).json({ error: "Error al cancelar su cita" });
    }

}

export async function actualizarCita(req, res) {
    try {
        const usuarioId = req.user.id;
        const id = req.params.id;
        const { fecha, hora, empleado_id, servicio_id } = req.body;

        const cita = await Cita.findOne({
            where: {
                id: id,
                usuario_id: usuarioId,
            }
        });

        if (!cita) {
            return res.status(403).json({ message: 'Cita no encontrada' });
        }

        if (cita.estado === 'finalizada') {
            return res.status(403).json({ message: 'No se puede reprogramar una cita finalizada' });
        }
        if (cita.estado === 'cancelada') {
            return res.status(403).json({ message: 'No se puede reprogramar una cita cancelada' });
        }

        await Cita.update(
            {
                fecha,
                hora,
                empleado_id,
                servicio_id,
                estado: 'pendiente'
            },
            {
                where: {
                    id: id,
                    usuario_id: usuarioId
                }
            }
        );
        return res.status(200).json({ message: 'Cita actualizada exitosamente' });


    } catch (error) {
        return res.status(403).json({ error: "No se pudo actualizar tu cita" });
    }
}

export async function cantidadDeCitas(req, res) {
    try {
        const usuarioId = req.user.id;
        const CantidadCitas = await Cita.count({
            where: {
                usuario_id: usuarioId
            }
        });
        res.json(CantidadCitas);

    } catch (error) {
        return res.status(500).json({ error: "No se pudo obtener la cantidad de citas" });
    }
}

export async function citasPendientes(req, res) {
    try {
        const usuarioId = req.user.id;
        const citasPendientes = await Cita.count({
            where: {
                usuario_id: usuarioId,
                estado: 'pendiente'
            }
        });
        res.json(citasPendientes);

    } catch (error) {
        return res.status(403).json({ error: "No se pudo obtener la cantidad de citas pendientes" });
    }
}

export async function citasConfirmadas(req, res) {
    try {
        const usuarioId = req.user.id;
        const citasConfirmadas = await Cita.count({
            where: {
                usuario_id: usuarioId,
                estado: 'confirmada'
            }
        });
        res.json(citasConfirmadas);

    } catch (error) {
        return res.status(403).json({ error: "No se pudo obtener la cantidad de citas confirmadas" });
    }
}

export async function citasFinalizadas(req, res) {
    try {
        const usuarioId = req.user.id;
        const citasFinalizadas = await Cita.count({
            where: {
                usuario_id: usuarioId,
                estado: 'finalizada'
            }
        });
        res.json(citasFinalizadas);

    } catch (error) {
        return res.status(403).json({ error: "No se pudo obtener la cantidad de citas finalizadas" });
    }
}

export async function CitaRealizar(req, res) {
    try {
        const usuarioId = req.user.id;
        const CitaRealizar = await Cita.findOne({
            where: {
                usuario_id: usuarioId,
                estado: {
                    [Op.in]: ['pendiente', 'confirmada']
                }
            },
            include: [
                {
                    model: Usuario,
                    as: 'empleado',
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
        res.json(CitaRealizar);

    } catch (error) {
        return res.status(401).json({ error: "No se pudo obtener la sigueinte cita a realizar" });
    }
}

export async function ultimasCitas(req, res) {
    try {
        const usuarioId = req.user.id;
        const citas = await Cita.findAll({
            where: {
                usuario_id: usuarioId,
            },
            include: [
                {
                    model: Usuario,
                    as: 'empleado',
                    attributes: ['nombre']
                },
                {
                    model: Servicio,
                    attributes: ['nombre']

                }
            ],
            order: [
                ['fecha', 'DESC'],
                ['hora', 'DESC']
            ]

        });
        res.json(citas);
    } catch (error) {
        return res.status(401).json({ error: "No se pudo obtener las ultimas citas" });
    }
}
