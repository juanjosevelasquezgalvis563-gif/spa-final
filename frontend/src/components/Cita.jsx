import React from "react";
import { useEffect, useState } from "react";

export function Cita() {

  const [fecha, SetFecha] = useState("");
  const [hora, SetHora] = useState("");
  const [empleadoId, SetEmpleadoId] = useState("");
  const [servicioId, SetServicioId] = useState("");
  const [message, SetMessage] = useState("");
  const [servicios, SetServicios] = useState([]);



  async function handleSubmit(e) {
    e.preventDefault();

    try {
      const response = await fetch(
        "http://localhost:3000/inser/cliente",
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
        SetServicioId("");
      } else {
        SetMessage(data.message);
      }

    } catch (error) {
      SetMessage('Error de conexion con el servidor');
    }
  }

  async function Servicios() {
    try {
      const response = await fetch(
        "http://localhost:3000/inser/cliente/servicios",
        {
          method: "GET",
          credentials:'include',
        }
      );

      const data = await response.json();

      if (response.ok) {
        SetServicios(data);
      }else{
        SetMessage(data.message);
      }

    } catch (error) {
      SetMessage('Error de conexion con el servidor');
    }
  }

  useEffect(() => {
    Servicios();
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
          Elige el servicio, la fecha y la hora que mejor se adapte a tu día.
          Confirmaremos tu solicitud en unos instantes.
        </p>

      </div>

      <div className="cita-layout">

      

        <div className="servicios-container servicios-panel">

          <div className="servicios-head">
            <h2 className="servicios-titulo">
             Nuestros servicios
            </h2>
            <span className="servicios-count">
              {servicios.length} disponibles
            </span>
          </div>

          <div className="servicios-grid">

          {servicios.map((servicio) => (

            <div
              className="servicio-card"
              key={servicio.id}
            >

              <div className="servicio-media">
                <img
                  src={servicio.image}
                  alt={servicio.nombre}
                  className="servicio-image"
                />
              </div>

              <div className="servicio-info">

                <h2>
                  {servicio.nombre}
                </h2>

                <p className="servicio-precio">
                  ${servicio.precio}
                </p>

                

              </div>

            </div>

          ))}

          </div>

        </div>


   

        <div className="cita-formulario">

          <div className="cita-form-head">
            <h2 className="cita-form-titulo">
              Selecciona tu cita
            </h2>
            <p className="cita-form-desc">
              Completa los datos para reservar tu espacio.
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


            <div className="cita-campo">

              <label htmlFor="cita-servicio">
                <span className="cita-label-icon" aria-hidden="true">💆</span>
                Servicio
              </label>

              <select
                id="cita-servicio"
                value={servicioId}
                onChange={(e) =>
                  SetServicioId(e.target.value)
                }
              >

                <option value="">
                  Seleccione un servicio
                </option>

                <option value="1">
                  Pestañas
                </option>

                <option value="2">
                  Lavado de pelo
                </option>

                <option value="3">
                  Uñas
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

          {message && (
            <p className="mensaje-cita">
              {message}
            </p>
          )}

        </div>

      </div>

    </div>
  );
}

export default Cita;