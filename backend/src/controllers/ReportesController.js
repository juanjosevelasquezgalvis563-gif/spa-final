import ReporteMensual from "../models/ReporteMensual.js";
import {
    compararPeriodos,
    generarDatosReporte,
    guardarReporte,
    periodoActual,
    periodoAnterior
} from "../utils/reportesMensuales.js";
import { enviarReportePorCorreo } from "../utils/reportesCorreo.js";

function soloAdministrador(req, res) {
    if (req.user?.rol !== "administrador") {
        res.status(403).json({ message: "No tienes permiso para consultar los reportes." });
        return false;
    }
    return true;
}


function leerPeriodo(origen) {
    if (origen?.anio === undefined && origen?.mes === undefined) {
        return periodoAnterior();
    }

    const anio = Number(origen.anio);
    const mes = Number(origen.mes);

    if (!Number.isInteger(anio) || anio < 2000 || anio > 2100 || !Number.isInteger(mes) || mes < 1 || mes > 12) {
        return null;
    }
    return { anio, mes };
}


export async function reporteMensual(req, res) {
    if (!soloAdministrador(req, res)) return;

    try {
        const periodo = leerPeriodo(req.query);
        if (!periodo) {
            return res.status(400).json({ message: "Ingresa un año y un mes válidos." });
        }

        const comparacion = compararPeriodos(periodo, periodoActual());
        if (comparacion > 0) {
            return res.status(400).json({ message: "No puedes consultar un mes futuro." });
        }

       
        if (comparacion === 0) {
            const [datos, registro] = await Promise.all([
                generarDatosReporte(periodo.anio, periodo.mes),
                ReporteMensual.findOne({ where: periodo, attributes: ['enviado_en'] })
            ]);
            return res.json({
                en_curso: true,
                generado_en: datos.meta.generado_en,
                enviado_en: registro?.enviado_en || null,
                reporte: datos
            });
        }

        const reporte = await guardarReporte(periodo.anio, periodo.mes, {
            forzar: req.query.recalcular === "true"
        });

        return res.json({
            en_curso: false,
            generado_en: reporte.generado_en,
            enviado_en: reporte.enviado_en,
            reporte: reporte.datos
        });
    } catch (error) {
        console.error("Error al consultar el reporte mensual:", error);
        return res.status(500).json({ message: "No se pudo obtener el reporte mensual." });
    }
}


export async function historialReportes(req, res) {
    if (!soloAdministrador(req, res)) return;

    try {
        const reportes = await ReporteMensual.findAll({
            order: [["anio", "DESC"], ["mes", "DESC"]],
            limit: 36
        });

        return res.json(reportes.map((r) => {
            const d = r.datos;
            return {
                id: r.id,
                anio: r.anio,
                mes: r.mes,
                nombre_mes: d.periodo.nombre_mes,
                ingresos: d.balance.ingresos,
                egresos: d.balance.egresos,
                utilidad: d.balance.utilidad,
                cliente_mas_fiel: d.cliente_mas_fiel?.nombre || null,
                empleado_mas_solicitado: d.empleado_mas_solicitado?.nombre || null,
                generado_en: r.generado_en,
                enviado_en: r.enviado_en
            };
        }));
    } catch (error) {
        console.error("Error al consultar el historial de reportes:", error);
        return res.status(500).json({ message: "No se pudo cargar el historial de reportes." });
    }
}


export async function generarReporte(req, res) {
    if (!soloAdministrador(req, res)) return;

    try {
        const periodo = leerPeriodo(req.body);
        if (!periodo) {
            return res.status(400).json({ message: "Ingresa un año y un mes válidos." });
        }

        if (compararPeriodos(periodo, periodoActual()) >= 0) {
            return res.status(400).json({
                message: "Solo se pueden generar reportes de meses ya cerrados. El mes en curso se consulta en vivo."
            });
        }

        const reporte = await guardarReporte(periodo.anio, periodo.mes, { forzar: true });
        return res.status(201).json({
            message: "Reporte generado correctamente.",
            generado_en: reporte.generado_en,
            reporte: reporte.datos
        });
    } catch (error) {
        console.error("Error al generar el reporte:", error);
        return res.status(500).json({ message: "No se pudo generar el reporte." });
    }
}


export async function enviarReporteAhora(req, res) {
    if (!soloAdministrador(req, res)) return;

    try {
        const periodo = leerPeriodo(req.body?.anio === undefined && req.body?.mes === undefined
            ? periodoActual()
            : req.body);
        if (!periodo) {
            return res.status(400).json({ message: "Ingresa un año y un mes válidos." });
        }

        const comparacion = compararPeriodos(periodo, periodoActual());
        if (comparacion > 0) {
            return res.status(400).json({ message: "No puedes enviar el reporte de un mes futuro." });
        }

        const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ message: "El correo no es válido." });
        }

        const datos = comparacion === 0
            ? await generarDatosReporte(periodo.anio, periodo.mes)
            : (await guardarReporte(periodo.anio, periodo.mes)).datos;

        await enviarReportePorCorreo(datos, {
            destinatarios: email ? [email] : undefined,
            estricto: true
        });

        const registro = await guardarReporte(periodo.anio, periodo.mes, { forzar: true });
        registro.enviado_en = new Date();
        await registro.save();

        return res.json({ message: "Reporte enviado correctamente.", reporte: datos });
    } catch (error) {
        console.error("Error al enviar el reporte:", error);
        return res.status(500).json({ message: `No se pudo enviar el reporte: ${error.message}` });
    }
}

