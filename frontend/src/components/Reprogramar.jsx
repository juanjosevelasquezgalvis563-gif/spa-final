import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export function Reprogramar() {
  const [fecha, SetFecha] = useState("");
  const [hora, SetHora] = useState("");
  const [empleadoId, SetEmpleadoId] = useState("");
  const [servicioId, SetServicioId] = useState("");
  const [message, SetMessage] = useState("");

  
  const { id } = useParams();

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      const response = await fetch(
        `http://localhost:3000/inser/cliente/actualizar/${id}`,
        {
          method: "PUT",
          credentials:'include',
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            fecha,
            hora,
            empleado_id: empleadoId,
            servicio_id: servicioId,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        SetMessage(data.message);
      } else {
        SetMessage(data.message);
      }
    } catch (error) {
      SetMessage('Error de conexion con el servidor');
    }
  }

  useEffect(() => {
    if (!message) return;

    const temporizador = setTimeout(() => {
      SetMessage("");
    }, 4000);

    return () => clearTimeout(temporizador);
  }, [message]);

  return (
    <div className="cliente-container">
      <div className="cliente-card">
        <h2 className="cliente-title">Reprogramar cita</h2>

        <form onSubmit={handleSubmit} className="cliente-form">
          <input
            type="date"
            value={fecha}
            onChange={(e) => SetFecha(e.target.value)}
            className="cliente-input"
          />

          <input
            type="time"
            value={hora}
            onChange={(e) => SetHora(e.target.value)}
            className="cliente-input"
          />

          <select
            value={empleadoId}
            onChange={(e) => SetEmpleadoId(e.target.value)}
            className="cliente-input"
          >
            <option value="">Seleccione un empleado</option>
            <option value="3">Santiago</option>
            <option value="5">Antony</option>
            <option value="11">María</option>
          </select>

          <select
            value={servicioId}
            onChange={(e) => SetServicioId(e.target.value)}
            className="cliente-input"
          >
            <option value="">Seleccione un servicio</option>
            <option value="1">Pestañas</option>
            <option value="2">Lavado de pelo</option>
            <option value="3">Uñas</option>
          </select>

          <button type="submit" className="cliente-button">
            Actualizar cita
          </button>

          {message && (
            <p className="cliente-message">
              {message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

export default Reprogramar;