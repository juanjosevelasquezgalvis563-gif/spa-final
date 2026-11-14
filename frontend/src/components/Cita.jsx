import { useEffect, useState } from "react";
import { API_ROOT } from "../lib/api";

export function Cita() {

  const [fecha, SetFecha] = useState("");
  const [hora, SetHora] = useState("");
  const [empleadoId, SetEmpleadoId] = useState("");
  const [servicioId, SetServicioId] = useState("");
  const [unasAbiertas, SetUnasAbiertas] = useState(false);
  const [message, SetMessage] = useState("");
  const [servicios, SetServicios] = useState([]);
  const [empleados, SetEmpleados] = useState([]);
  const [cargandoServicios, SetCargandoServicios] = useState(true);

  const servicioSeleccionado = servicios.find(
    (servicio) => String(servicio.id) === String(servicioId)
  );
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
  const serviciosUnas = servicios.slice(0, 17);
  const otrosServicios = servicios.slice(17);
  const renderServicio = (servicio, independiente = false) => {
    const seleccionado = servicioId !== "" && Number(servicio.id) === Number(servicioId);

    return (
      <button
        className={`servicio-card cita-service-card cita-detail-card${seleccionado ? " seleccionado" : ""}`}
        key={servicio.id}
        type="button"
        aria-pressed={seleccionado}
        onClick={() => SetServicioId(String(servicio.id))}
      >
        <span className="servicio-info">
          <strong className={seleccionado ? "servicio-nombre-seleccionado" : ""}>
            {servicio.nombre}
          </strong>
          <span className="cita-servicio-precio">
            {servicio.precio != null && servicio.precio !== ""
              ? `$${Number(servicio.precio).toLocaleString("es-CO")}`
              : ""}
          </span>
          <span className="cita-seleccionar-servicio">
            {independiente ? "Ver" : "Seleccionar"}
          </span>
        </span>
      </button>
    );
  };


  async function handleSubmit(e) {
    e.preventDefault();

    if (!fecha || !hora || !empleadoId || !servicioId) {
      SetMessage("Completa fecha, hora, empleado y servicio para agendar la cita.");
      return;
    }

    if (!empleados.some((empleado) => String(empleado.id) === String(empleadoId))) {
      SetMessage("Este empleado no puede realizar el servicio seleccionado.");
      return;
    }

    try {
      const response = await fetch(
        `${API_ROOT}/inser/cliente`,
        {
          method: "POST",
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
        SetFecha("");
        SetHora("");
        SetEmpleadoId("");
      } else {
        SetMessage(data.message || "No se pudo agendar la cita.");
      }

    } catch {
      SetMessage('Error de conexion con el servidor');
    }
  }

  async function Servicios() {
    try {
      const response = await fetch(
        `${API_ROOT}/inser/cliente/servicios`,
        {
          method: "GET",
          credentials:'include',
        }
      );

      const data = await response.json();

      if (response.ok) {
        if (!Array.isArray(data)) {
          SetMessage("No se pudo cargar la lista de servicios.");
          return;
        }
        SetServicios(data);
      }else{
        SetMessage(data.message || "No se pudo cargar la lista de servicios.");
      }

    } catch {
      SetMessage('Error de conexion con el servidor');
    } finally {
      SetCargandoServicios(false);
    }
  }

  async function obtenerEmpleados(servicioActual = servicioId) {
    try {
      const params = new URLSearchParams();
      if (servicioActual) {
        params.set("servicio_id", String(servicioActual));
      }

      const query = params.toString() ? `?${params.toString()}` : "";
      const response = await fetch(
        `${API_ROOT}/inser/cliente/empleados${query}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        SetMessage(data.message || "No se pudo cargar la lista de empleados.");
        SetEmpleados([]);
        return;
      }

      if (!Array.isArray(data)) {
        SetEmpleados([]);
        return;
      }

      SetEmpleados(data);
      if (servicioActual && !data.some((empleado) => String(empleado.id) === String(empleadoId))) {
        SetEmpleadoId("");
      }
    } catch {
      SetMessage("Error de conexión con el servidor al cargar empleados.");
      SetEmpleados([]);
    }
  }

  useEffect(() => {
    const temporizador = window.setTimeout(() => {
      Servicios();
      obtenerEmpleados();
    }, 0);
    return () => window.clearTimeout(temporizador);
  }, []);

  useEffect(() => {
    if (!servicioId) {
      SetEmpleadoId("");
      obtenerEmpleados("");
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
    <div className="cita-container">

      <div className="cita-hero">

        <span className="cita-eyebrow">
          <span className="cita-eyebrow-dot" />
          Reserva en línea
        </span>

        <h1 className="cita-title">
          Agenda tu cita
        </h1>

        <p className="cita-subtitle">
          Elige una categoría, selecciona el servicio que deseas y agenda tu cita.
          Confirmaremos tu solicitud en unos instantes.
        </p>

      </div>

      <div className="cita-layout">

      

        <div className="servicios-container servicios-panel">

          <div className="servicios-head">
            <h2 className="servicios-titulo">
              {unasAbiertas ? "Uñas" : "Elige un servicio"}
            </h2>
            <span className="servicios-count">
              {`${servicios.length} servicios`}
            </span>
          </div>

          {cargandoServicios ? (
            <p className="cita-servicios-estado" role="status">Cargando servicios...</p>
          ) : servicios.length === 0 ? (
            <p className="cita-servicios-estado">No hay servicios disponibles en este momento.</p>
          ) : (
            <div className="servicios-grid">
              {serviciosUnas.length > 0 && (
                <button
                  className="servicio-card cita-service-card cita-category-card"
                  type="button"
                  aria-expanded={unasAbiertas}
                  onClick={() => {
                    SetUnasAbiertas(!unasAbiertas);
                    SetServicioId("");
                  }}
                >
                  <span className="servicio-info">
                    <strong>Uñas</strong>
                    <span>{serviciosUnas.length} servicios disponibles</span>
                    <span className="cita-seleccionar-servicio">Ver</span>
                  </span>
                </button>
              )}

              {unasAbiertas && serviciosUnas.map((servicio) => renderServicio(servicio, false))}
              {otrosServicios.map((servicio) => renderServicio(servicio, true))}
            </div>
          )}

          {message && (
            <p className="mensaje-cita" role="status" aria-live="polite">
              {message}
            </p>
          )}

        </div>

        {servicioSeleccionado && (
        <div className="cita-formulario">

          <div className="cita-form-head">
            <h2 className="cita-form-titulo">
              Agenda tu cita
            </h2>
            <p className="cita-form-desc">
              Servicio: {servicioSeleccionado.nombre}
            </p>
          </div>

          <form onSubmit={handleSubmit}>

            <div className="cita-fila">

              <div className="cita-campo">
                <label htmlFor="cita-fecha">
                  <span className="cita-label-icon" aria-hidden="true">📅</span>
                  Fecha
                </label>
                <input
                  id="cita-fecha"
                  type="date"
                  value={fecha}
                  onChange={(e) =>
                    SetFecha(e.target.value)
                  }
                />
              </div>

              <div className="cita-campo">
                <label htmlFor="cita-hora">
                  <span className="cita-label-icon" aria-hidden="true">⏰</span>
                  Hora
                </label>
                <input
                  id="cita-hora"
                  type="time"
                  value={hora}
                  onChange={(e) =>
                    SetHora(e.target.value)
                  }
                />
              </div>

            </div>


            <div className="cita-campo">

              <label htmlFor="cita-empleado">
                <span className="cita-label-icon" aria-hidden="true">✂️</span>
                {tipoProfesionalLabel()}
              </label>

              {empleados.length === 0 ? (
                <p className="cita-servicios-estado">No hay profesionales disponibles para este servicio.</p>
              ) : (
                <select
                  id="cita-empleado"
                  value={empleadoId}
                  onChange={(e) => SetEmpleadoId(e.target.value)}
                >
                  <option value="">Seleccione un empleado</option>
                  {empleados.map((empleado) => (
                    <option key={empleado.id} value={String(empleado.id)}>
                      {empleado.nombre}
                    </option>
                  ))}
                </select>
              )}

            </div>


            <button
              className="cita-boton"
              type="submit"
            >
              Agendar cita
            </button>

          </form>

        </div>
        )}

      </div>

    </div>
  );
}

export default Cita;