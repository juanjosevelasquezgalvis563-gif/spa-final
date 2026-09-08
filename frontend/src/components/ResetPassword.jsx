import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");

   
    if (password !== confirmPassword) {
      setMessage("Las contraseñas no coinciden");
      return;
    }

    
    if (password.length < 6) {
      setMessage("La contraseña debe tener mínimo 6 caracteres");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "http://localhost:3000/inser/reset-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token: token,
            nuevaPassword: password,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        setTimeout(() => {
          navigate("/login"); 
        }, 2000);
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
    <div className="reset-container">
      <form onSubmit={handleSubmit} className="reset-form">
        <h2>Cambiar contraseña</h2>

        <p>Ingresa tu nueva contraseña para continuar.</p>

        <input
          type="password"
          placeholder="Nueva contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Confirmar contraseña"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Cambiando..." : "Cambiar contraseña"}
        </button>

        {message && <p>{message}</p>}
      </form>
    </div>
  );
}

export default ResetPassword;