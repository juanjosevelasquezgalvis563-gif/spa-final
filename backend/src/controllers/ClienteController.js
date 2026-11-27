import Servicio from '../models/servicios.js';
import Cita from '../models/citas.js';
import Usuario from '../models/Usuario.js';
import Resena from '../models/reseña.js';
import PagoReserva from '../models/PagoReserva.js';
import Pago from '../models/pagos.js';
import db from "../config/db.js";
import { Op } from "sequelize";
import { esEmpleadoRetirado, puedeRealizarServicio, whereEmpleadoElegible } from "../utils/servicios.js";
import { horarioAtencionValido, normalizarHoraReserva, validarFechaHoraReserva } from "../utils/fechaHora.js";

export async function servicios(req, res) {
    try {
        const empleadoId = Number(req.query.empleado_id);
        const servicio = await Servicio.findAll({
            attributes: ['id', 'nombre', 'precio'],
            order: [['id', 'ASC']]
        });
        if (!Number.isInteger(empleadoId) || empleadoId <= 0) return res.json(servicio);
        const empleado = await Usuario.findOne({ where: { id: empleadoId, ...whereEmpleadoElegible() }, attributes: ['id', 'nombre', 'rol', 'es_empleado'] });
        if (!empleado || esEmpleadoRetirado(empleado)) return res.status(404).json({ message: 'No encontramos el empleado asignado a la cita.' });
        return res.json(servicio.filter((item) => puedeRealizarServicio(empleado, item)));

    } catch (error) {
        res.status(500).json({ message:'Error al obtener los servicios' });
    }
}

export async function empleadosDisponibles(req, res) {
    try {
        const { servicio_id } = req.query;

        let empleados = await Usuario.findAll({
            attributes: ['id', 'nombre', 'rol', 'es_empleado'],
            where: whereEmpleadoElegible(),
            order: [['nombre', 'ASC']]
        });
        empleados = empleados.filter((empleado) => !esEmpleadoRetirado(empleado));

        if (servicio_id) {
            const servicio = await Servicio.findOne({
                where: { id: servicio_id }
            });

            if (!servicio) {
                return res.status(404).json({ message: 'El servicio seleccionado no existe.' });
            }

            empleados = empleados.filter((empleado) => puedeRealizarServicio(empleado, servicio));
        }

        return res.json(empleados.map((empleado) => ({
            id: empleado.id,
            nombre: empleado.nombre || 'Empleado'
        })));
    } catch (error) {
        return res.status(500).json({ message: 'Error al obtener los empleados disponibles' });
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
                },
                {
                    model: PagoReserva,
                    as: "reservasPago",
                    attributes: ["monto_reserva", "monto_credito", "monto_pagado", "estado"],
                    required: false
                }
            ],

            order: [
                ["fecha", "DESC"],
                ["hora", "ASC"]
            ]
        });

        return res.json(clientes);

    } catch (error) {
        return res.status(500).json({
            message:' Error al obtener las citas del cliente'
        });
    }
}

