import React, { useState } from "react";
import { Link } from "react-router-dom";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

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

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      console.error(error);
      setMessage("Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  }

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
        <div style={{ textAlign: "center", marginTop: "15px" }}>
          <Link to="/" className="forgot-password" style={{ display: "inline", fontSize: "13px" }}>
            Volver al inicio de sesión
          </Link>
        </div>

        {message && <p>{message}</p>}
      </form>
    </div>
  );
}

export default ForgotPassword;