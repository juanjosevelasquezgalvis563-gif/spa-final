
import { useCallback, useEffect, useState } from "react";

export function Registro() {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [captcha, setCaptcha] = useState(null);
  const [captchaAnswer, setCaptchaAnswer] = useState([]);
  const [captchaProof, setCaptchaProof] = useState("");
  const [captchaRound, setCaptchaRound] = useState(1);
  const [verificandoCaptcha, setVerificandoCaptcha] = useState(false);
  const [cargandoCaptcha, setCargandoCaptcha] = useState(true);
  const [cargando, setCargando] = useState(false);

  const cargarCaptcha = useCallback(async (reiniciarProgreso = false) => {
    setCargandoCaptcha(true);
    setCaptcha(null);
    setCaptchaAnswer([]);
    setCaptchaProof("");
    if (reiniciarProgreso) setCaptchaRound(1);

    try {
      const response = await fetch("http://localhost:3000/inser/captcha");
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
        ? seleccionadas.filter((id) => id !== imageId)
        : seleccionadas.length < 4
          ? [...seleccionadas, imageId]
          : seleccionadas
    ));
  }

  async function verificarSeleccion() {
    if (!captcha || verificandoCaptcha || captchaProof) return;
    if (captchaAnswer.length < 4) {
      setMessage("Debes seleccionar al menos 4 imágenes antes de verificar el CAPTCHA.");
      return;
    }

    setVerificandoCaptcha(true);
    setMessage("");

    try {
      const response = await fetch("http://localhost:3000/inser/captcha/verificar", {
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
        if (captchaRound < 3) {
          setCaptchaRound(captchaRound + 1);
          setMessage(`Verificación ${captchaRound} de 3 completada. Continúa con la siguiente.`);
          await cargarCaptcha();
          return;
        }
        setCaptchaProof(data.captchaProof);
        setMessage("¡Verificación completada! Ahora puedes registrarte.");
      } else {
        setCaptcha(data.captcha);
        setCaptchaAnswer([]);
        const rondaCompletada = data.roundCompleted ?? captchaRound;
        setCaptchaRound(data.round ?? rondaCompletada + 1);
        setMessage(`Verificación ${rondaCompletada} de 3 completada. Continúa con la siguiente.`);
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

    if (!captchaProof) {
      setMessage("Debes completar el CAPTCHA primero: selecciona al menos 4 imágenes y verifica tu selección.");
      return;
    }

    setCargando(true);

    try {
      const response = await fetch(
        "http://localhost:3000/inser/registrar",
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
        setMessage(data.message);
        setNombre("");
        setTelefono("");
        setEmail("");
        setPassword("");
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

  return (
    <div className="registro-container">
      <form className="registro-form" onSubmit={handleSubmit}>
        <h2 className="registro-title">
          Regístrate
        </h2>

        <input
          className="registro-input"
          type="text"
          placeholder="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
        />

        <input
          className="registro-input"
          type="tel"
          placeholder="Teléfono"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          required
        />

        <input
          className="registro-input"
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          className="registro-input"
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <fieldset className="registro-captcha" disabled={cargandoCaptcha || cargando || verificandoCaptcha || Boolean(captchaProof)}>
          <legend>Verificación de seguridad</legend>
          <p className="registro-captcha-status">
            Verificación {captchaRound} de 3
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
            {captchaAnswer.length} de 4 imágenes seleccionadas
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
          {cargando ? "Registrando..." : "Registrarse"}
        </button>

        {message && (
          <p className="registro-message">
            {message}
          </p>
        )}
      </form>
    </div>
  );
}

export default Registro;
