
import { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/image.png";
import { API_ROOT } from "../lib/api";
import "./Registro.css";
import PasswordVisibilityToggle from "./PasswordVisibilityToggle";

/* ------------------------------------------------------------------ */
/*  Hook: useTurnstile                                                */
/*  Encapsula la carga del script de Cloudflare y el renderizado      */
/*  del widget, con reintentos y manejo de errores claros.            */
/* ------------------------------------------------------------------ */
function useTurnstile(siteKey) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [widgetId, setWidgetId] = useState(null);
  const [token, setToken] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  const containerRef = useRef(null);
  const scriptLoadedRef = useRef(false);

  const MAX_RETRIES = 3;

  const onVerify = useCallback((t) => {
    console.log("[Turnstile] Token recibido:", t ? t.substring(0, 20) + "..." : "vacío");
    setToken(t);
    setError(null);
  }, []);

  const onError = useCallback(() => {
    console.error("[Turnstile] Error-callback del widget.");
    setToken("");
    setError("Error al completar la verificación de seguridad. Inténtalo de nuevo.");
  }, []);

  const reset = useCallback(() => {
    if (window.turnstile && widgetId) {
      window.turnstile.reset(widgetId);
    }
    setWidgetId(null);
    setToken("");
    setError(null);
  }, [widgetId]);

  const remove = useCallback(() => {
    if (window.turnstile && widgetId) {
      window.turnstile.remove(widgetId);
    }
    setWidgetId(null);
    setToken("");
  }, [widgetId]);

  const loadScript = useCallback(() => {
    const scriptId = "cloudflare-turnstile";
    const existing = document.getElementById(scriptId);

    if (existing && scriptLoadedRef.current) {
      setLoaded(true);
      return;
    }

    if (existing) {
      existing.remove();
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;

    script.onload = () => {
      scriptLoadedRef.current = true;
      setLoaded(true);
      console.log("[Turnstile] Script de Cloudflare cargado.");
    };
    script.onerror = () => {
      setError("No se pudo cargar la verificación de seguridad. Comprueba tu conexión.");
      console.error("[Turnstile] Error al cargar el script de Cloudflare.");
    };

    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    loadScript();
  }, [loadScript]);

  useEffect(() => {
    if (!siteKey) {
      setError("Configuración de seguridad incompleta.");
      return;
    }

    if (!loaded || !containerRef.current || !window.turnstile || widgetId) {
      return;
    }

    try {
      const id = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: onVerify,
        "error-callback": onError,
      });
      setWidgetId(id);
      setError(null);
      console.log("[Turnstile] Widget renderizado, ID:", id);
    } catch {
      setError("No se pudo renderizar la verificación de seguridad.");
      console.error("[Turnstile] Excepción al renderizar el widget.");
    }
  }, [loaded, siteKey, widgetId, onVerify, onError]);

  useEffect(() => {
    if (error && !loaded && retryCount < MAX_RETRIES) {
      const timer = setTimeout(() => {
        setRetryCount((c) => c + 1);
        scriptLoadedRef.current = false;
        const existing = document.getElementById("cloudflare-turnstile");
        if (existing) existing.remove();
        setLoaded(false);
        setError(null);
      }, 2000 * (retryCount + 1));

      return () => clearTimeout(timer);
    }
  }, [error, loaded, retryCount]);

  return {
    loaded,
    error,
    widgetId,
    token,
    retryCount,
    containerRef,
    reset,
    remove,
    setError,
    setToken,
    setLoaded,
    loadScript,
  };
}

