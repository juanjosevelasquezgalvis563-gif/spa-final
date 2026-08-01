import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

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

        <h2 className="login-title">Iniciar sesión</h2>

        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="login-input"
          required
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="login-input"
          required
        />

        <button type="submit" className="login-button">
          Iniciar sesión
        </button>

        {message && <p className="login-message">{message}</p>}
      </form>
    </div>
  );
}

export default Login;