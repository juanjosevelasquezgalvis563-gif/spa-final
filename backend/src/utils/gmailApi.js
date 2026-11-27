import { OAuth2Client } from "google-auth-library";

let oauthClient;

function obtenerConfiguracion() {
    const user = process.env.EMAIL_USER?.trim();
    const clientId = process.env.GMAIL_OAUTH_CLIENT_ID?.trim();
    const clientSecret = process.env.GMAIL_OAUTH_CLIENT_SECRET?.trim();
    const refreshToken = process.env.GMAIL_OAUTH_REFRESH_TOKEN?.trim();

    if (!user || !clientId || !clientSecret || !refreshToken) {
        throw new Error("Falta configurar EMAIL_USER, GMAIL_OAUTH_CLIENT_ID, GMAIL_OAUTH_CLIENT_SECRET o GMAIL_OAUTH_REFRESH_TOKEN.");
    }

    if (!oauthClient) {
        oauthClient = new OAuth2Client(clientId, clientSecret);
        oauthClient.setCredentials({ refresh_token: refreshToken });
    }

    return { user, oauthClient };
}

export function gmailApiConfigurado() {
    return Boolean(
        process.env.EMAIL_USER?.trim() &&
        process.env.GMAIL_OAUTH_CLIENT_ID?.trim() &&
        process.env.GMAIL_OAUTH_CLIENT_SECRET?.trim() &&
        process.env.GMAIL_OAUTH_REFRESH_TOKEN?.trim()
    );
}

function limpiarCabecera(valor) {
    return String(valor ?? "").replace(/[\r\n]+/g, " ").trim();
}

function codificarCabecera(valor) {
    return `=?UTF-8?B?${Buffer.from(limpiarCabecera(valor), "utf8").toString("base64")}?=`;
}

function codificarCuerpo(valor) {
    return Buffer.from(String(valor ?? ""), "utf8").toString("base64").replace(/.{1,76}/g, "$&\r\n").trim();
}

function construirMime({ user, to, subject, text, html, replyTo, fromName }) {
    const destinatarios = (Array.isArray(to) ? to : [to])
        .map((email) => limpiarCabecera(email))
        .filter(Boolean);
    if (!destinatarios.length) throw new Error("El correo no tiene destinatarios.");

    const headers = [
        `From: ${codificarCabecera(fromName || "JC Alta Peluquería")} <${limpiarCabecera(user)}>`,
        `To: ${destinatarios.join(", ")}`,
        `Subject: ${codificarCabecera(subject)}`,
        "MIME-Version: 1.0",
    ];
    if (replyTo) headers.push(`Reply-To: ${limpiarCabecera(replyTo)}`);

    let cuerpo;
    if (text && html) {
        const boundary = `gmail_api_${cryptoRandomBoundary()}`;
        headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
        cuerpo = [
            `--${boundary}`,
            'Content-Type: text/plain; charset="UTF-8"',
            "Content-Transfer-Encoding: base64",
            "",
            codificarCuerpo(text),
            `--${boundary}`,
            'Content-Type: text/html; charset="UTF-8"',
            "Content-Transfer-Encoding: base64",
            "",
            codificarCuerpo(html),
            `--${boundary}--`,
        ].join("\r\n");
    } else {
        headers.push('Content-Type: text/html; charset="UTF-8"');
        headers.push("Content-Transfer-Encoding: base64");
        cuerpo = codificarCuerpo(html ?? text ?? "");
    }

    return `${headers.join("\r\n")}\r\n\r\n${cuerpo}`;
}

function cryptoRandomBoundary() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function enviarEmailGmail({ to, subject, text, html, replyTo, fromName }) {
    const { user, oauthClient: client } = obtenerConfiguracion();
    const { token } = await client.getAccessToken();
    if (!token) throw new Error("Google no entregó un token de acceso para Gmail API.");

    const mime = construirMime({ user, to, subject, text, html, replyTo, fromName });
    const raw = Buffer.from(mime, "utf8")
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");

    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw }),
    });

    const resultado = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(`Gmail API respondió ${response.status}: ${resultado.error?.message || "falló el envío"}`);
        error.code = resultado.error?.status || `HTTP_${response.status}`;
        throw error;
    }

    return resultado;
}