export function Registro() {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [cargando, setCargando] = useState(false);
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState("");
  const [verificandoCorreo, setVerificandoCorreo] = useState(false);
  const [reenviandoCodigo, setReenviandoCodigo] = useState(false);

  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  const {
    loaded: turnstileLoaded,
    error: turnstileError,
    widgetId: turnstileWidgetId,
    token: turnstileToken,
    retryCount: turnstileRetryCount,
    containerRef: turnstileRef,
    reset: resetTurnstile,
    remove: removeTurnstile,
    setError: setTurnstileError,
    setToken: setTurnstileToken,
    setLoaded: setTurnstileLoaded,
    loadScript: loadTurnstileScript,
  } = useTurnstile(siteKey);

  const limpiarCampos = () => {
    setNombre("");
    setTelefono("");
    setEmail("");
    setPassword("");
    setConfirmationCode("");
    setMostrarPassword(false);
  };



  useEffect(() => {
    if (!message) return undefined;

    const timer = setTimeout(() => setMessage(""), 5000);

    return () => clearTimeout(timer);
  }, [message]);





  const restablecerTurnstile = useCallback(() => {
    removeTurnstile();
  }, [removeTurnstile]);

  async function handleSubmit(e) {
    e.preventDefault();

    if (awaitingVerification) return;

    console.log("[Registro] Iniciando handleSubmit");
    console.log("[Registro] siteKey:", siteKey ? "configurada" : "FALTA");
    console.log("[Registro] turnstileToken:", turnstileToken ? turnstileToken.substring(0, 30) + "..." : "FALTA");

    if (!siteKey) {
      setMessage("Configuración de seguridad incompleta.");
      return;
    }

    if (!turnstileToken) {
      setMessage(
        "Debes completar la verificación de seguridad antes de registrarte."
      );
      return;
    }

    setCargando(true);

    try {
      const correoRegistrado = email.trim();

      const payload = {
        nombre,
        telefono,
        email: correoRegistrado,
        password,
        turnstileToken,
      };
      console.log("[Registro] Enviando payload:", { ...payload, turnstileToken: turnstileToken ? "[TOKEN]" : "" });

      const response = await fetch(`${API_ROOT}/inser/registrar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      console.log("[Registro] Respuesta backend:", { status: response.status, data });

      if (response.ok) {
        setAwaitingVerification(true);
        setConfirmationCode("");
        setMessage(
          data.message ||
            "Enviamos un código a tu correo para confirmar la dirección."
        );

        setNombre("");
        setTelefono("");
        setPassword("");
        setMostrarPassword(false);
        setEmail(correoRegistrado);
      } else {
        setMessage(data.message || "No se pudo registrar el usuario");
        restablecerTurnstile();
      }
    } catch {
      setMessage("Error de conexión con el servidor");
      restablecerTurnstile();
    } finally {
      setCargando(false);
    }
  }

  async function verificarCorreo(e) {
    e.preventDefault();

    if (confirmationCode.length !== 6) {
      setMessage(
        "Ingresa el código de 6 dígitos que enviamos a tu correo."
      );
      return;
    }

    setVerificandoCorreo(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_ROOT}/inser/registrar/verificar`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
            codigo: confirmationCode,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(data.message || "No se pudo confirmar el correo.");
        return;
      }

      setMessage(
        data.message || "Correo confirmado. Ya puedes iniciar sesión."
      );

      limpiarCampos();
      setAwaitingVerification(false);
    } catch {
      setMessage("Error de conexión al confirmar el correo.");
    } finally {
      setVerificandoCorreo(false);
    }
  }

  async function reenviarCodigo() {
    setReenviandoCodigo(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_ROOT}/inser/registrar/reenviar-codigo`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      setMessage(
        data.message ||
          (response.ok
            ? "Enviamos un nuevo código a tu correo."
            : "No se pudo reenviar el código.")
      );
    } catch {
      setMessage("Error de conexión al reenviar el código.");
    } finally {
      setReenviandoCodigo(false);
    }
  }

  return (
    <div className="registro-container auth-page auth-page-register">
      <div className="auth-layout">
        <aside className="auth-brand-panel auth-brand-panel-register">
          <div className="auth-brand">
            <img src={logo} alt="JC Alta Peluquería" />
            <span>JC Alta Peluquería</span>
          </div>

          <div className="auth-brand-copy">
            <span className="auth-eyebrow">
              BIENVENIDA A TU NUEVO RITUAL
            </span>

            <h1>Tu momento de cuidarte empieza aquí.</h1>

            <p>
              Crea tu cuenta para reservar tus servicios y vivir una
              experiencia de belleza hecha para ti.
            </p>
          </div>

          <div className="auth-brand-detail" aria-hidden="true">
            <span>JC</span>
          </div>

          <p className="auth-brand-caption">
            Tu belleza, nuestro arte.
          </p>
        </aside>

        <form
          className="registro-form auth-card auth-card-register"
          onSubmit={
            awaitingVerification ? verificarCorreo : handleSubmit
          }
        >
          <div className="auth-form-heading">
            <span className="auth-eyebrow">ÚNETE A NOSOTROS</span>

            <h2 className="registro-title">
              {awaitingVerification
                ? "Confirma tu correo"
                : "Crear cuenta"}
            </h2>

            <p>
              {awaitingVerification
                ? `Ingresa el código que enviamos a ${email}.`
                : "Completa tus datos para comenzar."}
            </p>
          </div>

          {awaitingVerification ? (
            <div className="registro-email-confirmation">
              <label htmlFor="registro-codigo">
                Código de confirmación
              </label>

              <input
                id="registro-codigo"
                className="registro-input registro-code-input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="000000"
                value={confirmationCode}
                onChange={(e) =>
                  setConfirmationCode(
                    e.target.value.replace(/\D/g, "").slice(0, 6)
                  )
                }
                aria-describedby="registro-codigo-ayuda"
                required
              />

              <p id="registro-codigo-ayuda">
                El código vence en 10 minutos. Revisa también la
                carpeta de spam.
              </p>

              <button
                className="registro-button"
                type="submit"
                disabled={
                  verificandoCorreo || confirmationCode.length !== 6
                }
              >
                {verificandoCorreo
                  ? "Confirmando..."
                  : "Confirmar correo y crear cuenta"}
              </button>

              <button
                className="registro-captcha-refresh"
                type="button"
                onClick={reenviarCodigo}
                disabled={reenviandoCodigo || verificandoCorreo}
              >
                {reenviandoCodigo
                  ? "Enviando..."
                  : "Reenviar código"}
              </button>

              <button
                className="registro-captcha-refresh"
                type="button"
                onClick={() => {
                  setAwaitingVerification(false);
                  setConfirmationCode("");
                  setMessage("");
                }}
                disabled={reenviandoCodigo || verificandoCorreo}
              >
                Volver al formulario
              </button>
            </div>
          ) : (
            <>
              <input
                className="registro-input"
                type="text"
                placeholder="Nombre"
                autoComplete="name"
                aria-label="Nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />

              <input
                className="registro-input"
                type="tel"
                placeholder="Teléfono"
                autoComplete="tel"
                aria-label="Teléfono"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                required
              />

              <input
                className="registro-input"
                type="email"
                placeholder="Correo electrónico"
                autoComplete="email"
                autoCapitalize="none"
                maxLength={254}
                aria-label="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <div className="password-field">
                <input
                  className="registro-input"
                  type={mostrarPassword ? "text" : "password"}
                  placeholder="Contraseña"
                  autoComplete="new-password"
                  aria-label="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <PasswordVisibilityToggle
                  visible={mostrarPassword}
                  onToggle={() =>
                    setMostrarPassword((visible) => !visible)
                  }
                />
              </div>

              <div className="turnstile-container">
                {turnstileError ? (
                  <>
                    <p className="turnstile-status error" role="alert">
                      {turnstileError}
                    </p>
                    {turnstileRetryCount < 3 && !turnstileLoaded && (
                      <button
                        className="registro-captcha-refresh"
                        type="button"
                        onClick={() => {
                          console.log("[Turnstile] Usuario solicitó reintento de carga.");
                          loadScript();
                        }}
                      >
                        Reintentar carga
                      </button>
                    )}
                  </>
                ) : (
                  <div ref={turnstileRef} />
                )}
              </div>

              <button
                className="registro-button"
                type="submit"
                disabled={cargando || !turnstileToken}
              >
                {cargando ? "Enviando código..." : "Registrarse"}
              </button>
            </>
          )}

          {message && (
            <p
              className={`registro-message${
                turnstileError
                  ? " turnstile-message-duplicate"
                  : ""
              }`}
              role="status"
            >
              {message}
            </p>
          )}

          {message &&
            message.includes("verificación de seguridad") && (
              <button
                className="registro-captcha-refresh"
                type="button"
                onClick={resetTurnstile}
              >
                Reintentar Verificación
              </button>
            )}

          <p className="auth-switch">
            ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Registro;