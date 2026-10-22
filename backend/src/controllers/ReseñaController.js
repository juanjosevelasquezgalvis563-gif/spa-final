import Resena from "../models/reseña.js";
import Cita from "../models/citas.js";
import MovimientoPuntos from "../models/MovimientoPuntos.js";

export async function crearResena(req, res) {
    try {
        const usuarioId = req.user.id;
        const { cita_id, calificacion, comentario } = req.body;

        if (calificacion === 0) {
            return res.status(400).json({
                message: "Selecciona una calificacion"
            })
        }

        if (!Number.isInteger(calificacion) || calificacion < 1 || calificacion > 5) {
            return res.status(400).json({
                message: "La calificación debe estar entre 1 y 5 estrellas"
            });
        }

        if (comentario != null && (typeof comentario !== "string" || comentario.length > 500)) {
            return res.status(400).json({
                message: "El comentario no puede superar los 500 caracteres"
            });
        }

        if (!Number.isInteger(cita_id) || cita_id <= 0) {
            return res.status(400).json({
                message: "Debes seleccionar una cita válida"
            });
        }

        const cita = await Cita.findOne({
            where: {
                id: cita_id,
                usuario_id: usuarioId,
                estado: "finalizada"
            }
        });

        if (!cita) {
            return res.status(400).json({
                message: "La cita no existe, no te pertenece o no está finalizada"
            });
        }

        const resenaExistente = await Resena.findOne({
            where: { cita_id }
        });

        if (resenaExistente) {
            return res.status(409).json({
                message: "Ya has calificado esta cita"
            });
        }

        const nuevaResena = await Resena.create({
            usuario_id: usuarioId,
            cita_id,
            calificacion,
            comentario: comentario?.trim() || null
        });

        await MovimientoPuntos.create({
            usuario_id: usuarioId,
            resena_id: nuevaResena.id,
            tipo: "acumulacion",
            puntos: 20,
            descripcion: "Puntos por publicar una reseña"
        });

        return res.status(201).json({
            message: "Reseña registrada correctamente",
            puntos_ganados: 20,
            resena: nuevaResena
        });

    } catch (error) {
        console.error("Error al registrar reseña:", error);

        if (error.name === "SequelizeUniqueConstraintError") {
            return res.status(409).json({
                message: "Esta cita ya tiene una reseña"
            });
        }

        return res.status(500).json({
            message: "Error al registrar la reseña"
        });
    }
}

export async function obtenerResenas(req, res) {
    try {
        const resenas = await Resena.findAll({
            where: {
                usuario_id: req.user.id,
                estado: "visible"
            },
            order: [["fecha_creacion", "DESC"]]
        });

        const total = resenas.length;

        const promedio = total > 0
            ? Number((
                resenas.reduce((suma, resena) => suma + resena.calificacion, 0) / total
            ).toFixed(1))
            : 0;

        return res.status(200).json({
            total,
            promedio,
            resenas
        });

    } catch (error) {
        console.error("Error al obtener reseñas:", error);

        return res.status(500).json({
            message: "Error al consultar las reseñas"
        });
    }
}
