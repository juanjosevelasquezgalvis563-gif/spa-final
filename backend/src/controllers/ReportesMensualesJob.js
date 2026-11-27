import cron from "node-cron";
import ReporteMensual from "../models/ReporteMensual.js";
import { guardarReporte, periodoAnterior } from "../utils/reportesMensuales.js";
import { enviarReportePorCorreo } from "../utils/reportesCorreo.js";

const ZONA_HORARIA = process.env.REPORTES_TIMEZONE || "America/Bogota";

export async function procesarReporteMensual() {
    const diaLocal = Number(new Intl.DateTimeFormat("en-CA", {
        timeZone: ZONA_HORARIA,
        day: "2-digit"
    }).format(new Date()));
    if (diaLocal > 7) {
        return { enviado: false, motivo: "El envío mensual se realiza durante la primera semana del mes." };
    }

    const { anio, mes } = periodoAnterior();
    const reporte = await guardarReporte(anio, mes);

    if (reporte.enviado_en) {
        return { enviado: false, motivo: "El reporte de este mes ya fue enviado." };
    }

    const enviado = await enviarReportePorCorreo(reporte.datos);
    if (!enviado) return { enviado: false, motivo: "No se pudo enviar el correo." };

    reporte.enviado_en = new Date();
    await reporte.save();
    return { enviado: true, reporte };
}

export function iniciarJobReportesMensuales() {
    if (process.env.REPORTES_MENSUALES_ACTIVO !== "true") {
        console.log("[reportes] Envío mensual automático desactivado; los reportes se pueden solicitar manualmente.");
        return;
    }

    const procesar = async () => {
        try {
            const resultado = await procesarReporteMensual();
            if (resultado.enviado) {
                console.log(`[reportes] Reporte de ${resultado.reporte.datos.periodo.nombre_mes} ${resultado.reporte.anio} enviado.`);
            }
        } catch (error) {
            console.error("[reportes] No se pudo procesar el envío mensual:", error);
        }
    };

    // Revisa al iniciar y cada día a las 8:00 a. m. durante la primera semana.
    // Si falla el correo, reintenta al día siguiente; enviado_en evita duplicados.
    void procesar();
    cron.schedule("0 8 * * *", procesar, { timezone: ZONA_HORARIA });
}

