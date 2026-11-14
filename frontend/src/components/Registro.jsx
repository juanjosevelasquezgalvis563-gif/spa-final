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

  // 1. Crea una referencia para el contenedor de Turnstile
  const turnstileRef = useRef(null);

  // Asegura que las funciones de callback sean estables para useEffect
  const onTurnstileVerify = useCallback((token) => {
    console.log("Turnstile verificado, token:", token);
    setTurnstileToken(token);
    setMessage("");
  }, []);
  const onTurnstileError = useCallback(() => {
    console.error("Error en Turnstile (callback).");
    setTurnstileToken("");
    setMessage("Error al completar la verificación de seguridad. Inténtalo de nuevo.");
  }, []);

  // Función para resetear el widget sin quitarlo del DOM
  const resetTurnstile = useCallback(() => {
    if (window.turnstile && turnstileWidgetId) {
      window.turnstile.reset(turnstileWidgetId);
      console.log("Turnstile reset.");
    } else {
        // Si no hay widget ID, intenta forzar un re-render para crearlo de nuevo
        setTurnstileWidgetId(null);
    }
    setTurnstileToken('');
    setMessage(''); // Limpiar mensaje al resetear
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
      console.log("Turnstile script ya cargado.");
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => {
        setTurnstileLoaded(true);
        console.log("Turnstile script cargado exitosamente.");
    };
    script.onerror = (e) => {
        console.error("Error al cargar el script de Turnstile:", e);
        setTurnstileError("No se pudo cargar la verificación de seguridad. Comprueba tu conexión.");
        setMessage("No se pudo cargar la verificación de seguridad. Comprueba tu conexión.");
    };
    document.head.appendChild(script);
  }, []);

  // 2. Este useEffect gestiona el ciclo de vida del widget de Turnstile
  useEffect(() => {
    // Condiciones para renderizar el widget
    const shouldRender = turnstileLoaded && !awaitingVerification && turnstileRef.current && window.turnstile && !turnstileWidgetId;
    // Condiciones para remover el widget (si existe y ya no debería estar visible)
    const shouldRemove = turnstileWidgetId && (awaitingVerification || !turnstileRef.current || !window.turnstile);

    if (shouldRender) {
      console.log("Condiciones para renderizar Turnstile cumplidas. Ref:", turnstileRef.current);
      const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
      console.log("VITE_TURNSTILE_SITE_KEY:", siteKey);

      if (!siteKey) {
        setMessage("Configuración de seguridad incompleta.");
        setTurnstileError("Error: Clave de sitio de Turnstile no configurada.");
        console.error("VITE_TURNSTILE_SITE_KEY no está configurada o es vacía.");
        return;
      }

      try {
        // Usa la referencia directa al elemento para renderizar
        const id = window.turnstile.render(turnstileRef.current, {
          sitekey: siteKey,
          callback: onTurnstileVerify,
          "error-callback": onTurnstileError,
        });
        setTurnstileWidgetId(id);
        setTurnstileError(""); // Limpiar cualquier error previo
        console.log("Turnstile widget renderizado con ID:", id);
      } catch (error) {
        console.error("Error al renderizar Turnstile (en el try/catch):", error);
        setTurnstileError("No se pudo cargar la verificación de seguridad.");
        setMessage("No se pudo cargar la verificación de seguridad. Inténtalo más tarde.");
      }
    } else if (shouldRemove) {
      console.log("Removiendo widget debido a cambio de condiciones o limpieza.");
      window.turnstile.remove(turnstileWidgetId);
      setTurnstileWidgetId(null);
      setTurnstileToken(""); // Limpiar token si el widget es removido
    }

    // Función de limpieza: se ejecuta cuando el componente se desmonta o antes de que el efecto se vuelva a ejecutar
    return () => {
      if (turnstileWidgetId && typeof window !== "undefined" && window.turnstile) {
        console.log("Limpieza: Removiendo widget con ID:", turnstileWidgetId);
        window.turnstile.remove(turnstileWidgetId);
        // No se establece setTurnstileWidgetId(null) aquí para evitar bucles si el estado es la causa del re-render
      }
    };
  }, [turnstileLoaded, awaitingVerification, turnstileRef, turnstileWidgetId, onTurnstileVerify, onTurnstileError]); // Dependencias

  // Función para restablecer completamente el widget (remover y forzar re-render)
  const restablecerTurnstile = useCallback(() => {
    if (turnstileWidgetId && typeof window !== "undefined" && window.turnstile) {
      console.log("restablecerTurnstile: Removiendo widget y forzando re-render.");
      window.turnstile.remove(turnstileWidgetId);
      setTurnstileWidgetId(null); // Esto dispara el useEffect para intentar renderizar de nuevo
      setTurnstileToken("");
    } else {
        console.log("restablecerTurnstile: No hay widget para remover, forzando intento de re-render.");
        setTurnstileWidgetId(null); // Asegurar null, para que useEffect intente renderizar
    }
  }, [turnstileWidgetId]);


  async function handleSubmit(e) {
    e.preventDefault();

    if (awaitingVerification) return;

    if (!turnstileToken) {
      setMessage("Debes completar la verificación de seguridad antes de registrarte.");
      return;
    }

    setCargando(true);

    try {
      const response = await fetch(
        `${API_ROOT}/inser/registrar`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nombre,
            telefono,
            email,
            password,
            turnstileToken, // Asegúrate de que este nombre coincide con el backend
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setAwaitingVerification(true);
                setConfirmationCode("");
        setMessage(data.message || "Enviamos un código a tu correo para confirmar la dirección.");
      } else {
        setMessage(data.message || "No se pudo registrar el usuario");
      }
    } catch {
      setMessage("Error de conexión con el servidor");
    } finally {
      // Usar restablecerTurnstile para una limpieza completa
      restablecerTurnstile();
      setCargando(false);
    }
  }

  async function verificarCorreo(e) {
    e.preventDefault();
    if (confirmationCode.length !== 6) {
      setMessage("Ingresa el código de 6 dígitos que enviamos a tu correo.");
      return;
    }

    setVerificandoCorreo(true);
                setMessage("");

    try {
      const response = await fetch(`${API_ROOT}/inser/registrar/verificar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), codigo: confirmationCode }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(data.message || "No se pudo confirmar el correo.");
        return;
      }

      setMessage(data.message || "Correo confirmado. Ya puedes iniciar sesión.");
      setNombre("");
      setTelefono("");
      setEmail("");
      setPassword("");
      setConfirmationCode("");
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
      const response = await fetch(`${API_ROOT}/inser/registrar/reenviar-codigo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
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
            <span className="auth-eyebrow">BIENVENIDA A TU NUEVO RITUAL</span>
            <h1>Tu momento de cuidarte empieza aquí.</h1>
            <p>
              Crea tu cuenta para reservar tus servicios y vivir una
              experiencia de belleza hecha para ti.
            </p>
          </div>
          <div className="auth-brand-detail" aria-hidden="true">
            <span>JC</span>
          </div>
          <p className="auth-brand-caption">Tu belleza, nuestro arte.</p>
        </aside>

        <form
          className="registro-form auth-card auth-card-register"
          onSubmit={awaitingVerification ? verificarCorreo : handleSubmit}
        >
          <div className="auth-form-heading">
            <span className="auth-eyebrow">ÚNETE A NOSOTROS</span>
            <h2 className="registro-title">
              {awaitingVerification ? "Confirma tu correo" : "Crear cuenta"}
            </h2>
            <p>
              {awaitingVerification
                ? `Ingresa el código que enviamos a ${email}.`
                : "Completa tus datos para comenzar."}
            </p>
          </div>

        {awaitingVerification ? (
          <div className="registro-email-confirmation">
            <label htmlFor="registro-codigo">Código de confirmación</label>
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
              onChange={(e) => setConfirmationCode(
                e.target.value.replace(/\D/g, "").slice(0, 6)
              )}
              aria-describedby="registro-codigo-ayuda"
              required
            />
            <p id="registro-codigo-ayuda">
              El código vence en 10 minutos. Revisa también la carpeta de spam.
            </p>
            <button
              className="registro-button"
              type="submit"
              disabled={verificandoCorreo || confirmationCode.length !== 6}
            >
              {verificandoCorreo ? "Confirmando..." : "Confirmar correo y crear cuenta"}
            </button>
            <button
              className="registro-captcha-refresh"
              type="button"
              onClick={reenviarCodigo}
              disabled={reenviandoCodigo || verificandoCorreo}
            >
              {reenviandoCodigo ? "Enviando..." : "Reenviar código"}
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
            onToggle={() => setMostrarPassword((visible) => !visible)}
          />
        </div>

        <div className="turnstile-container">
          {turnstileError && (
            <p className="turnstile-status error" role="alert">{turnstileError}</p>
          )}
          {!turnstileError && (
            // 3. Adjunta la referencia al div donde Turnstile debe renderizarse
            // Ya no es estrictamente necesario el id="turnstile-widget" si se usa el ref
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
          <p className="registro-message" role="status">
            {message}
          </p>
        )}
        {/* Usar resetTurnstile para que el usuario pueda intentar la verificación de nuevo */}
        {message && message.includes("verificación de seguridad") && (
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


