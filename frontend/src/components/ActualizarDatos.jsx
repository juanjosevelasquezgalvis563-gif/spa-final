import React, { useEffect, useState } from "react";


export  function ActualizarDatos() {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  
 
 

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      const response = await fetch("http://localhost:3000/inser/registrarr", {
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
    } catch (error) {
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
    <div className="registro-container">
        <form className="registro-form" onSubmit={handleSubmit}>
            <h2 className="registro-title">
                Actualiza tus datos
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

            <button
                className="registro-button"
                type="submit"
            >
                Actualizar
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

export default ActualizarDatos;