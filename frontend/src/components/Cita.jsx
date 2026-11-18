import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { API_ROOT } from "../lib/api";

function formatoPrecio(valor) {
  return `$${(Number(valor) || 0).toLocaleString("es-CO")}`;
}

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
  const [reservando, setReservando] = useState(false);
  const [resultadoPago, setResultadoPago] = useState(null);
  const [abonoDisponible, setAbonoDisponible] = useState(0);
  const [searchParams] = useSearchParams();
  const referenciaPago = searchParams.get("reserva");

  const servicioSeleccionado = servicios.find(
    (servicio) => String(servicio.id) === String(servicioId)
  );
  const precioServicio = Math.round(Number(servicioSeleccionado?.precio) || 0);
  const montoReserva = Math.round(precioServicio * 0.2);
  const abonoAplicable = Math.min(abonoDisponible, montoReserva);
  const montoEnLinea = Math.max(0, montoReserva - abonoAplicable);
  const saldoEnSalon = Math.max(0, precioServicio - montoReserva);
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
  const renderServicio = (servicio) => {
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
            Seleccionar
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

    setReservando(true);
    SetMessage("");

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

      if (!response.ok) {
        throw new Error(data.message || "No se pudo iniciar el pago de la reserva.");
      }

      if (data.checkout_url) {
        window.location.assign(data.checkout_url);
        return;
      }

      if (data.estado === "aprobado") {
        setResultadoPago(data);
        setAbonoDisponible((saldoActual) => Math.max(0, saldoActual - Number(data.monto_credito || 0)));
        SetMessage(data.message);
        SetFecha("");
        SetHora("");
        SetEmpleadoId("");
        return;
      }

      throw new Error("La respuesta del servidor no contiene el enlace de pago.");
    } catch (error) {
      SetMessage(error.message || "Error de conexión al iniciar el pago.");
    } finally {
      setReservando(false);
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
    let vigente = true;

    async function consultarAbono() {
      try {
        const response = await fetch(`${API_ROOT}/inser/cliente/abonos`, {
          credentials: "include"
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "No se pudo consultar el abono disponible.");
        if (vigente) setAbonoDisponible(Number(data.saldo_disponible) || 0);
      } catch (error) {
        if (vigente) SetMessage(error.message || "No se pudo consultar el abono disponible.");
      }
    }

    void consultarAbono();
    return () => {
      vigente = false;
    };
  }, []);

  useEffect(() => {
    if (!referenciaPago) return undefined;

    let vigente = true;
    let temporizador;

    async function consultarEstadoPago() {
      try {
        const response = await fetch(
          `${API_ROOT}/inser/cliente/reserva/${encodeURIComponent(referenciaPago)}`,
          { credentials: "include" }
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "No se pudo consultar el pago.");
        if (!vigente) return;

        setResultadoPago(data);
        if (data.estado === "pendiente") {
          temporizador = window.setTimeout(consultarEstadoPago, 3000);
        }
      } catch (error) {
        if (vigente) SetMessage(error.message || "No se pudo consultar el estado del pago.");
      }
    }

    void consultarEstadoPago();
    return () => {
      vigente = false;
      window.clearTimeout(temporizador);
    };
  }, [referenciaPago]);

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
          Reserva tu cita pagando el 20 % del servicio. La cita quedará confirmada
          cuando Wompi apruebe el pago; el saldo se paga en el salón al finalizar.
        </p>

      </div>

      {resultadoPago && (
        <section
          className={`cita-pago-estado cita-pago-${resultadoPago.estado}`}
          role="status"
          aria-live="polite"
        >
          <strong>
            {resultadoPago.estado === "pendiente" && "Verificando el pago de tu reserva"}
            {resultadoPago.estado === "aprobado" && "Reserva confirmada"}
            {resultadoPago.estado === "aprobado_abono" && "El pago quedó como abono disponible"}
            {resultadoPago.estado === "rechazado" && "El pago fue rechazado"}
            {resultadoPago.estado === "error" && "No se pudo procesar el pago"}
            {resultadoPago.estado === "anulado" && "El pago fue anulado"}
            {resultadoPago.estado === "expirado" && "La reserva de horario venció"}
          </strong>
          <p>
            {resultadoPago.estado === "pendiente" && "Estamos esperando la confirmación segura de Wompi."}
            {resultadoPago.estado === "aprobado" && `La reserva de ${formatoPrecio(resultadoPago.monto_reserva)} COP quedó cubierta: pago en línea ${formatoPrecio(resultadoPago.monto_pagado)} COP y abono aplicado ${formatoPrecio(resultadoPago.monto_credito)} COP. El saldo del servicio se paga en el salón.`}
            {resultadoPago.estado === "aprobado_abono" && "El pago fue recibido, pero el horario ya no está disponible. El importe quedó guardado como abono para una nueva reserva."}
            {["rechazado", "error", "anulado", "expirado"].includes(resultadoPago.estado)
              && "No se confirmó la cita. Vuelve a elegir un horario e intenta reservar otra vez."}
          </p>
        </section>
      )}

      {message && (
        <p className="mensaje-cita" role="status" aria-live="polite">
          {message}
        </p>
      )}

      <div className={`cita-layout${servicioSeleccionado ? " cita-layout-formulario" : ""}`}>
        {!servicioSeleccionado && (
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
              <p className="cita-servicios-estado cita-alerta" role="alert">
                No hay servicios disponibles en este momento.
              </p>
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
                      <span className="cita-seleccionar-servicio">Ver servicios</span>
                    </span>
                  </button>
                )}

                {unasAbiertas && serviciosUnas.map(renderServicio)}
                {otrosServicios.map(renderServicio)}
              </div>
            )}
          </div>
        )}

        {servicioSeleccionado && (
          <section className="cita-formulario">
            <div className="cita-form-head">
              <button
                className="cita-volver-servicios"
                type="button"
                onClick={() => SetServicioId("")}
              >
                Cambiar servicio
              </button>
              <span className="cita-form-kicker">Información de reserva</span>
              <h2 className="cita-form-titulo">Completa tu cita</h2>
              <p className="cita-form-desc">
                Servicio seleccionado: <strong>{servicioSeleccionado.nombre}</strong>
              </p>

              <div className="cita-reserva-resumen">
                <div className="cita-reserva-servicio">
                  <span>Precio del servicio</span>
                  <strong>{formatoPrecio(precioServicio)}</strong>
                </div>
                <div className="cita-reserva-lineas">
                  <div>
                    <span>Reserva (20 %)</span>
                    <strong>{formatoPrecio(montoReserva)}</strong>
                  </div>
                  {abonoAplicable > 0 && (
                    <div>
                      <span>Abono aplicado</span>
                      <strong>−{formatoPrecio(abonoAplicable)}</strong>
                    </div>
                  )}
                  <div className="cita-reserva-pago">
                    <span>{montoEnLinea > 0 ? "Pagas ahora" : "Cubierto con abono"}</span>
                    <strong>{formatoPrecio(montoEnLinea || montoReserva)}</strong>
                  </div>
                  <div>
                    <span>Saldo en el salón</span>
                    <strong>{formatoPrecio(saldoEnSalon)}</strong>
                  </div>
                </div>
                <p>La cita se confirma cuando se apruebe la reserva.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="cita-fila">
                <div className="cita-campo">
                  <label htmlFor="cita-fecha">Fecha</label>
                  <input
                    id="cita-fecha"
                    type="date"
                    value={fecha}
                    onChange={(e) => SetFecha(e.target.value)}
                  />
                </div>

                <div className="cita-campo">
                  <label htmlFor="cita-hora">Hora</label>
                  <input
                    id="cita-hora"
                    type="time"
                    value={hora}
                    onChange={(e) => SetHora(e.target.value)}
                  />
                </div>
              </div>

              <div className="cita-campo">
                <label htmlFor="cita-empleado">{tipoProfesionalLabel()}</label>
                {empleados.length === 0 ? (
                  <p className="cita-servicios-estado cita-alerta" role="alert">
                    No hay profesionales disponibles para este servicio.
                  </p>
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

              <button className="cita-boton" type="submit" disabled={reservando}>
                {reservando ? "Preparando el pago..." : "Pagar reserva y confirmar cita"}
              </button>
            </form>
          </section>
        )}
      </div>

    </div>
  );
}

export default Cita;