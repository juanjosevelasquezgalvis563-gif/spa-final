import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Award } from "lucide-react";
import { API_ROOT } from "../lib/api";

function formatoPrecio(valor) {
  return `$${(Number(valor) || 0).toLocaleString("es-CO")}`;
}



const EMPLEADOS_ESPECIALIDAD = {
  manicurista: ["melany arango", "valentina alvarez"],
  estilista: ["steven piedradita", "evelyn nino"],
};

const normalizarTexto = (valor = "") =>
  String(valor)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ");

function obtenerEspecialidadPorIndice(indice) {
  if (indice < 0) return null;

  return indice < 17 ? "manicurista" : "estilista";
}

function obtenerEspecialidadServicio(servicio, listaServicios) {
  const indice = listaServicios.findIndex(
    item => String(item.id) === String(servicio?.id)
  );

  return obtenerEspecialidadPorIndice(indice);
}

function empleadoPuedeRealizar(empleado, servicio, listaServicios) {
  const especialidad = obtenerEspecialidadServicio(
    servicio,
    listaServicios
  );

  if (!especialidad || !empleado?.nombre) return false;

  const nombre = normalizarTexto(empleado.nombre);

  return EMPLEADOS_ESPECIALIDAD[especialidad].some(
    permitido => nombre === permitido
  );
}




