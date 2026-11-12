import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { API_ROOT } from "../lib/api";
import "./Reprogramar.css";

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
        `${API_ROOT}/inser/cliente/actualizar/${id}`,
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
    } catch {
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
    <div className="cliente-container reprogramar-page">
      <div className="cliente-card reprogramar-card">
        <span className="reprogramar-eyebrow">GESTIONA TU RESERVA</span>
        <h2 className="cliente-title reprogramar-title">Reprogramar cita</h2>
        <p className="reprogramar-description">
          Elige una nueva fecha, hora, profesional y servicio para tu cita.
        </p>

        <form onSubmit={handleSubmit} className="cliente-form reprogramar-form">
          <label className="reprogramar-field" htmlFor="reprogramar-fecha">
            <span>Fecha</span>
            <input
              id="reprogramar-fecha"
              type="date"
              value={fecha}
              onChange={(e) => SetFecha(e.target.value)}
              className="cliente-input"
            />
          </label>

          <label className="reprogramar-field" htmlFor="reprogramar-hora">
            <span>Hora</span>
            <input
              id="reprogramar-hora"
              type="time"
              value={hora}
              onChange={(e) => SetHora(e.target.value)}
              className="cliente-input"
            />
          </label>

          <label className="reprogramar-field" htmlFor="reprogramar-empleado">
            <span>Profesional</span>
            <select
              id="reprogramar-empleado"
              value={empleadoId}
              onChange={(e) => SetEmpleadoId(e.target.value)}
              className="cliente-input"
            >
              <option value="">Seleccione un empleado</option>
              <option value="3">Santiago</option>
              <option value="5">Antony</option>
              <option value="11">María</option>
            </select>
          </label>

          <label className="reprogramar-field" htmlFor="reprogramar-servicio">
            <span>Servicio</span>
            <select
              id="reprogramar-servicio"
              value={servicioId}
              onChange={(e) => SetServicioId(e.target.value)}
              className="cliente-input"
            >
              <option value="">Seleccione un servicio</option>
              <option value="1">Pestañas</option>
              <option value="2">Lavado de pelo</option>
              <option value="3">Uñas</option>
            </select>
          </label>

          <button type="submit" className="cliente-button reprogramar-button">
            Actualizar cita
          </button>

          {message && (
            <p className="cliente-message reprogramar-message" role="status">
              {message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

export default Reprogramar;