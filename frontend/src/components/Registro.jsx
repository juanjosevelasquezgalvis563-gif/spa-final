
import React, { useEffect, useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";

export function Registro() {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaKey, setCaptchaKey] = useState(0);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!captchaToken) {
      setMessage("Completa la verificación CAPTCHA");
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
            captchaToken,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        setNombre("");
        setTelefono("");
        setEmail("");
        setPassword("");
      } else {
        setMessage(data.message || "No se pudo registrar el usuario");
      }
    } catch (error) {
      setMessage("Error de conexión con el servidor");
    } finally {
      setCaptchaToken("");
      setCaptchaKey((key) => key + 1);
      setCargando(false);
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

        <div className="registro-captcha">
          <Turnstile
            key={captchaKey}
            siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
            onSuccess={(token) => setCaptchaToken(token)}
            onExpire={() => setCaptchaToken("")}
            onError={() => {
              setCaptchaToken("");
              setMessage("Error al cargar el CAPTCHA. Inténtalo de nuevo.");
            }}
          />
        </div>

        <button
          className="registro-button"
          type="submit"
          disabled={cargando || !captchaToken}
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