export async function cancelarSuCita(req, res) {
    try {
        const usuarioId = req.user.id;
        const id = req.params.id;
        const resultado = await db.transaction(async (transaction) => {
            const cita = await Cita.findOne({
                where: { id, usuario_id: usuarioId },
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!cita) return { error: 'Cita no encontrada', status: 404 };
            if (cita.estado === 'finalizada') {
                return { error: 'No se puede cancelar una cita finalizada', status: 403 };
            }
            if (cita.estado === 'cancelada') {
                return { error: 'La cita ya está cancelada', status: 400 };
            }

            cita.estado = 'cancelada';
            await cita.save({ transaction });
            return { message: 'Cita cancelada.' };
        });

        if (resultado.error) return res.status(resultado.status).json({ message: resultado.error });
        return res.json({ message: resultado.message });
    } catch (error) {
        console.error('Error al cancelar la cita:', error);
        return res.status(500).json({ message: "No se pudo cancelar la cita" });
    }

}

export async function actualizarCita(req, res) {
    try {
        const usuarioId = req.user.id;
        const id = req.params.id;
        const { fecha, hora, empleado_id, servicio_id } = req.body;

        if (!horarioAtencionValido(hora)) {
            return res.status(400).json({
                message: "El spa atiende de 8:00 a. m. a 6:00 p. m. Las citas duran una hora; la última debe iniciar a las 5:00 p. m."
            });
        }

        if (
            !validarFechaHoraReserva(fecha, hora)
            || !empleado_id
            || !servicio_id
        ) {
            return res.status(400).json({ message: 'Completa fecha, hora, empleado y servicio.' });
        }

        const resultado = await db.transaction(async (transaction) => {
            const empleado = await Usuario.findOne({
                where: { id: empleado_id, ...whereEmpleadoElegible() },
                transaction,
                lock: transaction.LOCK.UPDATE
            });
            if (!empleado) return { error: 'Selecciona un empleado válido.', status: 400 };

            const cita = await Cita.findOne({
                where: { id, usuario_id: usuarioId },
                transaction,
                lock: transaction.LOCK.UPDATE
            });
            if (!cita) return { error: 'Cita no encontrada', status: 404 };
            if (cita.estado === 'finalizada') {
                return { error: 'No se puede reprogramar una cita finalizada', status: 403 };
            }
            if (cita.estado === 'cancelada') {
                return { error: 'No se puede reprogramar una cita cancelada', status: 403 };
            }

            const servicio = await Servicio.findByPk(servicio_id, { transaction });
            if (!servicio) return { error: 'El servicio seleccionado no existe.', status: 404 };
            if (!puedeRealizarServicio(empleado, servicio)) {
                return {
                    error: `Este empleado no puede realizar el servicio ${servicio.nombre}.`,
                    status: 400
                };
            }

            const reservaPagada = await PagoReserva.findOne({
                where: { cita_id: cita.id, estado: 'aprobado' },
                transaction,
                lock: transaction.LOCK.UPDATE
            });
            if (reservaPagada && Number(cita.servicio_id) !== Number(servicio.id)) {
                return {
                    error: 'Para cambiar el servicio, cancela esta cita y realiza una nueva reserva.',
                    status: 400
                };
            }

            const horaNormalizada = normalizarHoraReserva(hora);
            const citaEnEseHorario = await Cita.findOne({
                where: {
                    id: { [Op.ne]: cita.id },
                    fecha,
                    hora: horaNormalizada,
                    empleado_id,
                    estado: { [Op.in]: ['pendiente', 'confirmada', 'en_curso'] }
                },
                transaction,
                lock: transaction.LOCK.UPDATE
            });
            if (citaEnEseHorario) {
                return { error: 'El empleado ya tiene una cita a esa hora. Elige otro horario.', status: 409 };
            }

            cita.fecha = fecha;
            cita.hora = horaNormalizada;
            cita.empleado_id = empleado_id;
            cita.servicio_id = servicio_id;
            cita.estado = reservaPagada ? 'confirmada' : 'pendiente';
            await cita.save({ transaction });
            if (reservaPagada) {
                reservaPagada.fecha_reserva = fecha;
                reservaPagada.hora_reserva = horaNormalizada;
                reservaPagada.empleado_id = empleado_id;
                reservaPagada.updated_at = new Date();
                await reservaPagada.save({ transaction });
            }
            return { message: 'Cita actualizada exitosamente' };
        });

        if (resultado.error) return res.status(resultado.status).json({ message: resultado.error });
        return res.status(200).json({ message: resultado.message });


    } catch (error) {
        return res.status(403).json({ message: "No se pudo actualizar tu cita" });
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
        return res.status(500).json({ message: "No se pudo obtener la cantidad de citas" });
    }
}


export async function citasPendientes(req, res) {
    try {
        res.set('Cache-Control', 'no-store, max-age=0');
        const usuarioId = req.user.id;
        const citasPendientes = await Cita.count({
            where: {
                usuario_id: usuarioId,
                estado: 'pendiente'
            }
        });
        res.json(citasPendientes);

    } catch (error) {
        return res.status(403).json({ message: "No se pudo obtener la cantidad de citas pendientes" });
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
        return res.status(403).json({ message: "No se pudo obtener la cantidad de citas confirmadas" });
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
        return res.status(403).json({ message: "No se pudo obtener la cantidad de citas finalizadas" });
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
        return res.status(401).json({ message: "No se pudo obtener la sigueinte cita a realizar" });
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
                ['hora', 'ASC']
            ]

        });
        res.json(citas);
    } catch (error) {
        return res.status(401).json({ message: "No se pudo obtener las ultimas citas" });
    }
}


export async function obtenerCitasParaResena(req, res) {
  try {
    const usuarioId = req.user.id;

    const citas = await Cita.findAll({
      where: {
        usuario_id: usuarioId,
        estado: "finalizada"
      },
      include: [
        {
          model: Servicio,
          attributes: ["nombre"]
        },
        {
          model: Usuario,
          as: "empleado",
          attributes: ["nombre"]
        }
      ],
      order: [
        ["fecha", "DESC"],
        ["hora", "DESC"]
      ]
    });

    const resenas = await Resena.findAll({
      where: {
        usuario_id: usuarioId
      },
      attributes: ["cita_id"]
    });

    const citasCalificadas = resenas.map(
      (resena) => Number(resena.cita_id)
    );

    const citasSinResena = citas.filter(
      (cita) => !citasCalificadas.includes(Number(cita.id))
    );

    return res.status(200).json(citasSinResena);

  } catch (error) {
    console.error("Error al consultar citas para reseña:", error);

    return res.status(500).json({
      message: "Error al consultar las citas para calificar"
    });
  }
}



export async function citasParaDescuento(req, res) {
    try {
        const usuarioId = req.user.id;

        const citas = await Cita.findAll({
            where: {
                usuario_id: usuarioId,
                estado: ["pendiente", "confirmada"],
                descuento_porcentaje: 0
            },
            include: [
                {
                    model: Servicio,
                    attributes: ["id", "nombre", "precio"]
                }
            ],
            order: [
                ["fecha", "ASC"],
                ["hora", "ASC"]
            ]
        });

        const citasConPrecio = citas.filter((cita) => Number(cita.Servicio?.precio) > 0);
        if (citasConPrecio.length === 0) return res.status(200).json([]);

        const idsCitas = citasConPrecio.map((cita) => cita.id);
        const [pagosRegistrados, reservasAprobadas] = await Promise.all([
            Pago.findAll({ where: { cita_id: { [Op.in]: idsCitas } }, attributes: ['cita_id'] }),
            PagoReserva.findAll({
                where: { cita_id: { [Op.in]: idsCitas }, estado: 'aprobado' },
                attributes: ['cita_id']
            })
        ]);
        const citasConPago = new Set([
            ...pagosRegistrados.map((pago) => Number(pago.cita_id)),
            ...reservasAprobadas.map((reserva) => Number(reserva.cita_id))
        ]);

        return res.status(200).json(
            citasConPrecio.filter((cita) => !citasConPago.has(Number(cita.id)))
        );

    } catch (error) {
        console.error("Error consultando citas para descuento:", error);

        return res.status(500).json({
            message: "No se pudieron consultar las citas."
        });
    }
}


