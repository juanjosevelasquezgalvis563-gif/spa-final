import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { API_ROOT } from "../lib/api";

const MIN_CARACTERES = 8;
const CARACTERES_ESPECIALES = "@#$%&*()_";

function validarPassword(password) {
  let tieneMayuscula = false;
  let tieneMinuscula = false;
  let tieneNumero = false;
  let tieneCaracterEspecial = false;

  for (let i = 0; i < password.length; i++) {
    if (password[i] >= "A" && password[i] <= "Z") {
      tieneMayuscula = true;
    } else if (password[i] >= "a" && password[i] <= "z") {
      tieneMinuscula = true;
    } else if (password[i] >= "0" && password[i] <= "9") {
      tieneNumero = true;
    } else if (CARACTERES_ESPECIALES.includes(password[i])) {
      tieneCaracterEspecial = true;
    }
  }

  if (!tieneMayuscula) {
    return "La contraseña debe tener al menos una mayúscula";
  }
  if (!tieneMinuscula) {
    return "La contraseña debe tener al menos una minúscula";
  }
  if (!tieneNumero) {
    return "La contraseña debe tener al menos un número";
  }
  if (!tieneCaracterEspecial) {
    return "La contraseña debe tener al menos un caracter especial";
  }
  if (password.length < MIN_CARACTERES) {
    return `La contraseña debe tener al menos ${MIN_CARACTERES} caracteres`;
  }
  if (new TextEncoder().encode(password).length > 72) {
    return "La contraseña no puede superar los 72 bytes";
  }
  return "";
}

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

    const passwordError = validarPassword(password);
    if (passwordError) {
      showMessage(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      showMessage("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_ROOT}/inser/reset-password`,
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
          maxLength={72}
          autoComplete="new-password"
          required
        />

        <input
          type="password"
          placeholder="Confirmar contraseña"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          minLength={MIN_CARACTERES}
          maxLength={72}
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