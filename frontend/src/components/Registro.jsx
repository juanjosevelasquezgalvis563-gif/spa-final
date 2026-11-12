import { useCallback, useEffect, useState } from "react";
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
  const [captcha, setCaptcha] = useState(null);
  const [captchaAnswer, setCaptchaAnswer] = useState([]);
  const [captchaProof, setCaptchaProof] = useState("");
  const [captchaRound, setCaptchaRound] = useState(1);
  const [verificandoCaptcha, setVerificandoCaptcha] = useState(false);
  const [cargandoCaptcha, setCargandoCaptcha] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState("");
  const [verificandoCorreo, setVerificandoCorreo] = useState(false);
  const [reenviandoCodigo, setReenviandoCodigo] = useState(false);

  const cargarCaptcha = useCallback(async (reiniciarProgreso = false) => {
    setCargandoCaptcha(true);
    setCaptcha(null);
    setCaptchaAnswer([]);
    setCaptchaProof("");
    if (reiniciarProgreso) setCaptchaRound(1);

    try {
      const response = await fetch(`${API_ROOT}/inser/captcha`);
      if (!response.ok) throw new Error("No se pudo cargar la verificación");
      setCaptcha(await response.json());
    } catch {
      setMessage("No se pudo cargar el CAPTCHA. Vuelve a intentarlo.");
    } finally {
      setCargandoCaptcha(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(cargarCaptcha);
  }, [cargarCaptcha]);

  useEffect(() => {
    if (!message) return undefined;

    const timer = setTimeout(() => setMessage(""), 5000);
    return () => clearTimeout(timer);
  }, [message]);

  function seleccionarImagen(imageId) {
    if (!captcha || verificandoCaptcha || captchaProof) return;

    setCaptchaAnswer((seleccionadas) => (
      seleccionadas.includes(imageId)
        ? []
        : [imageId]
    ));
  }

  async function verificarSeleccion() {
    if (!captcha || verificandoCaptcha || captchaProof) return;
    if (captchaAnswer.length !== 1) {
      setMessage("Selecciona una imagen antes de verificar el CAPTCHA.");
      return;
    }

    setVerificandoCaptcha(true);
    setMessage("");

    try {
      const response = await fetch(`${API_ROOT}/inser/captcha/verificar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: captcha.challengeId,
          captchaAnswer,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(data.message || "No se pudo verificar la imagen. Inténtalo otra vez.");
        if (data.captcha) {
          setCaptcha(data.captcha);
          setCaptchaAnswer([]);
        }
        return;
      }

      if (data.verified && data.captchaProof) {
        setCaptchaProof(data.captchaProof);
        setMessage("¡Verificación completada! Ahora puedes registrarte.");
      } else {
        setCaptcha(data.captcha);
        setCaptchaAnswer([]);
        const rondaCompletada = data.roundCompleted ?? captchaRound;
        setCaptchaRound(data.round ?? rondaCompletada + 1);
        setMessage(`Verificación ${rondaCompletada} completada. Continúa con la siguiente.`);
      }
    } catch {
      setMessage("Error de conexión al verificar la imagen.");
      await cargarCaptcha();
    } finally {
      setVerificandoCaptcha(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (awaitingVerification) return;

    if (!captchaProof) {
      setMessage("Debes completar el CAPTCHA primero: selecciona una imagen y verifica tu selección.");
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
            captchaProof,
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
      await cargarCaptcha();
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

        <fieldset className="registro-captcha" disabled={cargandoCaptcha || cargando || verificandoCaptcha || Boolean(captchaProof)}>
          <legend>Verificación de seguridad</legend>
          <p className="registro-captcha-status">
            Verificación única
          </p>
          <p className="registro-captcha-prompt">
            {cargandoCaptcha ? "Cargando imágenes…" : captcha?.prompt?.replace(/\s*\(son\s+\d+\)\.?/i, "")}
          </p>
          {captcha && (
            <div className="registro-captcha-images">
              {captcha.images.map((image, index) => (
                <button
                  className={`registro-captcha-option${captchaAnswer.includes(image.id) ? " seleccionada" : ""}`}
                  type="button"
                  key={image.id}
                  aria-label={`Seleccionar imagen ${index + 1}`}
                  aria-pressed={captchaAnswer.includes(image.id)}
                  onClick={() => seleccionarImagen(image.id)}
                >
                  <img src={image.src} alt={`Opción ${index + 1}`} />
                  <span>{captchaAnswer.includes(image.id) ? "✓" : ""}</span>
                </button>
              ))}
            </div>
          )}
          <button
            className="registro-captcha-refresh"
            type="button"
            onClick={() => cargarCaptcha(true)}
            disabled={cargandoCaptcha || cargando}
          >
            Cargar otras imágenes
          </button>
          <p className="registro-captcha-status" aria-live="polite">
            {captchaAnswer.length} de 1 imagen seleccionada
          </p>
          <button
            className="registro-captcha-verify"
            type="button"
            onClick={verificarSeleccion}
            disabled={cargandoCaptcha || cargando || verificandoCaptcha || Boolean(captchaProof)}
          >
            {verificandoCaptcha ? "Verificando…" : "Verificar CAPTCHA"}
          </button>
          {verificandoCaptcha && <p className="registro-captcha-status">Verificando selección…</p>}
          {captchaProof && <p className="registro-captcha-status exitoso" role="status">Verificación completada ✓</p>}
        </fieldset>

        <button
          className="registro-button"
          type="submit"
          disabled={cargando || cargandoCaptcha || verificandoCaptcha}
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

          <p className="auth-switch">
            ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Registro;
