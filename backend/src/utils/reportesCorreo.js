import nodemailer from "nodemailer";
import Usuario from "../models/Usuario.js";

const cop = (valor) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })
        .format(Number(valor) || 0);

const esc = (texto) =>
    String(texto ?? "").replace(/[&<>"']/g, (c) => (
        { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));

function construirHtml(r) {
    const titulo = `Reporte de ${r.periodo.nombre_mes} ${r.periodo.anio}`;
    const generadoEn = r.meta?.generado_en
        ? new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" }).format(new Date(r.meta.generado_en))
        : "Fecha no disponible";
    const fila = (etiqueta, valor) =>
        `<tr><td style="padding:6px 12px;color:#555">${esc(etiqueta)}</td>` +
        `<td style="padding:6px 12px;text-align:right"><strong>${esc(valor)}</strong></td></tr>`;

    const cliente = r.cliente_mas_fiel
        ? `${r.cliente_mas_fiel.nombre} (${r.cliente_mas_fiel.citas_finalizadas} citas finalizadas)`
        : "Sin datos";
    const empleado = r.empleado_mas_solicitado
        ? `${r.empleado_mas_solicitado.nombre} (${r.empleado_mas_solicitado.solicitudes} solicitudes, ${r.empleado_mas_solicitado.finalizadas} finalizadas)`
        : "Sin datos";
    const tabla = (tituloTabla, cabeceras, filas) => `
      <h3 style="margin:22px 0 8px">${esc(tituloTabla)}</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr>${cabeceras.map((c) => `<th style="padding:7px;background:#f4f1ee;text-align:left">${esc(c)}</th>`).join("")}</tr></thead>
        <tbody>${filas.length ? filas.map((f) => `<tr>${f.map((v) => `<td style="padding:7px;border-bottom:1px solid #eee">${esc(v)}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${cabeceras.length}" style="padding:8px">Sin datos en el periodo.</td></tr>`}</tbody>
      </table>`;
    const filasRanking = (items, tipo) => (items || []).map((item) => tipo === "cliente"
        ? [item.nombre, item.citas_finalizadas]
        : [item.nombre, item.solicitudes, item.finalizadas]);
    const filasProductos = (items) => (items || []).map((item) => [item.nombre, item.unidades, cop(item.gasto)]);

    return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
      <h2>${esc(titulo)}</h2>
      <p style="color:#666;font-size:12px">Generado el ${esc(generadoEn)} (hora de Colombia).</p>
      <table style="width:100%;border-collapse:collapse">
        ${fila("Ingresos online", cop(r.ingresos.online?.total ?? r.ingresos.reservas_wompi.total))}
        ${fila("Ingresos locales", cop(r.ingresos.local?.total ?? r.ingresos.saldo_salon.total))}
        ${fila("Ingresos totales", cop(r.ingresos.total))}
        ${fila("Compras de inventario", cop(r.compras.total))}
        ${fila("Ingresos menos compras", cop(r.balance.resultado_despues_compras))}
        ${fila("Citas del mes", r.citas.total)}
        ${fila("Servicios finalizados", r.citas.finalizadas)}
        ${fila("Valor promedio por servicio finalizado", cop(r.citas.valor_promedio_servicio_finalizado))}
        ${fila("Cliente recurrente", cliente)}
        ${fila("Empleado con m\u00e1s solicitudes", empleado)}
      </table>
      <h3 style="margin:22px 0 8px">Actividad de citas</h3>
      <table style="width:100%;border-collapse:collapse">${Object.entries(r.citas.por_estado || {}).map(([estado, cantidad]) => fila(`Citas ${estado.replace("_", " ")}`, cantidad)).join("")}</table>
      ${tabla("Clientes recurrentes", ["Cliente", "Citas finalizadas"], filasRanking(r.top_clientes, "cliente"))}
      ${tabla("Actividad por empleado", ["Empleado", "Solicitudes", "Finalizadas"], filasRanking(r.top_empleados))}
      ${tabla("Servicios más solicitados", ["Servicio", "Solicitudes", "Finalizadas"], filasRanking(r.top_servicios))}
      <p>Compras de inventario: ${esc(r.compras.cantidad_compras)} compras, ${esc(r.compras.unidades)} unidades, ${esc(cop(r.compras.total))}.</p>
      ${tabla("Productos más comprados", ["Producto", "Unidades", "Gasto"], filasProductos(r.compras.top_productos))}
      <h3 style="margin:22px 0 8px">Sugerencias para el período</h3>
      <ul>${(r.recomendaciones || []).map((item) => `<li><strong>${esc(item.titulo)}:</strong> ${esc(item.detalle)}</li>`).join("")}</ul>
      <p style="color:#666;font-size:12px">El resultado después de compras solo descuenta inventario registrado; no equivale a utilidad neta ni incluye otros gastos.</p>
    </div>`;
}


export async function enviarReportePorCorreo(reporte, { destinatarios, estricto = false } = {}) {
    const EMAIL_USER = process.env.EMAIL_USER?.trim();
    const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD?.replace(/\s/g, "");

    const fallar = (mensaje) => {
        if (estricto) throw new Error(mensaje);
        console.warn(`[reportes] ${mensaje}`);
        return false;
    };

    if (!EMAIL_USER || !EMAIL_PASSWORD) {
        return fallar("Faltan EMAIL_USER o EMAIL_PASSWORD en el .env.");
    }

    let lista = (destinatarios || []).filter(Boolean);
    if (!lista.length) {
        const admins = await Usuario.findAll({
            attributes: ["email"],
            where: { rol: "administrador" },
            raw: true
        });
        lista = admins.map((a) => a.email).filter(Boolean);
    }
    if (!lista.length) {
        lista = (process.env.REPORTES_EMAIL_TO || "").split(",").map((e) => e.trim()).filter(Boolean);
    }
    if (!lista.length) return fallar("No hay destinatarios para enviar el reporte.");

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: EMAIL_USER, pass: EMAIL_PASSWORD }
    });

    const resultado = await transporter.sendMail({
        from: `"JC Alta Peluquería" <${EMAIL_USER}>`,
        to: lista.join(","),
        subject: `Reporte y estadísticas - ${reporte.periodo.nombre_mes} ${reporte.periodo.anio}`,
        html: construirHtml(reporte)
    });

    console.log("[reportes] Correo aceptado por SMTP:", resultado.messageId);
    return true;
}

