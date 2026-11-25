export async function enviarCodigoPorSms(telefono, codigo) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
    const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
    const from = process.env.TWILIO_PHONE_NUMBER?.trim();
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();

    if (!accountSid || !authToken || (!from && !messagingServiceSid)) {
        throw new Error("El envío de mensajes de texto no está configurado.");
    }

    const digitos = String(telefono ?? "").replace(/\D/g, "");
    const destino = String(telefono ?? "").trim().startsWith("+")
        ? `+${digitos}`
        : digitos.length === 10
            ? `+57${digitos}`
            : `+${digitos}`;

    const datos = new URLSearchParams({
        To: destino,
        Body: `JC Alta Peluquería: tu código para actualizar tus datos es ${codigo}. Vence en 10 minutos. No lo compartas.`
    });
    if (messagingServiceSid) datos.set("MessagingServiceSid", messagingServiceSid);
    else datos.set("From", from);

    const credenciales = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: "POST",
        headers: {
            Authorization: `Basic ${credenciales}`,
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: datos
    });

    if (!response.ok) {
        const detalle = await response.json().catch(() => ({}));
        console.error("No se pudo enviar el código por SMS:", detalle.message || response.status);
        throw new Error("No se pudo enviar el código al teléfono registrado.");
    }
}
