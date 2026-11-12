import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import logo from "../assets/image.png";
import { API_ROOT } from "../lib/api";
import { useSession } from "../context/useSession";
import PasswordVisibilityToggle from "./PasswordVisibilityToggle";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [message, setMessage] = useState("");

  const navigate = useNavigate();
  const location = useLocation();
  const { user, setAuthenticatedUser } = useSession();
  const requestedPath = new URLSearchParams(location.search).get("redirect")
    || location.state?.from?.pathname;

  function redirigirUsuario(user) {
    setAuthenticatedUser(user);
    if (user.rol === "administrador") {
      navigate(requestedPath === "/admin/productos" ? requestedPath : "/admin");
    } else if (user.rol === "cliente") {
      navigate(requestedPath === "/cliente/productos" ? requestedPath : "/cliente");
    } else if (user.rol === "empleado") {
      navigate("/empleado");
    }
  }

  useEffect(() => {
    if (!user) return;

    if (user.rol === "administrador") {
      navigate(requestedPath === "/admin/productos" ? requestedPath : "/admin", { replace: true });
    } else if (user.rol === "cliente") {
      navigate(requestedPath === "/cliente/productos" ? requestedPath : "/cliente", { replace: true });
    } else if (user.rol === "empleado") {
      navigate("/empleado", { replace: true });
    }
  }, [navigate, requestedPath, user]);

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      const response = await fetch(`${API_ROOT}/inser/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        redirigirUsuario(data.user);
      } else {
        setMessage(data.message);
      }
    } catch {
      setMessage("Error de conexión con el servidor");
    }
  }

  async function handleGoogleSuccess(credentialResponse) {
    try {
      const response = await fetch(
        `${API_ROOT}/inser/auth/google`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            credential: credentialResponse.credential,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        redirigirUsuario(data.user);
      } else {
        setMessage(data.message || "No se pudo iniciar sesión con Google");
      }
    } catch {
      setMessage("Error de conexión con el servidor");
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
    <div className="login-container auth-page">
      <div className="auth-layout">
        <aside className="auth-brand-panel">
          <div className="auth-brand">
            <img src={logo} alt="JC Alta Peluquería" />
            <span>JC Alta Peluquería</span>
          </div>
          <div className="auth-brand-copy">
            <span className="auth-eyebrow">BELLEZA Y BIENESTAR</span>
            <h1>Un espacio para resaltar tu esencia.</h1>
            <p>
              Ingresa a tu cuenta y continúa disfrutando de una experiencia
              pensada para ti.
            </p>
          </div>
          <div className="auth-brand-detail" aria-hidden="true">
            <span>JC</span>
          </div>
          <p className="auth-brand-caption">Tu belleza, nuestro arte.</p>
        </aside>

        <form onSubmit={handleSubmit} className="login-form auth-card auth-card-login">
          <div className="auth-form-heading">
            <span className="auth-eyebrow">QUÉ BUENO TENERTE DE VUELTA</span>
            <h2 className="login-title">Iniciar sesión</h2>
            <p>Ingresa tus datos para continuar.</p>
          </div>

          <div className="login-group">
            <label htmlFor="login-email">Correo electrónico</label>
            <input
              id="login-email"
              type="email"
              placeholder="tucorreo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="login-input"
              autoComplete="email"
              required
            />
          </div>

          <div className="login-group">
            <label htmlFor="login-password">Contraseña</label>
            <div className="password-field">
              <input
                id="login-password"
                type={mostrarPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input"
                autoComplete="current-password"
                required
              />
              <PasswordVisibilityToggle
                visible={mostrarPassword}
                onToggle={() => setMostrarPassword((visible) => !visible)}
              />
            </div>
          </div>

          <div className="login-footer-links">
            <Link to="/forgot-password" className="forgot-password">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button type="submit" className="login-button">
            Iniciar sesión
          </button>

          <div className="login-google">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => {
                setMessage("No se pudo iniciar sesión con Google");
              }}
              text="continue_with"
              shape="rectangular"
              width="280"
            />
          </div>

          {message && <p className="login-message" role="alert">{message}</p>}

          <p className="auth-switch">
            ¿Aún no tienes cuenta? <Link to="/registro">Crear cuenta</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;
