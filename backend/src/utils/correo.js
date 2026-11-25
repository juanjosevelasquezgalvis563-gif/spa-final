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

export async function enviarCodigoActualizacion(email, codigo) {
    const config = obtenerTransporter();
    if (!config) throw new Error("El envío de correo no está configurado.");

    await config.transporter.sendMail({
        from: `"JC Alta Peluquería" <${config.user}>`,
        to: email,
        subject: "Código para actualizar tus datos",
        text: `JC ALTA PELUQUERÍA\nSeguridad de la cuenta\n\nConfirma la actualización de tus datos ingresando este código:\n\n${codigo}\n\nEl código vence en 10 minutos y solo se puede usar una vez. Si no solicitaste este cambio, ignora este mensaje y no compartas el código.\n\nJC Alta Peluquería · Cuidado y belleza.`,
        html: `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f2f4;font-family:Arial,Helvetica,sans-serif;color:#171717">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">Tu código de seguridad para actualizar los datos de tu cuenta.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f1f2f4;padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#fff;border:1px solid #e3e4e7;border-radius:12px;overflow:hidden">
        <tr><td style="padding:24px 32px;background:#171717;color:#fff">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
            <td align="center" valign="middle" width="48" height="48" style="width:48px;height:48px;border:1px solid #777;border-radius:50%;font-family:Georgia,serif;font-size:23px;letter-spacing:-2px;color:#fff">JC</td>
            <td style="padding-left:14px"><div style="font-size:13px;font-weight:bold;letter-spacing:2px">JC ALTA PELUQUERÍA</div><div style="margin-top:5px;color:#c7c7c7;font-size:11px;letter-spacing:1px">CUIDADO Y BELLEZA</div></td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:38px 40px 34px">
          <p style="margin:0 0 10px;color:#666;font-size:11px;font-weight:bold;letter-spacing:1.7px;text-transform:uppercase">Seguridad de la cuenta</p>
          <h1 style="margin:0;color:#171717;font-family:Georgia,'Times New Roman',serif;font-size:29px;font-weight:normal;line-height:1.25">Confirma tus cambios</h1>
          <p style="margin:16px 0 0;color:#555;font-size:15px;line-height:1.7">Ingresa este código en el formulario para confirmar que eres tú y actualizar tus datos.</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:26px 0 20px;background:#f6f6f7;border:1px solid #e4e4e7;border-radius:9px">
            <tr><td align="center" style="padding:20px 12px 8px;color:#666;font-size:10px;font-weight:bold;letter-spacing:1.8px">TU CÓDIGO DE VERIFICACIÓN</td></tr>
            <tr><td align="center" style="padding:5px 12px 21px;color:#171717;font-family:Arial,Helvetica,sans-serif;font-size:34px;font-weight:bold;letter-spacing:9px">${codigo}</td></tr>
          </table>
          <p style="margin:0;color:#555;font-size:13px;line-height:1.7"><strong style="color:#171717">Este código vence en 10 minutos</strong> y solo puede usarse una vez.</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:24px;border-top:1px solid #e7e7e9">
            <tr><td style="padding-top:18px;color:#666;font-size:12px;line-height:1.7">Si no solicitaste este cambio, puedes ignorar este mensaje. Por seguridad, nunca compartas este código con otra persona.</td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:18px 32px;background:#f8f8f9;border-top:1px solid #e7e7e9;color:#777;font-size:11px;line-height:1.6">Mensaje automático de JC Alta Peluquería.<br>Gracias por confiar en nuestro equipo.</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
    });
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
