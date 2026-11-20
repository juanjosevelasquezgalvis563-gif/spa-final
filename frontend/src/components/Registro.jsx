
import { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/image.png";
import { API_ROOT } from "../lib/api";
import "./Registro.css";
import PasswordVisibilityToggle from "./PasswordVisibilityToggle";

export function Registro() {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileLoaded, setTurnstileLoaded] = useState(false);
  const [turnstileWidgetId, setTurnstileWidgetId] = useState(null);
  const [turnstileError, setTurnstileError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState("");
  const [verificandoCorreo, setVerificandoCorreo] = useState(false);
  const [reenviandoCodigo, setReenviandoCodigo] = useState(false);

  const turnstileRef = useRef(null);

  const limpiarCampos = () => {
    setNombre("");
    setTelefono("");
    setEmail("");
    setPassword("");
    setConfirmationCode("");
    setMostrarPassword(false);
  };

  const onTurnstileVerify = useCallback((token) => {
    setTurnstileToken(token);
    setMessage("");
  }, []);

  const onTurnstileError = useCallback(() => {
    setTurnstileToken("");
    setMessage(
      "Error al completar la verificación de seguridad. Inténtalo de nuevo."
    );
  }, []);

  const resetTurnstile = useCallback(() => {
    if (window.turnstile && turnstileWidgetId) {
      window.turnstile.reset(turnstileWidgetId);
    } else {
      setTurnstileWidgetId(null);
    }

    setTurnstileToken("");
    setMessage("");
  }, [turnstileWidgetId]);

  useEffect(() => {
    if (!message) return undefined;

    const timer = setTimeout(() => setMessage(""), 5000);

    return () => clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    const scriptId = "cloudflare-turnstile";

    if (document.getElementById(scriptId)) {
      setTurnstileLoaded(true);
      return;
    }

    const script = document.createElement("script");

    script.id = scriptId;
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;

    script.onload = () => {
      setTurnstileLoaded(true);
    };

    script.onerror = () => {
      setTurnstileError(
        "No se pudo cargar la verificación de seguridad. Comprueba tu conexión."
      );
      setMessage(
        "No se pudo cargar la verificación de seguridad. Comprueba tu conexión."
      );
    };

    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    const shouldRender =
      turnstileLoaded &&
      !awaitingVerification &&
      turnstileRef.current &&
      window.turnstile &&
      !turnstileWidgetId;

    const shouldRemove =
      turnstileWidgetId &&
      (awaitingVerification || !turnstileRef.current || !window.turnstile);

    if (shouldRender) {
      const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

      if (!siteKey) {
        setMessage("Configuración de seguridad incompleta.");
        setTurnstileError(
          "Error: Clave de sitio de Turnstile no configurada."
        );
        return;
      }

      try {
        const id = window.turnstile.render(turnstileRef.current, {
          sitekey: siteKey,
          callback: onTurnstileVerify,
          "error-callback": onTurnstileError,
        });

        setTurnstileWidgetId(id);
        setTurnstileError("");
      } catch {
        setTurnstileError(
          "No se pudo cargar la verificación de seguridad."
        );
        setMessage(
          "No se pudo cargar la verificación de seguridad. Inténtalo más tarde."
        );
      }
    } else if (shouldRemove) {
      window.turnstile.remove(turnstileWidgetId);
      setTurnstileWidgetId(null);
      setTurnstileToken("");
    }

    return () => {
      if (
        turnstileWidgetId &&
        typeof window !== "undefined" &&
        window.turnstile
      ) {
        window.turnstile.remove(turnstileWidgetId);
      }
    };
  }, [
    turnstileLoaded,
    awaitingVerification,
    turnstileWidgetId,
    onTurnstileVerify,
    onTurnstileError,
  ]);

  const restablecerTurnstile = useCallback(() => {
    if (
      turnstileWidgetId &&
      typeof window !== "undefined" &&
      window.turnstile
    ) {
      window.turnstile.remove(turnstileWidgetId);
      setTurnstileWidgetId(null);
      setTurnstileToken("");
    } else {
      setTurnstileWidgetId(null);
    }
  }, [turnstileWidgetId]);

  async function handleSubmit(e) {
    e.preventDefault();

    if (awaitingVerification) return;

    if (!turnstileToken) {
      setMessage(
        "Debes completar la verificación de seguridad antes de registrarte."
      );
      return;
    }

    setCargando(true);

    try {
      const correoRegistrado = email.trim();

      const response = await fetch(`${API_ROOT}/inser/registrar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre,
          telefono,
          email: correoRegistrado,
          password,
          turnstileToken,
        }),
      });

      const data = await response.json().catch(() => ({}));

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
      }
    } catch {
      setMessage("Error de conexión con el servidor");
    } finally {
      restablecerTurnstile();
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
                  <p className="turnstile-status error" role="alert">
                    {turnstileError}
                  </p>
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
