import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      const response = await fetch("http://localhost:3000/inser/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        if (data.user.rol === "administrador") {
          navigate("/admin");
        }
        if (data.user.rol === "cliente") {
          navigate("/cliente");
        }
        if (data.user.rol === "empleado") {
          navigate("/empleado");
        }
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <div className="login-header">
          <h2 className="login-title">Bienvenido a Jc Alta Peluqueria</h2>
          
        </div>

        <div className="login-group">
          <label>Correo electrónico</label>
          <input
            type="email"
            placeholder="tucorreo@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="login-input"
            required
          />
        </div>

        <div className="login-group">
          <label>Contraseña</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="login-input"
            required
          />
        </div>

        <button type="submit" className="login-button">
          Iniciar sesión
        </button>

        
        <div className="login-footer-links">
          <Link to="/forgot-password" className="forgot-password">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        {message && <p className="login-message">{message}</p>}
      </form>
    </div>
  );
}

export default Login;