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
    const fila = (etiqueta, valor) =>
        `<tr><td style="padding:6px 12px;color:#555">${esc(etiqueta)}</td>` +
        `<td style="padding:6px 12px;text-align:right"><strong>${esc(valor)}</strong></td></tr>`;

    const cliente = r.cliente_mas_fiel
        ? `${r.cliente_mas_fiel.nombre} (${r.cliente_mas_fiel.citas_finalizadas} citas finalizadas, ${cop(r.cliente_mas_fiel.total_gastado)})`
        : "Sin datos";
    const empleado = r.empleado_mas_solicitado
        ? `${r.empleado_mas_solicitado.nombre} (${r.empleado_mas_solicitado.solicitudes} citas)`
        : "Sin datos";
    const tabla = (tituloTabla, cabeceras, filas) => `
      <h3 style="margin:22px 0 8px">${esc(tituloTabla)}</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr>${cabeceras.map((c) => `<th style="padding:7px;background:#f4f1ee;text-align:left">${esc(c)}</th>`).join("")}</tr></thead>
        <tbody>${filas.length ? filas.map((f) => `<tr>${f.map((v) => `<td style="padding:7px;border-bottom:1px solid #eee">${esc(v)}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${cabeceras.length}" style="padding:8px">Sin datos en el periodo.</td></tr>`}</tbody>
      </table>`;
    const filasRanking = (items, tipo) => (items || []).map((item) => tipo === "cliente"
        ? [item.nombre, item.citas_finalizadas, cop(item.total_gastado)]
        : [item.nombre, item.solicitudes, cop(item.facturado)]);
    const filasProductos = (items) => (items || []).map((item) => [item.nombre, item.unidades, cop(item.gasto)]);

    return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
      <h2>${esc(titulo)}</h2>
      ${r.meta.modo_pruebas ? '<p style="background:#fff3cd;padding:8px">⚠ Los pagos en línea están en modo de pruebas.</p>' : ""}
      <table style="width:100%;border-collapse:collapse">
        ${fila("Ingresos online", cop(r.ingresos.online?.total ?? r.ingresos.reservas_wompi.total))}
        ${fila("Ingresos locales", cop(r.ingresos.local?.total ?? r.ingresos.saldo_salon.total))}
        ${fila("Ingresos totales", cop(r.ingresos.total))}
        ${fila("Compras (egresos)", cop(r.compras.total))}
        ${fila("Utilidad", cop(r.balance.utilidad))}
        ${fila("Citas del mes", r.citas.total)}
        ${fila("Cliente más fiel", cliente)}
        ${fila("Empleado más solicitado", empleado)}
      </table>
      <h3 style="margin:22px 0 8px">Actividad de citas</h3>
      <table style="width:100%;border-collapse:collapse">${Object.entries(r.citas.por_estado || {}).map(([estado, cantidad]) => fila(`Citas ${estado.replace("_", " ")}`, cantidad)).join("")}</table>
      ${tabla("Clientes más fieles", ["Cliente", "Citas finalizadas", "Total asociado"], filasRanking(r.top_clientes, "cliente"))}
      ${tabla("Empleados más solicitados", ["Empleado", "Solicitudes", "Facturado"], filasRanking(r.top_empleados))}
      ${tabla("Servicios más pedidos", ["Servicio", "Solicitudes", "Facturado"], filasRanking(r.top_servicios))}
      <p>Compras de inventario: ${esc(r.compras.cantidad_compras)} compras, ${esc(r.compras.unidades)} unidades, ${esc(cop(r.compras.total))}.</p>
      ${tabla("Productos más comprados", ["Producto", "Unidades", "Gasto"], filasProductos(r.compras.top_productos))}
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
