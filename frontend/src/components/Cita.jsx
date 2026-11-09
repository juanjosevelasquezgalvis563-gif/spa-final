import { useEffect, useState } from "react";
import { API_ROOT } from "../lib/api";

const serviciosPagina = [
  { id: 1, nombre: "Pestañas" },
  { id: 2, nombre: "Lavado de pelo" },
  { id: 3, nombre: "Uñas" },
];

function obtenerCategoria(nombre) {
  const nombreNormalizado = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (/\b(unas?|manicure|pedicure)\b/.test(nombreNormalizado)) return "Uñas";
  if (nombreNormalizado.includes("pestana")) return "Pestañas";
  if (/(pelo|cabello|corte|cepillado|color|keratina)/.test(nombreNormalizado)) return "Cabello";
  if (nombreNormalizado.includes("facial")) return "Cuidado facial";
  if (nombreNormalizado.includes("maquillaje")) return "Maquillaje";
  return nombre;
}

export function Cita() {

  const [fecha, SetFecha] = useState("");
  const [hora, SetHora] = useState("");
  const [empleadoId, SetEmpleadoId] = useState("");
  const [servicioId, SetServicioId] = useState("");
  const [categoriaSeleccionada, SetCategoriaSeleccionada] = useState("");
  const [message, SetMessage] = useState("");
  const [servicios, SetServicios] = useState(serviciosPagina);
  const [cargandoServicios, SetCargandoServicios] = useState(true);

  const servicioSeleccionado = servicios.find(
    (servicio) => String(servicio.id) === String(servicioId)
  );
  const categorias = servicios.reduce((grupos, servicio) => {
    const nombre = obtenerCategoria(servicio.nombre);
    if (!grupos[nombre]) grupos[nombre] = [];
    grupos[nombre].push(servicio);
    return grupos;
  }, {});
  const serviciosCategoria = categorias[categoriaSeleccionada] || [];



  async function handleSubmit(e) {
    e.preventDefault();

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
        SetMessage(data.message);
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
        SetServicios(data.length > 0 ? data : serviciosPagina);
      }else{
        SetMessage(data.message || "No se pudo cargar la lista de servicios.");
      }

    } catch {
      SetMessage('Error de conexion con el servidor');
    } finally {
      SetCargandoServicios(false);
    }
  }

  useEffect(() => {
    const temporizador = window.setTimeout(Servicios, 0);
    return () => window.clearTimeout(temporizador);
  }, []);

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
              {categoriaSeleccionada || "Elige una categoría"}
            </h2>
            <span className="servicios-count">
              {categoriaSeleccionada
                ? `${serviciosCategoria.length} servicios`
                : `${Object.keys(categorias).length} categorías`}
            </span>
          </div>

          {categoriaSeleccionada && (
            <button
              className="cita-volver-categorias"
              type="button"
              onClick={() => {
                SetCategoriaSeleccionada("");
                SetServicioId("");
              }}
            >
              ← Ver todas las categorías
            </button>
          )}

          {cargandoServicios ? (
            <p className="cita-servicios-estado" role="status">Cargando servicios...</p>
          ) : servicios.length === 0 ? (
            <p className="cita-servicios-estado">No hay servicios disponibles en este momento.</p>
          ) : (
            <div className="servicios-grid">
              {categoriaSeleccionada
                ? serviciosCategoria.map((servicio) => (
                    <button
                      className="servicio-card cita-service-card"
                      key={servicio.id}
                      type="button"
                      onClick={() => SetServicioId(String(servicio.id))}
                    >
                      {servicio.image && (
                        <div className="servicio-media">
                          <img
                            src={servicio.image}
                            alt=""
                            className="servicio-image"
                          />
                        </div>
                      )}
                      <span className="servicio-info">
                        <strong>{servicio.nombre}</strong>
                        {servicio.descripcion && <span>{servicio.descripcion}</span>}
                        {servicio.precio != null && (
                          <span className="cita-servicio-precio">
                            ${Number(servicio.precio).toLocaleString("es-CO")}
                          </span>
                        )}
                        <span className="cita-seleccionar-servicio">
                          {String(servicio.id) === String(servicioId) ? "Seleccionado" : "Elegir servicio"}
                        </span>
                      </span>
                    </button>
                  ))
                : Object.entries(categorias).map(([nombre, serviciosGrupo]) => (
                    <button
                      className="servicio-card cita-service-card"
                      key={nombre}
                      type="button"
                      onClick={() => {
                        SetCategoriaSeleccionada(nombre);
                        SetServicioId("");
                      }}
                    >
                      {serviciosGrupo[0].image && (
                        <div className="servicio-media">
                          <img
                            src={serviciosGrupo[0].image}
                            alt=""
                            className="servicio-image"
                          />
                        </div>
                      )}
                      <span className="servicio-info">
                        <strong>{nombre}</strong>
                        <span>{serviciosGrupo.length} {serviciosGrupo.length === 1 ? "servicio disponible" : "servicios disponibles"}</span>
                        <span className="cita-seleccionar-servicio">Ver servicios</span>
                      </span>
                    </button>
                  ))}
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
                Empleado
              </label>

              <select
                id="cita-empleado"
                value={empleadoId}
                onChange={(e) =>
                  SetEmpleadoId(e.target.value)
                }
              >

                <option value="">
                  Seleccione un empleado
                </option>

                <option value="3">
                  santiago
                </option>

                <option value="5">
                  antony
                </option>

                <option value="11">
                  maria
                </option>

              </select>

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