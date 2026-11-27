import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { OAuth2Client } from "google-auth-library";

const credentialsPath = process.argv[2];
if (!credentialsPath) {
  console.error('Uso: node scripts/obtenerRefreshTokenGmail.js "C:\\ruta\\credentials.json"');
  process.exit(1);
}

const credentialsJson = JSON.parse(await readFile(credentialsPath, "utf8"));
const credentials = credentialsJson.installed ?? credentialsJson.web;
if (!credentials?.client_id || !credentials?.client_secret) {
  throw new Error("El JSON no contiene credenciales OAuth de escritorio/web válidas.");
}

const port = 3487;
const redirectUri = `http://127.0.0.1:${port}/oauth2callback`;
const state = randomBytes(24).toString("hex");
const oauthClient = new OAuth2Client(credentials.client_id, credentials.client_secret, redirectUri);
const { codeVerifier, codeChallenge } = await oauthClient.generateCodeVerifierAsync();
const authorizationUrl = oauthClient.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/gmail.send"],
  state,
  code_challenge: codeChallenge,
  code_challenge_method: "S256",
});

const server = createServer(async (request, response) => {
  const url = new URL(request.url, redirectUri);
  if (url.pathname !== "/oauth2callback") {
    response.writeHead(404).end("No encontrado");
    return;
  }

  const returnedState = url.searchParams.get("state") ?? "";
  const stateMatches = returnedState.length === state.length && timingSafeEqual(Buffer.from(returnedState), Buffer.from(state));
  const code = url.searchParams.get("code");
  if (!stateMatches || !code) {
    response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" }).end("Autorización inválida. Cierra esta pestaña y vuelve a ejecutar el script.");
    server.close();
    process.exitCode = 1;
    return;
  }

  try {
    const { tokens } = await oauthClient.getToken({ code, codeVerifier });
    if (!tokens.refresh_token) throw new Error("Google no devolvió refresh token. Revoca el acceso anterior de esta app en tu cuenta Google y vuelve a ejecutar el script.");
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end("<p>Autorización completada. Puedes cerrar esta pestaña y volver a la terminal.</p>");
    console.log("\nRefresh token (secreto; cópialo directamente al campo GMAIL_OAUTH_REFRESH_TOKEN en Render):\n");
    console.log(tokens.refresh_token);
    console.log("\nNo lo compartas ni lo guardes en el repositorio.\n");
  } catch (error) {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" }).end("No se pudo completar la autorización. Revisa la terminal.");
    console.error("No se pudo obtener el token:", error.message);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});

server.on("error", (error) => {
  console.error(`No se pudo abrir http://localhost:${port}:`, error.message);
  process.exitCode = 1;
});

server.listen(port, "127.0.0.1", () => {
  console.log("Abre esta dirección en tu navegador, inicia sesión con el Gmail emisor y acepta el permiso de envío:");
  console.log(authorizationUrl);
  console.log("\nEl script solo funciona localmente y no guarda el token en un archivo.\n");
});
