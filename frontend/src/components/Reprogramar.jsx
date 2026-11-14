import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { API_ROOT } from "../lib/api";
import "./Reprogramar.css";

export function Reprogramar() {
  const [fecha, SetFecha] = useState("");
  const [hora, SetHora] = useState("");
  const [empleadoId, SetEmpleadoId] = useState("");
  const [servicioId, SetServicioId] = useState("");
  const [empleados, SetEmpleados] = useState([]);
  const [servicios, SetServicios] = useState([]);
  const [message, SetMessage] = useState("");

  
  const { id } = useParams();
  const servicioSeleccionado = servicios.find((servicio) => String(servicio.id) === String(servicioId));
  const tipoProfesionalLabel = () => {
    const nombre = (servicioSeleccionado?.nombre || "").toLowerCase();

    if (nombre.includes("uñas") || nombre.includes("manicure") || nombre.includes("manicura") || nombre.includes("nail")) {
      return "Manicuristas disponibles";
    }

    if (nombre.includes("corte") || nombre.includes("cepillado") || nombre.includes("keratina") || nombre.includes("tinte") || nombre.includes("peinado") || nombre.includes("maquillaje") || nombre.includes("cabello") || nombre.includes("color") || nombre.includes("alisado") || nombre.includes("estilo")) {
      return "Estilistas disponibles";
    }

    return "Profesionales disponibles";
  };

  async function handleSubmit(e) {
    e.preventDefault();

    if (!fecha || !hora || !empleadoId || !servicioId) {
      SetMessage("Completa la fecha, hora, empleado y servicio para reprogramar la cita.");
      return;
    }

    if (!empleados.some((empleado) => String(empleado.id) === String(empleadoId))) {
      SetMessage("Este empleado no puede realizar el servicio seleccionado.");
      return;
    }

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
        SetMessage(data.message || "No se pudo reprogramar la cita.");
      }
    } catch {
      SetMessage('Error de conexion con el servidor');
    }
  }

  async function obtenerEmpleados(servicioActual = "") {
    try {
      const params = new URLSearchParams();
      if (servicioActual) {
        params.set("servicio_id", String(servicioActual));
      }

      const query = params.toString() ? `?${params.toString()}` : "";
      const response = await fetch(`${API_ROOT}/inser/cliente/empleados${query}`, {
        method: "GET",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        SetEmpleados([]);
        return;
      }

      if (Array.isArray(data)) {
        SetEmpleados(data);
        if (servicioActual && !data.some((empleado) => String(empleado.id) === String(empleadoId))) {
          SetEmpleadoId("");
        }
      }
    } catch {
      SetEmpleados([]);
    }
  }

  async function obtenerServicios() {
    try {
      const response = await fetch(`${API_ROOT}/inser/cliente/servicios`, {
        method: "GET",
        credentials: "include",
      });

      const data = await response.json();
      if (response.ok && Array.isArray(data)) {
        SetServicios(data);
      }
    } catch {
      SetServicios([]);
    }
  }

  useEffect(() => {
    obtenerEmpleados();
    obtenerServicios();
  }, []);

  useEffect(() => {
    if (!servicioId) {
      SetEmpleadoId("");
      obtenerEmpleados();
      return;
    }

    obtenerEmpleados(servicioId);
  }, [servicioId]);

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
            <span>{tipoProfesionalLabel()}</span>
            {empleados.length === 0 ? (
              <p className="cliente-message reprogramar-message">No hay profesionales disponibles para este servicio.</p>
            ) : (
              <select
                id="reprogramar-empleado"
                value={empleadoId}
                onChange={(e) => SetEmpleadoId(e.target.value)}
                className="cliente-input"
              >
                <option value="">Seleccione un empleado</option>
                {empleados.map((empleado) => (
                  <option key={empleado.id} value={String(empleado.id)}>
                    {empleado.nombre}
                  </option>
                ))}
              </select>
            )}
          </label>

          <label className="reprogramar-field" htmlFor="reprogramar-servicio">
            <span>Servicio</span>
            <select
              id="reprogramar-servicio"
              value={servicioId}
              onChange={(e) => SetServicioId(e.target.value)}
              className="cliente-input"
              disabled={servicios.length === 0}
            >
              <option value="">Seleccione un servicio</option>
              {servicios.map((servicio) => (
                <option key={servicio.id} value={String(servicio.id)}>
                  {servicio.nombre}
                </option>
              ))}
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