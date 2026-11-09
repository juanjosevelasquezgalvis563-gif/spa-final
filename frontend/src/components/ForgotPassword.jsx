import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/image.png";
import { API_ROOT } from "../lib/api";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  function showMessage(text, isError = true) {
    setMessage(text);
    setError(isError);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(
        `${API_ROOT}/inser/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        showMessage(
          data.message || "No se pudo enviar el enlace de recuperación"
        );
        return;
      }

      showMessage(
        data.message || "Se ha enviado el enlace de recuperación a tu correo",
        false
      );

      setEmail("");
    } catch (error) {
      console.error(error);
      showMessage("Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!message) return;

    const temporizador = setTimeout(() => {
      setMessage("");
    }, 4000);

    return () => clearTimeout(temporizador);
  }, [message]);

  return (
    <div className="forgot-container auth-page">
      <div className="auth-layout">
        <aside className="auth-brand-panel">
          <div className="auth-brand">
            <img src={logo} alt="JC Alta Peluquería" />
            <span>JC Alta Peluquería</span>
          </div>
          <div className="auth-brand-copy">
            <span className="auth-eyebrow">RECUPERA EL ACCESO A TU CUENTA</span>
            <h1>Tu próxima experiencia comienza aquí.</h1>
            <p>
              Te enviaremos un enlace seguro para que puedas crear una nueva
              contraseña y volver a disfrutar de nuestros servicios.
            </p>
          </div>
          <div className="auth-brand-detail" aria-hidden="true">
            <span>JC</span>
          </div>
          <p className="auth-brand-caption">Tu belleza, nuestro arte.</p>
        </aside>

        <form
          onSubmit={handleSubmit}
          className="forgot-form auth-card auth-card-forgot"
        >
          <div className="auth-form-heading">
            <span className="auth-eyebrow">ASISTENCIA DE CUENTA</span>
            <h2 className="forgot-title">¿Olvidaste tu contraseña?</h2>
            <p>
              Ingresa el correo asociado a tu cuenta y te enviaremos un enlace
              para recuperarla.
            </p>
          </div>

          <div className="forgot-email-group">
            <label htmlFor="forgot-email">Correo electrónico</label>
            <input
              id="forgot-email"
              className="forgot-email-input"
              type="email"
              placeholder="tucorreo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <button className="forgot-button" type="submit" disabled={loading}>
            {loading ? "Enviando..." : "Enviar enlace de recuperación"}
          </button>

          <div className="forgot-back">
            <Link to="/login" className="forgot-password">
              Volver al inicio de sesión
            </Link>
          </div>

          {message && (
            <p
              className={error ? "reset-message error" : "reset-message success"}
              role={error ? "alert" : "status"}
            >
              {message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

export default ForgotPassword;