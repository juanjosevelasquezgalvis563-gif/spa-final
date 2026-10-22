import MovimientoPuntos from "../models/MovimientoPuntos.js";

export async function obtenerFidelizacion(req, res) {
    try {
        const usuarioId = req.user.id;

        const movimientos = await MovimientoPuntos.findAll({
            where: {
                usuario_id: usuarioId
            },
            order: [["fecha_creacion", "DESC"]]
        });

        let saldoPuntos = 0;

        for (const movimiento of movimientos) {
            if (movimiento.tipo === "canje") {
                saldoPuntos -= Number(movimiento.puntos);
            } else {
                saldoPuntos += Number(movimiento.puntos);
            }
        }

        let descuento = 0;

        if (saldoPuntos >= 400) {
            descuento = 15;
        } else if (saldoPuntos >= 200) {
            descuento = 10;
        } else if (saldoPuntos >= 100) {
            descuento = 5;
        }

        return res.status(200).json({
            saldo_puntos: saldoPuntos,
            descuentoDisponible: descuento,
            descuentoMaximo: 15000,
            historial: movimientos
        });

    } catch (error) {
        console.error("Error al consultar fidelización:", error);

        return res.status(500).json({
            message: "Error al consultar los puntos del cliente"
        });
    }
}