export function Cita() {

  const [fecha, SetFecha] = useState("");
  const [hora, SetHora] = useState("");
  const [empleadoId, SetEmpleadoId] = useState("");
  const [servicioId, SetServicioId] = useState("");
  const [categoriaAbierta, setCategoriaAbierta] = useState("");
  const [message, SetMessage] = useState("");
  const [servicios, SetServicios] = useState([]);
  const [empleados, SetEmpleados] = useState([]);
  const [cargandoServicios, SetCargandoServicios] = useState(true);
  const [reservando, setReservando] = useState(false);
  const [resultadoPago, setResultadoPago] = useState(null);
  const [abonoDisponible, setAbonoDisponible] = useState(0);
  const [fidelizacion, setFidelizacion] = useState({
    saldo_puntos: 0,
    descuentoDisponible: 0,
    niveles: [],
  });
  const [usarDescuento, setUsarDescuento] = useState(false);
  const [tipoPagoReserva, setTipoPagoReserva] = useState("reserva");
  const [searchParams] = useSearchParams();
  const referenciaPago = searchParams.get("reserva");

  const servicioSeleccionado = servicios.find(
    (servicio) => String(servicio.id) === String(servicioId)
  );
  const precioServicio = Math.round(Number(servicioSeleccionado?.precio) || 0);

  // Descuento por puntos: se aplica el nivel más alto que el cliente tenga disponible.
  const nivelDescuento = fidelizacion.niveles.find(
    (nivel) => Number(nivel.porcentaje) === Number(fidelizacion.descuentoDisponible)
  );
  const descuentoPotencial = nivelDescuento && precioServicio > 0
    ? Math.min(
        Math.round(precioServicio * Number(nivelDescuento.porcentaje) / 100),
        Number(nivelDescuento.descuentoMaximo) || 0
      )
    : 0;
  const descuentoAplicado = usarDescuento ? descuentoPotencial : 0;
  const precioConDescuento = precioServicio - descuentoAplicado;

  // La reserva es el 20 % del precio con descuento.
  const montoReserva = Math.round(precioConDescuento * 0.2);
  const montoSeleccionado = tipoPagoReserva === "completo" ? precioConDescuento : montoReserva;
  const abonoAplicable = tipoPagoReserva === "completo" ? 0 : Math.min(abonoDisponible, montoSeleccionado);
  const montoEnLinea = Math.max(0, montoSeleccionado - abonoAplicable);
  const saldoEnSalon = Math.max(0, precioConDescuento - montoSeleccionado);
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
            aplicar_descuento: usarDescuento && descuentoPotencial > 0,
            tipo_pago: tipoPagoReserva,
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
        setUsarDescuento(false);
        setTipoPagoReserva("reserva");
        void cargarFidelizacion();
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


async function obtenerEmpleados(servicioActual) {
  const servicio = servicios.find(
    item => String(item.id) === String(servicioActual)
  );

  if (!servicio) {
    SetEmpleados([]);
    SetEmpleadoId("");
    return;
  }

  try {
    SetEmpleados([]);
    SetEmpleadoId("");

    const params = new URLSearchParams({
      servicio_id: String(servicioActual),
    });

    const response = await fetch(
      `${API_ROOT}/inser/cliente/empleados?${params.toString()}`,
      {
        method: "GET",
        credentials: "include",
      }
    );

    const data = await response.json();

    if (!response.ok || !Array.isArray(data)) {
      throw new Error(
        data.message || "No se pudieron cargar los profesionales."
      );
    }

    const filtrados = data.filter(empleado =>
      empleadoPuedeRealizar(empleado, servicio, servicios)
    );

    SetEmpleados(filtrados);

  } catch (error) {
    console.error("Error al cargar empleados:", error);
    SetEmpleados([]);
    SetEmpleadoId("");
    SetMessage(error.message || "Error al cargar profesionales.");
  }
}


 
  async function cargarFidelizacion() {
    try {
      const response = await fetch(`${API_ROOT}/inser/cliente/fidelizacion`, {
        credentials: "include"
      });
      const data = await response.json();
      if (!response.ok) return;

      setFidelizacion({
        saldo_puntos: Number(data.saldo_puntos) || 0,
        descuentoDisponible: Number(data.descuentoDisponible) || 0,
        niveles: Array.isArray(data.niveles) ? data.niveles : [],
      });
    } catch {
     
    }
  }

  useEffect(() => {
    const temporizador = window.setTimeout(() => {
      Servicios();
      obtenerEmpleados();
      cargarFidelizacion();
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
        } else if (data.estado === "aprobado") {
          // Los puntos del descuento se descuentan al aprobarse la reserva.
          void cargarFidelizacion();
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
          Reserva tu cita pagando el 20 % del servicio. Tu reserva queda pagada
          cuando Wompi aprueba el pago y la cita queda confirmada cuando el
          profesional la acepta; te avisaremos por correo. El saldo se paga en
          el salón al finalizar.
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
            {resultadoPago.estado === "aprobado" && "Pago aprobado"}
            {resultadoPago.estado === "aprobado_abono" && "El pago quedó como abono disponible"}
            {resultadoPago.estado === "rechazado" && "El pago fue rechazado"}
            {resultadoPago.estado === "error" && "No se pudo procesar el pago"}
            {resultadoPago.estado === "anulado" && "El pago fue anulado"}
            {resultadoPago.estado === "expirado" && "La reserva de horario venció"}
          </strong>
          <p>
            {resultadoPago.estado === "pendiente" && "Estamos esperando la confirmación segura de Wompi."}
            {resultadoPago.estado === "aprobado" && `Pago en línea recibido: ${formatoPrecio(resultadoPago.monto_pagado)}.${Number(resultadoPago.monto_credito) > 0 ? ` Crédito aplicado: ${formatoPrecio(resultadoPago.monto_credito)}.` : ""}${Number(resultadoPago.descuento_valor) > 0 ? ` Descuento aplicado: ${formatoPrecio(resultadoPago.descuento_valor)}.` : ""} ${Number(resultadoPago.saldo_pendiente) > 0 ? `Saldo que pagarás en el salón: ${formatoPrecio(resultadoPago.saldo_pendiente)}.` : "El servicio quedó pagado por completo en línea."} Tu cita está pendiente de confirmación del profesional; te avisaremos por correo cuando la confirme.`}
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
                {categoriaAbierta ? "Uñas" : "Elige un servicio"}
              </h2>
              <span className="servicios-count">
                {`${servicios.length} servicios`}
              </span>
            </div>

            {nivelDescuento && (
              <section className="cita-beneficio-fidelidad" role="status" aria-label="Descuento de fidelización disponible">
                <div className="cita-beneficio-icono" aria-hidden="true">
                  <Award />
                </div>
                <div className="cita-beneficio-contenido">
                  <span className="cita-beneficio-etiqueta">Beneficio de fidelización disponible</span>
                  <h3 className="cita-beneficio-titulo">
                    {nivelDescuento.porcentaje}% de descuento en tu servicio
                  </h3>
                  <p className="cita-beneficio-detalle">
                    Tienes <strong>{fidelizacion.saldo_puntos} puntos</strong>. Al aplicarlo ahorrarías{" "}
                    <strong>{formatoPrecio(descuentoPotencial)}</strong> y se descontarán{" "}
                    <strong>{nivelDescuento.puntos} puntos</strong> de tu saldo.
                  </p>
                </div>
              </section>
            )}

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
      aria-expanded={categoriaAbierta === "unas"}
      onClick={() => {
        setCategoriaAbierta(categoriaAbierta === "unas" ? "" : "unas");
        SetServicioId("");
      }}
    >
      <span className="servicio-info">
        <strong>Uñas</strong>
        <span>{serviciosUnas.length} servicios disponibles</span>
        <span className="cita-seleccionar-servicio">
          {categoriaAbierta === "unas" ? "Ocultar servicios" : "Ver servicios"}
        </span>
      </span>
    </button>
  )}

 
  {categoriaAbierta === "unas" && serviciosUnas.map(renderServicio)}

 
  {categoriaAbierta !== "unas" && otrosServicios.map(renderServicio)}

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

              {descuentoPotencial > 0 && (
                <section className="cita-opcion-descuento">
                  <label
                    className="cita-toggle-descuento"
                    style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "0.75rem" }}
                  >
                    <input
                      type="checkbox"
                      checked={usarDescuento}
                      onChange={(e) => setUsarDescuento(e.target.checked)}
                      style={{
                        width: "18px",
                        height: "18px",
                        accentColor: "#b45309",
                      }}
                    />
                    <span className="cita-toggle-texto">
                      <span className="cita-toggle-texto-principal">
                        Aplicar descuento de fidelización {nivelDescuento.porcentaje}%
                      </span>
                      <span className="cita-toggle-texto-secundario">
                        Ahorras {formatoPrecio(descuentoPotencial)} · Se descontarán {nivelDescuento.puntos} puntos
                      </span>
                    </span>
                  </label>
                  <p className="cita-toggle-nota">
                    El descuento se aplicará sobre el precio original al confirmar tu reserva.
                  </p>
                </section>
              )}

              <div className="cita-reserva-resumen">
                <div className="cita-reserva-servicio">
                  <span>Precio del servicio</span>
                  <strong>{formatoPrecio(precioServicio)}</strong>
                </div>
                <div className="cita-reserva-lineas">
                  {descuentoAplicado > 0 && (
                    <>
                      <div className="cita-linea-descuento">
                        <span>Descuento por fidelización ({nivelDescuento.porcentaje} %)</span>
                        <strong className="cita-descuento-valor">−{formatoPrecio(descuentoAplicado)}</strong>
                      </div>
                      <div className="cita-linea-precio-con-descuento">
                        <span>Precio con descuento aplicado</span>
                        <strong>{formatoPrecio(precioConDescuento)}</strong>
                      </div>
                    </>
                  )}
                  <div className="cita-campo cita-tipo-pago">
                    <label htmlFor="cita-tipo-pago">¿Cuánto deseas pagar en línea?</label>
                    <select
                      id="cita-tipo-pago"
                      value={tipoPagoReserva}
                      onChange={(event) => setTipoPagoReserva(event.target.value)}
                    >
                      <option value="reserva">Solo la reserva (20 %): {formatoPrecio(montoReserva)}</option>
                      <option value="completo">El total del servicio: {formatoPrecio(precioConDescuento)}</option>
                    </select>
                  </div>
                  {abonoAplicable > 0 && (
                    <div>
                      <span>Abono aplicado</span>
                      <strong className="cita-descuento-valor">−{formatoPrecio(abonoAplicable)}</strong>
                    </div>
                  )}
                  <div className="cita-reserva-pago">
                    <span>{montoEnLinea > 0 ? "Pagas ahora en línea" : "Cubierto con abono"}</span>
                    <strong>{formatoPrecio(montoEnLinea || montoSeleccionado)}</strong>
                  </div>
                  <div>
                    <span>Saldo a pagar en el salón</span>
                    <strong>{formatoPrecio(saldoEnSalon)}</strong>
                  </div>
                </div>
                <p className="cita-reserva-nota">
                  Tu reserva queda pagada cuando se apruebe el pago. El profesional
                  confirmará tu cita y te avisaremos por correo. Los puntos se
                  descontarán automáticamente al aprobarse tu reserva.
                </p>
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
                {reservando ? "Preparando el pago..." : tipoPagoReserva === "completo" ? "Pagar servicio completo" : "Pagar reserva y confirmar cita"}
              </button>
            </form>
          </section>
        )}
      </div>

    </div>
  );
}

export default Cita;
