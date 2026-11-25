import nodemailer from "nodemailer";

let transporter = null;

function obtenerTransporter() {
    const user = process.env.EMAIL_USER?.trim();
    const pass = process.env.EMAIL_PASSWORD?.replace(/\s/g, "");

    if (!user || !pass) return null;

    if (!transporter) {
        transporter = nodemailer.createTransport({
            service: "gmail",
            auth: { user, pass }
        });
    }

    
    return { transporter, user };
}

function escaparHtml(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, (caracter) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[caracter]));
}

function formatoCOP(valor) {
    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0
    }).format(Number(valor) || 0);
}

function fechaLegible(valor) {
    const texto = valor instanceof Date
        ? valor.toISOString().slice(0, 10)
        : String(valor ?? "").slice(0, 10);

    const fecha = new Date(`${texto}T12:00:00`);
    if (Number.isNaN(fecha.getTime())) return texto || "Fecha por definir";

    return fecha.toLocaleDateString("es-CO", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

function horaLegible(valor) {
    const [horas, minutos] = String(valor ?? "").split(":");
    if (horas === undefined || minutos === undefined) return "--:--";

    const hora = Number(horas);
    if (!Number.isFinite(hora)) return "--:--";

    const sufijo = hora >= 12 ? "p. m." : "a. m.";
    const hora12 = hora % 12 === 0 ? 12 : hora % 12;

    return `${hora12}:${minutos.slice(0, 2)} ${sufijo}`;
}


export async function enviarCorreoCitaConfirmada({
    email,
    nombreCliente,
    servicio,
    profesional,
    fecha,
    hora,
    descuentoPorcentaje = 0,
    precioFinal = 0,
    reservaPagada = 0,
    saldo = 0
}) {
    const config = obtenerTransporter();

    if (!config) {
        console.error("Correo de cita no enviado: faltan EMAIL_USER o EMAIL_PASSWORD.");
        return false;
    }

    if (!email) {
        console.error("Correo de cita no enviado: el cliente no tiene email.");
        return false;
    }

    const fechaTexto = fechaLegible(fecha);
    const horaTexto = horaLegible(hora);

    const filasPago = [];

    if (precioFinal > 0) {
        if (descuentoPorcentaje > 0) {
            filasPago.push(`Descuento por fidelización aplicado: ${descuentoPorcentaje}%`);
        }
        filasPago.push(`Valor del servicio: ${formatoCOP(precioFinal)}`);
        if (reservaPagada > 0) {
            filasPago.push(`Reserva ya pagada: ${formatoCOP(reservaPagada)}`);
        }
        filasPago.push(`Saldo a pagar en el salón: ${formatoCOP(saldo)}`);
    }

    const textoPlano = [
        `Hola ${nombreCliente || ""},`.trim(),
        "",
        "Tu cita ha sido confirmada correctamente.",
        "",
        `Servicio: ${servicio || "Servicio"}`,
        `Profesional: ${profesional || "Por asignar"}`,
        `Fecha: ${fechaTexto}`,
        `Hora: ${horaTexto}`,
        ...(filasPago.length ? ["", ...filasPago] : []),
        "",
        "¡Te esperamos en JC Alta Peluquería!"
    ].join("\n");

    const htmlFilasPago = filasPago
        .map((fila) => `<li style="margin:4px 0;">${escaparHtml(fila)}</li>`)
        .join("");
        

    try {
        await config.transporter.sendMail({
            from: `"JC Alta Peluquería" <${config.user}>`,
            to: email,
            subject: "Tu cita ha sido confirmada - JC Alta Peluquería",
            text: textoPlano,
            html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:25px;color:#222;">
                    <h2 style="margin-top:0;">¡Tu cita ha sido confirmada!</h2>

                    <p>Hola ${escaparHtml(nombreCliente || "")},</p>

                    <p>Tu cita ha sido <strong>confirmada correctamente</strong>. Estos son los detalles:</p>

                    <ul style="padding-left:18px;line-height:1.6;">
                        <li><strong>Servicio:</strong> ${escaparHtml(servicio || "Servicio")}</li>
                        <li><strong>Profesional:</strong> ${escaparHtml(profesional || "Por asignar")}</li>
                        <li><strong>Fecha:</strong> ${escaparHtml(fechaTexto)}</li>
                        <li><strong>Hora:</strong> ${escaparHtml(horaTexto)}</li>
                    </ul>

                    ${htmlFilasPago ? `<ul style="padding-left:18px;line-height:1.6;">${htmlFilasPago}</ul>` : ""}

                    <p>¡Te esperamos en JC Alta Peluquería!</p>
                </div>
            `
        });

        return true;
    } catch (error) {
        console.error("No se pudo enviar el correo de cita confirmada:", {
            message: error.message,
            code: error.code,
            responseCode: error.responseCode
        });
        return false;
    }
}