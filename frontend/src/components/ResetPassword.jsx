import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";

const MIN_CARACTERES = 6;

export function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

    if (password.length < MIN_CARACTERES) {
      showMessage(
        `La contraseña debe tener mínimo ${MIN_CARACTERES} caracteres`
      );
      return;
    }

    if (password !== confirmPassword) {
      showMessage("Las contraseñas no coinciden");
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

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        showMessage(
          data.message || "No se pudo cambiar la contraseña"
        );
        return;
      }

      showMessage(
        data.message || "Contraseña actualizada correctamente",
        false
      );

      setPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        navigate("/login");
      }, 2000);
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
    <div className="reset-container">
      <form onSubmit={handleSubmit} className="reset-form" noValidate>
        <h2>Cambiar contraseña</h2>

        <p>Ingresa tu nueva contraseña para continuar.</p>

        <input
          type="password"
          placeholder="Nueva contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={MIN_CARACTERES}
          autoComplete="new-password"
          required
        />

        <input
          type="password"
          placeholder="Confirmar contraseña"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          minLength={MIN_CARACTERES}
          autoComplete="new-password"
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Cambiando..." : "Cambiar contraseña"}
        </button>

        {message && (
          <p className={error ? "reset-message error" : "reset-message success"}>
            {message}
          </p>
        )}

        <div className="forgot-back">
          <Link to="/forgot-password" className="forgot-password">
            Solicitar un nuevo enlace
          </Link>
        </div>
      </form>
    </div>
  );
}

export default ResetPassword;