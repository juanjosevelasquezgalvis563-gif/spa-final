import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

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
        "http://localhost:3000/inser/forgot-password",
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
    <div className="forgot-container">
      <form onSubmit={handleSubmit} className="forgot-form">
        <h2>¿Olvidaste tu contraseña?</h2>
        
        <p>
          Ingresa tu correo electrónico para recibir un enlace y recuperar tu contraseña.
        </p>

        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Enviando..." : "Enviar enlace"}
        </button>

        {/* Enlace opcional para volver al login */}
        <div className="forgot-back">
          <Link to="/" className="forgot-password">
            Volver al inicio de sesión
          </Link>
        </div>

        {message && (
          <p className={error ? "reset-message error" : "reset-message success"}>
            {message}
          </p>
        )}
      </form>
    </div>
  );
}

export default ForgotPassword;