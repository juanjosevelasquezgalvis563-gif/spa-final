import cron from "node-cron";
import { Op } from "sequelize";
import ReporteMensual from "../models/ReporteMensual.js";
import { guardarReporte, periodoActual } from "../utils/reportesMensuales.js";
import { enviarReportePorCorreo } from "../utils/reportesCorreo.js";

const ZONA_HORARIA = process.env.REPORTES_TIMEZONE || "America/Bogota";
const INTERVALO_MS = 15 * 24 * 60 * 60 * 1000;

export async function procesarReporteQuincenal() {
    const ultimo = await ReporteMensual.findOne({
        where: { enviado_en: { [Op.ne]: null } },
        order: [["enviado_en", "DESC"]]
    });
    if (ultimo?.enviado_en && Date.now() - new Date(ultimo.enviado_en).getTime() < INTERVALO_MS) {
        return { enviado: false, motivo: "Aún no han transcurrido 15 días." };
    }

    const { anio, mes } = periodoActual();
    const reporte = await guardarReporte(anio, mes, { forzar: true });
    const enviado = await enviarReportePorCorreo(reporte.datos);
    if (!enviado) return { enviado: false, motivo: "No se pudo enviar el correo." };

    reporte.enviado_en = new Date();
    await reporte.save();
    return { enviado: true, reporte };
}

export function iniciarJobReportesQuincenales() {
    if (process.env.REPORTES_QUINCENALES_ACTIVO !== "true") {
        console.log("[reportes] Envío automático cada 15 días desactivado; usa el envío manual para pruebas.");
        return;
    }

    
    cron.schedule("0 * * * *", async () => {
        try {
            const resultado = await procesarReporteQuincenal();
            if (resultado.enviado) console.log("[reportes] Reporte quincenal enviado.");
        } catch (error) {
            console.error("[reportes] No se pudo procesar el reporte quincenal:", error);
        }
    }, { timezone: ZONA_HORARIA });
}

