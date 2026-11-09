import { useEffect, useState } from "react";
import { API_ROOT } from "../lib/api";


export  function ActualizarDatos() {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  
 
 

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const response = await fetch(`${API_ROOT}/inser/registrarr`, {
        method: "PUT",
        credentials:'include',
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nombre,
          telefono,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);

       
        setNombre("");
        setTelefono("");
        setEmail("");
        setPassword("");
      } else {
        setMessage(data.message);
      }
    } catch {
      setMessage('Error de conexion con el servidor');
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
    <div className="registro-container actualizar-datos-page">
        <form className="registro-form actualizar-datos-form" onSubmit={handleSubmit}>
            <span className="actualizar-datos-eyebrow">PERFIL DEL EMPLEADO</span>
            <h2 className="registro-title">
                Actualiza tus datos
            </h2>

            <label className="actualizar-datos-campo" htmlFor="actualizar-nombre">
                <span>Nombre</span>
                <input
                    id="actualizar-nombre"
                    className="registro-input"
                    type="text"
                    placeholder="Tu nombre"
                    autoComplete="name"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                />
            </label>

            <label className="actualizar-datos-campo" htmlFor="actualizar-telefono">
                <span>Teléfono</span>
                <input
                    id="actualizar-telefono"
                    className="registro-input"
                    type="tel"
                    placeholder="Tu teléfono"
                    autoComplete="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    required
                />
            </label>

            <label className="actualizar-datos-campo" htmlFor="actualizar-email">
                <span>Correo electrónico</span>
                <input
                    id="actualizar-email"
                    className="registro-input"
                    type="email"
                    placeholder="tucorreo@ejemplo.com"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
            </label>

            <label className="actualizar-datos-campo" htmlFor="actualizar-password">
                <span>Contraseña</span>
                <input
                    id="actualizar-password"
                    className="registro-input"
                    type="password"
                    placeholder="Nueva contraseña"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
            </label>

            <button
                className="registro-button"
                type="submit"
            >
                Actualizar
            </button>

            {message && (
                <p className="registro-message" role="status">
                    {message}
                </p>
            )}
        </form>
    </div>
);
}

export default ActualizarDatos;