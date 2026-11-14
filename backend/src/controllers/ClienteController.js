import Servicio from '../models/servicios.js';
import Cita from '../models/citas.js';
import Usuario from '../models/Usuario.js';
import Resena from '../models/reseña.js';
import { Op, col, fn, where } from "sequelize";

const EMPLEADO_ESPECIALIDAD = {
    "valentina alvarez": "manicurista",
    "melany arango": "manicurista",
    "evelyn nino": "estilista",
    "steven piedradita": "estilista",
    "steven piedrahita": "estilista"
};

const SERVICIO_ESPECIALIDAD = {
    manicurista: [
        "uñas", "manicure", "manicura", "pedicure", "pedispa", "dipping",
        "rubber", "builder", "gel", "soft gel", "esculpidas", "retiro",
        "poly", "press", "nail", "nail art", "acrilicas"
    ],
    estilista: [
        "corte", "cepillado", "keratina", "tinte", "peinado", "maquillaje",
        "cabello", "color", "alisado", "estilo", "pestañas", "cejas",
        "depilacion", "hidratacion", "lifting", "laminado", "balayage",
        "social", "facial", "porcelanizacion", "limpieza"
    ]
};

const normalizarTexto = (valor = "") => String(valor)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const obtenerEspecialidadEmpleado = (empleado) => {
    const nombre = normalizarTexto(empleado?.nombre || "");
    return EMPLEADO_ESPECIALIDAD[nombre] || null;
};

const obtenerEspecialidadServicio = (servicio) => {
    const nombre = normalizarTexto(servicio?.nombre || "");

    if (!nombre) {
        return null;
    }

    for (const [especialidad, palabras] of Object.entries(SERVICIO_ESPECIALIDAD)) {
        if (palabras.some((palabra) => nombre.includes(palabra))) {
            return especialidad;
        }
    }

    return null;
};

const puedeRealizarServicio = (empleado, servicio) => {
    const especialidadEmpleado = obtenerEspecialidadEmpleado(empleado);
    const especialidadServicio = obtenerEspecialidadServicio(servicio);

    if (!especialidadEmpleado) {
        return true;
    }

    if (!especialidadServicio) {
        return true;
    }

    return especialidadEmpleado === especialidadServicio;
};

export async function servicios(req, res) {
    try {
        const servicio = await Servicio.findAll({
            attributes: ['id', 'nombre', 'precio'],
            order: [['id', 'ASC']]
        });
        res.json(servicio);

    } catch (error) {
        res.status(500).json({ message:'Error al obtener los servicios' });
    }
}

export async function empleadosDisponibles(req, res) {
    try {
        const { servicio_id } = req.query;

        let empleados = await Usuario.findAll({
            attributes: ['id', 'nombre'],
            where: { rol: 'empleado' },
            order: [['nombre', 'ASC']]
        });

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


export async function cliente(req, res) {
    try {
        const usuarioId = req.user.id;
        const { fecha, hora, empleado_id, servicio_id } = req.body;

        if (!fecha || !hora || !empleado_id || !servicio_id) {
            return res.status(400).json({
                message: "Todos los campos son requeridos"
            });
        }

        const empleado = await Usuario.findOne({
            where: { id: empleado_id, rol: 'empleado' }
        });

        if (!empleado) {
            return res.status(400).json({
                message: "Selecciona un empleado válido."
            });
        }

        const citaEnCurso = await Cita.findOne({
            where: {
                empleado_id,
                estado: 'en_curso',
                [Op.and]: where(fn('DATE', col('fecha')), fecha)
            },
            attributes: ['id']
        });

        if (citaEnCurso) {
            return res.status(409).json({
                message: "Este empleado tiene una cita en curso. Intenta agendarla unos minutos más tarde."
            });
        }

        const servicio = await Servicio.findOne({
            where: { id: servicio_id }
        });

        if (!servicio) {
            return res.status(404).json({
                message: "El servicio seleccionado no existe."
            });
        }

        if (!puedeRealizarServicio(empleado, servicio)) {
            return res.status(400).json({
                message: `Este empleado no puede realizar el servicio ${servicio.nombre}.`
            });
        }

        const horaNormalizada = hora.length === 5
            ? `${hora}:00`
            : hora;

        // Verificar si el empleado ya tiene una cita
        // en esa misma fecha y hora.
        const horaExistente = await Cita.findOne({
            where: {
                fecha,
                hora: horaNormalizada,
                empleado_id,
                estado: {
                    [Op.in]: ["pendiente", "confirmada"]
                }
            }
        });

        if (horaExistente) {
            return res.status(400).json({
                message: "El empleado ya tiene una cita a esa hora. Por favor, elige otra hora."
            });
        }

        await Cita.create({
            fecha,
            hora: horaNormalizada,
            usuario_id: usuarioId,
            empleado_id,
            servicio_id,
            estado: "pendiente"
        });

        return res.status(201).json({
            message: "Cita creada exitosamente"
        });

    } catch (error) {
        console.error("Error al crear la cita:", error);

        if (error.name === "SequelizeUniqueConstraintError") {
            return res.status(400).json({
                message: "El empleado ya tiene una cita a esa hora. Por favor, elige otra hora."
            });
        }

        return res.status(500).json({
            message: "No se pudo crear la cita"
        });
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
        return res.status(500).json({ message: "Error al cancelar su cita" });
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

        const empleado = await Usuario.findOne({
            where: { id: empleado_id, rol: 'empleado' }
        });

        if (!empleado) {
            return res.status(400).json({ message: 'Selecciona un empleado válido.' });
        }

        const servicio = await Servicio.findOne({
            where: { id: servicio_id }
        });

        if (!servicio) {
            return res.status(404).json({ message: 'El servicio seleccionado no existe.' });
        }

        if (!puedeRealizarServicio(empleado, servicio)) {
            return res.status(400).json({
                message: `Este empleado no puede realizar el servicio ${servicio.nombre}.`
            });
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
