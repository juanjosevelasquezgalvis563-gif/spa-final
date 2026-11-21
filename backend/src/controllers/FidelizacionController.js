
import db from "../config/db.js";

import MovimientoPuntos from "../models/MovimientoPuntos.js";
import Usuario from "../models/Usuario.js";
import Cita from "../models/citas.js";
import Servicio from "../models/servicios.js";
import Pago from "../models/pagos.js";

const NIVELES_DESCUENTO = {
    5: {
        puntos: 300,
        porcentaje: 5,
        descuentoMaximo: 6000
    },
    10: {
        puntos: 600,
        porcentaje: 10,
        descuentoMaximo: 12000
    },
    15: {
        puntos: 900,
        porcentaje: 15,
        descuentoMaximo: 18000
    }
};

async function calcularSaldo(usuarioId, transaction = null) {
    const movimientos = await MovimientoPuntos.findAll({
        where: { usuario_id: usuarioId },
        order: [["fecha_creacion", "DESC"]],
        ...(transaction ? { transaction } : {})
    });

    let saldo = 0;

    for (const movimiento of movimientos) {
        const puntos = Number(movimiento.puntos);

        if (movimiento.tipo === "acumulacion" ||
            movimiento.tipo === "ajuste") {
            saldo += puntos;
        }

        if (movimiento.tipo === "canje") {
            saldo -= puntos;
        }
    }

    return { saldo, movimientos };
}

// CONSULTAR FIDELIZACIÓN
export async function obtenerFidelizacion(req, res) {
    try {
        const usuarioId = req.user.id;

        const { saldo, movimientos } = await calcularSaldo(usuarioId);

        let descuentoDisponible = 0;

        for (const nivel of [5, 10, 15]) {
            if (saldo >= NIVELES_DESCUENTO[nivel].puntos) {
                descuentoDisponible = nivel;
            }
        }

        const nivel = NIVELES_DESCUENTO[descuentoDisponible];

        return res.status(200).json({
            saldo_puntos: saldo,
            descuentoDisponible,
            descuentoMaximo: nivel?.descuentoMaximo || 0,
            niveles: Object.values(NIVELES_DESCUENTO),
            historial: movimientos
        });

    } catch (error) {
        console.error("Error fidelización:", error);

        return res.status(500).json({
            message: "Error al consultar la fidelización."
        });
    }
}

// CANJEAR DESCUENTO PARA UNA CITA
export async function canjearDescuento(req, res) {
    try {
        const usuarioId = req.user.id;
        const citaId = Number(req.body.cita_id);
        const porcentaje = Number(req.body.porcentaje);

        const nivel = NIVELES_DESCUENTO[porcentaje];

        if (
            !Number.isInteger(citaId) ||
            citaId <= 0 ||
            !nivel
        ) {
            return res.status(400).json({
                message: "Los datos del descuento no son válidos."
            });
        }

        const resultado = await db.transaction(async (transaction) => {

            const usuario = await Usuario.findByPk(usuarioId, {
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!usuario) {
                return {
                    error: "Usuario no encontrado.",
                    status: 404
                };
            }

            const cita = await Cita.findOne({
                where: {
                    id: citaId,
                    usuario_id: usuarioId,
                    estado: ["pendiente", "confirmada"]
                },
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!cita) {
                return {
                    error: "La cita no existe, no te pertenece o no permite descuentos.",
                    status: 404
                };
            }

            if (Number(cita.descuento_porcentaje) > 0) {
                return {
                    error: "Esta cita ya tiene un descuento aplicado.",
                    status: 409
                };
            }

            // No permitir descuentos después de registrar el pago.
            const pagoExistente = await Pago.findOne({
                where: { cita_id: citaId },
                transaction
            });

            if (pagoExistente) {
                return {
                    error: "Esta cita ya tiene un pago registrado.",
                    status: 409
                };
            }

            const { saldo } = await calcularSaldo(
                usuarioId,
                transaction
            );

            if (saldo < nivel.puntos) {
                return {
                    error: "No tienes suficientes puntos.",
                    status: 400
                };
            }

            const servicio = await Servicio.findByPk(
                cita.servicio_id,
                { transaction }
            );

            if (!servicio) {
                return {
                    error: "No se encontró el servicio.",
                    status: 404
                };
            }

            const precioOriginal = Math.round(
                Number(cita.precio_original) > 0
                    ? Number(cita.precio_original)
                    : Number(servicio.precio)
            );

            if (
                !Number.isFinite(precioOriginal) ||
                precioOriginal <= 0
            ) {
                return {
                    error: "El precio del servicio no es válido.",
                    status: 400
                };
            }

            const descuento = Math.min(
                Math.round(precioOriginal * porcentaje / 100),
                nivel.descuentoMaximo
            );

            const precioFinal = precioOriginal - descuento;

            cita.precio_original = precioOriginal;
            cita.descuento_porcentaje = porcentaje;
            cita.descuento_valor = descuento;
            cita.precio_final = precioFinal;

            await cita.save({ transaction });

            await MovimientoPuntos.create({
                usuario_id: usuarioId,
                cita_id: citaId,
                tipo: "canje",
                puntos: nivel.puntos,
                descripcion:
                    `Canje ${porcentaje}% de descuento. ` +
                    `Descuento: $${descuento} COP`
            }, { transaction });

            return {
                porcentaje,
                puntos_utilizados: nivel.puntos,
                saldo_puntos: saldo - nivel.puntos,
                precio_original: precioOriginal,
                descuento_aplicado: descuento,
                precio_final: precioFinal
            };
        });

        if (resultado.error) {
            return res.status(resultado.status).json({
                message: resultado.error
            });
        }

        return res.status(200).json({
            message: "Descuento aplicado correctamente a tu cita.",
            ...resultado
        });

    } catch (error) {
        console.error("Error al canjear descuento:", error);

        return res.status(500).json({
            message: "Error al realizar el canje."
        });
    }
}
