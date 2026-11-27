import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Award } from "lucide-react";
import { API_ROOT } from "../lib/api";
import imagenMaquillaje from "../assets/servicio-maquillaje-social.jpeg";
import imagenMaquillajeSinPestanas from "../assets/servicio-maquillaje-social-sin-pestanas.jpeg";
import imagenLimpiezaFacial from "../assets/servicio-limpieza-facial.jpeg";
import imagenDepilacionCejas from "../assets/servicio-depilacion-hilo-cejas.jpeg";
import imagenDepilacionBigote from "../assets/servicio-depilacion-hilo-bigote.jpeg";
import imagenCepillados from "../assets/servicio-cepillados.jpeg";
import imagenLiftingPestanas from "../assets/servicio-lifting-pestanas.jpeg";
import imagenLaminadoCejas from "../assets/servicio-laminado-cejas.jpeg";
import imagenCorteMujer from "../assets/servicio-corte-mujer.jpeg";
import imagenPorcelanizacion from "../assets/servicio-porcelanizacion-facial.jpeg";
import imagenBalayage from "../assets/servicio-balayage.jpeg";
import imagenTintura from "../assets/servicio-tintura-directa.jpeg";
import imagenKeratina from "../assets/servicio-keratina-organica.jpeg";
import imagenReconexion from "../assets/servicio-reconexion-molecular.jpeg";
import imagenHidratacion from "../assets/servicio-terapia-hidratacion.jpeg";
import imagenUnas from "../assets/uñas.jpeg";
import imagenManicureTradicional from "../assets/Manicure-tradicional-cabello.jpeg";
import imagenManicureSemiDama from "../assets/Manicure-semi-dama.jpg";
import imagenManicureSemiCaballero from "../assets/Manicure-semi-caballero.jpg";
import imagenPedicureTradicionalDama from "../assets/Pedicure-tradicional-dama.jpg";
import imagenPedicureTradicionalCaballero from "../assets/Pedicure-tradicional-cabello.jpg";
import imagenPedicureSemiDama from "../assets/Pedicure-semi-dama.jpg";
import imagenPedicureSemiCaballero from "../assets/pedicure-semi-caballero.jpg";
import imagenEsculpidas from "../assets/Esculpidas.jpg";
import imagenForradoPoly from "../assets/Forrado-poly.jpg";
import imagenSoftGel from "../assets/Soft-gel-o-press.jpg";
import imagenBuilderGel from "../assets/Builder-gel.jpg";
import imagenBaseRubber from "../assets/Base-Rubber.jpg";
import imagenDipping from "../assets/Dipping.jpg";
import imagenPedispa from "../assets/pedispa.jpg";
import imagenRetiroSemi from "../assets/retiro-semi.jpg";
import imagenRetiroSistema from "../assets/retiro-sistema.jpg";

const imagenesServiciosUnas = [
  { coincide: ["manicure", "semi", "caballero"], imagen: imagenManicureSemiCaballero, nombre: "Manicure semipermanente para caballero" },
  { coincide: ["manicure", "semi", "dama"], imagen: imagenManicureSemiDama, nombre: "Manicure semipermanente para dama" },
  { coincide: ["manicure", "tradicional", "caballero"], imagen: imagenManicureTradicional, nombre: "Manicure tradicional" },
  { coincide: ["manicure", "tradicional"], imagen: imagenManicureTradicional, nombre: "Manicure tradicional" },
  { coincide: ["pedicure", "semi", "caballero"], imagen: imagenPedicureSemiCaballero, nombre: "Pedicure semipermanente para caballero" },
  { coincide: ["pedicure", "semi", "dama"], imagen: imagenPedicureSemiDama, nombre: "Pedicure semipermanente para dama" },
  { coincide: ["pedicure", "tradicional", "caballero"], imagen: imagenPedicureTradicionalCaballero, nombre: "Pedicure tradicional para caballero" },
  { coincide: ["pedicure", "tradicional", "dama"], imagen: imagenPedicureTradicionalDama, nombre: "Pedicure tradicional para dama" },
  { coincide: ["pedispa"], imagen: imagenPedispa, nombre: "Pedispa" },
  { coincide: ["esculpida"], imagen: imagenEsculpidas, nombre: "Uñas esculpidas" },
  { coincide: ["forrado", "poly"], imagen: imagenForradoPoly, nombre: "Forrado poly" },
  { coincide: ["soft gel"], imagen: imagenSoftGel, nombre: "Soft gel o press" },
  { coincide: ["builder"], imagen: imagenBuilderGel, nombre: "Builder gel" },
  { coincide: ["base", "rubber"], imagen: imagenBaseRubber, nombre: "Base rubber" },
  { coincide: ["dipping"], imagen: imagenDipping, nombre: "Dipping" },
  { coincide: ["retiro", "semi"], imagen: imagenRetiroSemi, nombre: "Retiro semipermanente" },
  { coincide: ["retiro", "sistema"], imagen: imagenRetiroSistema, nombre: "Retiro de sistema" },
];

const palabrasServicioUnas = ["unas", "manicure", "manicura", "pedicure", "pedispa", "dipping", "rubber", "builder", "soft gel", "esculpidas", "retiro", "poly", "press", "nail", "acrilica", "semipermanente"];

function normalizarNombreServicio(nombre = "") {
  return nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function esServicioUnas(nombre = "") {
  const normalizado = normalizarNombreServicio(nombre);
  return palabrasServicioUnas.some((palabra) => normalizado.includes(palabra));
}

const imagenesDeServicios = [
  { coincide: ["maquillaje social sin pestanas", "sin pestanas"], imagen: imagenMaquillajeSinPestanas, nombre: "Maquillaje social sin pestañas" },
  { coincide: ["limpieza facial"], imagen: imagenLimpiezaFacial, nombre: "Limpieza facial" },
  { coincide: ["depilacion", "hilo", "cejas"], imagen: imagenDepilacionCejas, nombre: "Depilación con hilo de cejas" },
  { coincide: ["depilacion", "hilo", "bigote"], imagen: imagenDepilacionBigote, nombre: "Depilación con hilo de bigote" },
  { coincide: ["cepillado"], imagen: imagenCepillados, nombre: "Cepillados" },
  { coincide: ["lifting", "pestanas"], imagen: imagenLiftingPestanas, nombre: "Lifting de pestañas" },
  { coincide: ["laminado", "cejas"], imagen: imagenLaminadoCejas, nombre: "Laminado de cejas" },
  { coincide: ["corte", "mujer"], imagen: imagenCorteMujer, nombre: "Corte de mujer" },
  { coincide: ["porcelanizacion", "facial"], imagen: imagenPorcelanizacion, nombre: "Porcelanización facial" },
  { coincide: ["balayage"], imagen: imagenBalayage, nombre: "Balayage" },
  { coincide: ["tintura directa"], imagen: imagenTintura, nombre: "Tintura directa" },
  { coincide: ["keratina"], imagen: imagenKeratina, nombre: "Keratina orgánica" },
  { coincide: ["reconexion molecular"], imagen: imagenReconexion, nombre: "Reconexión molecular" },
  { coincide: ["terapia", "hidratacion"], imagen: imagenHidratacion, nombre: "Terapia de hidratación" },
  { coincide: ["maquillaje social", "maquillaje"], imagen: imagenMaquillaje, nombre: "Maquillaje social" },
];

function imagenParaServicio(nombre = "") {
  const nombreNormalizado = normalizarNombreServicio(nombre);
  const imagenUnasEspecifica = imagenesServiciosUnas.find(({ coincide }) => coincide.every((parte) => nombreNormalizado.includes(parte)));
  if (imagenUnasEspecifica) return imagenUnasEspecifica;
  if (esServicioUnas(nombreNormalizado)) {
    return { imagen: imagenUnas, nombre: "Servicio de uñas" };
  }
  if ((nombreNormalizado.includes("limpieza") || nombreNormalizado.includes("facial")) && !nombreNormalizado.includes("porcelanizacion")) {
    return { imagen: imagenLimpiezaFacial, nombre: "Limpieza facial" };
  }
  if (nombreNormalizado.includes("recon") || nombreNormalizado.includes("molecular")) {
    return { imagen: imagenReconexion, nombre: "Reconexión molecular" };
  }
  return imagenesDeServicios.find(({ coincide }) => coincide.every((parte) => nombreNormalizado.includes(parte))) || null;
}

function formatoPrecio(valor) {
  return `$${(Number(valor) || 0).toLocaleString("es-CO")}`;
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
  const [fidelizacion, setFidelizacion] = useState({
    saldo_puntos: 0,
    descuentoDisponible: 0,
    niveles: [],
  });
  const [porcentajeDescuento, setPorcentajeDescuento] = useState(0);
  const [tipoPagoReserva, setTipoPagoReserva] = useState("reserva");
  const [searchParams] = useSearchParams();
  const referenciaPago = searchParams.get("reserva");

  const servicioSeleccionado = servicios.find(
    (servicio) => String(servicio.id) === String(servicioId)
  );
  const imagenServicioSeleccionado = servicioSeleccionado ? imagenParaServicio(servicioSeleccionado.nombre) : null;
  const precioFijoServicio = Number(servicioSeleccionado?.precio);
  const tienePrecioFijo = Number.isFinite(precioFijoServicio) && precioFijoServicio > 0;
  const precioServicio = tienePrecioFijo ? Math.round(precioFijoServicio) : 0;

 
  const nivelesDescuentoDisponibles = fidelizacion.niveles.filter(
    (nivel) => Number(nivel.puntos) <= Number(fidelizacion.saldo_puntos)
  );
  const nivelDescuento = nivelesDescuentoDisponibles.find(
    (nivel) => Number(nivel.porcentaje) === Number(porcentajeDescuento)
  );
  const nivelDescuentoMaximo = nivelesDescuentoDisponibles.reduce(
    (mayor, nivel) => Number(nivel.porcentaje) > Number(mayor?.porcentaje || 0) ? nivel : mayor,
    null
  );
  const descuentoPotencial = nivelDescuento && precioServicio > 0
    ? Math.min(
        Math.round(precioServicio * Number(nivelDescuento.porcentaje) / 100),
        Number(nivelDescuento.descuentoMaximo) || 0
      )
    : 0;
  const descuentoAplicado = descuentoPotencial;
  const precioConDescuento = precioServicio - descuentoAplicado;

  // La reserva es el 20 % del precio con descuento.
  const montoReserva = Math.round(precioConDescuento * 0.2);
  const montoSeleccionado = tipoPagoReserva === "completo" ? precioConDescuento : montoReserva;
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

    if (hora) {
      const horaPartes = /^(?:[01]\d|2[0-3]):[0-5]\d$/.exec(hora);
      const minutosHora = horaPartes ? Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5)) : -1;
      if (minutosHora < 8 * 60 || minutosHora > 17 * 60) {
        SetMessage("El spa atiende de 8:00 a. m. a 6:00 p. m. Las citas duran una hora; la última debe iniciar a las 5:00 p. m.");
        return;
      }
    }

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
            aplicar_descuento: tienePrecioFijo && porcentajeDescuento > 0 && descuentoPotencial > 0,
            porcentaje_descuento: tienePrecioFijo ? Number(porcentajeDescuento) : 0,
            tipo_pago: tipoPagoReserva,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "No se pudo iniciar el pago de la reserva.");
      }

      if (data.estado === "sin_pago") {
        setResultadoPago(data);
        SetFecha("");
        SetHora("");
        SetEmpleadoId("");
        SetServicioId("");
        setPorcentajeDescuento(0);
        setTipoPagoReserva("reserva");
        return;
      }

      if (data.checkout_url) {
        window.location.assign(data.checkout_url);
        return;
      }

      if (data.estado === "aprobado") {
        setResultadoPago(data);
        SetMessage(data.message);
        SetFecha("");
        SetHora("");
        SetEmpleadoId("");
        setPorcentajeDescuento(0);
        setTipoPagoReserva("reserva");
        void cargarFidelizacion();
        return;
      }

      throw new Error("No pudimos abrir la opción de pago. Inténtalo de nuevo.");
    } catch (error) {
      SetMessage(error.message || "No pudimos iniciar el pago. Revisa tu conexión e inténtalo de nuevo.");
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
      SetMessage('No pudimos cargar los servicios. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      SetCargandoServicios(false);
    }
  }


async function obtenerEmpleados(servicioActual) {
  if (!servicioActual) {
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

    SetEmpleados(data);

  } catch (error) {
    console.error("Error al cargar empleados:", error);
    SetEmpleados([]);
    SetEmpleadoId("");
    SetMessage("No pudimos cargar la lista de profesionales. Inténtalo de nuevo.");
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
         
          void cargarFidelizacion();
        }
      } catch {
        if (vigente) SetMessage("No pudimos consultar el estado del pago. Inténtalo de nuevo.");
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

  const serviciosUnas = servicios.filter((servicio) => esServicioUnas(servicio.nombre));
  const otrosServicios = servicios.filter((servicio) => !esServicioUnas(servicio.nombre));

  const renderServicio = (servicio) => {
    const seleccionado = servicioId !== "" && Number(servicio.id) === Number(servicioId);
    const imagenServicio = imagenParaServicio(servicio.nombre);
    const precioServicio = Number(servicio.precio);
    const servicioConPrecioFijo = Number.isFinite(precioServicio) && precioServicio > 0;

    return (
      <button
        className={`servicio-card cita-service-card cita-detail-card${seleccionado ? " seleccionado" : ""}`}
        key={servicio.id}
        type="button"
        aria-pressed={seleccionado}
        onClick={() => SetServicioId(String(servicio.id))}
      >
        {imagenServicio && (
          <span className="servicio-media cita-service-art">
            <img className="servicio-image cita-service-art-image" src={imagenServicio.imagen} alt={imagenServicio.nombre} loading="lazy" />
          </span>
        )}
        <span className="servicio-info">
          <strong className={seleccionado ? "servicio-nombre-seleccionado" : ""}>
            {servicio.nombre}
          </strong>
          <span className={`cita-servicio-precio${servicioConPrecioFijo ? "" : " cita-servicio-precio-variable"}`}>
            {servicioConPrecioFijo
              ? `$${Math.round(precioServicio).toLocaleString("es-CO")}`
              : "Precio a definir en el salón"}
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
          {servicioSeleccionado && !tienePrecioFijo ? "Reserva de cita" : "Reserva en línea"}
        </span>

        <h1 className="cita-title">
          Agenda tu cita
        </h1>

        <p className="cita-subtitle">
          {servicioSeleccionado && !tienePrecioFijo
            ? "El precio de este servicio se acordará en el salón según el estado de tu cabello. Puedes reservar tu cita sin pagar ahora."
            : "Para servicios con precio fijo, reserva pagando el 20 %. Tu reserva queda pagada cuando se apruebe el pago y la cita queda confirmada cuando el profesional la acepta; te avisaremos por correo. El saldo se paga en el salón al finalizar."}
        </p>

      </div>

      {resultadoPago && (
        <section
          className={`cita-pago-estado cita-pago-${resultadoPago.estado}`}
          role="status"
          aria-live="polite"
        >

          <strong>
            {resultadoPago.estado === "sin_pago" && "Cita reservada"}
            {resultadoPago.estado === "pendiente" && "Verificando el pago de tu reserva"}
            {resultadoPago.estado === "aprobado" && "Pago aprobado"}
            {resultadoPago.estado === "aprobado_abono" && "Pago recibido; la cita necesita revisión"}
            {resultadoPago.estado === "rechazado" && "El pago fue rechazado"}
            {resultadoPago.estado === "error" && "No se pudo procesar el pago"}
            {resultadoPago.estado === "anulado" && "El pago fue anulado"}
            {resultadoPago.estado === "expirado" && "La reserva de horario venció"}
          </strong>
          <p>
            {resultadoPago.estado === "sin_pago" && resultadoPago.message}
            {resultadoPago.estado === "pendiente" && "Estamos esperando la confirmación segura de Wompi."}
            {resultadoPago.estado === "aprobado" && `Pago en línea recibido: ${formatoPrecio(resultadoPago.monto_pagado)}.${Number(resultadoPago.monto_credito) > 0 ? ` Crédito aplicado: ${formatoPrecio(resultadoPago.monto_credito)}.` : ""}${Number(resultadoPago.descuento_valor) > 0 ? ` Descuento aplicado: ${formatoPrecio(resultadoPago.descuento_valor)}.` : ""} ${Number(resultadoPago.saldo_pendiente) > 0 ? `Saldo que pagarás en el salón: ${formatoPrecio(resultadoPago.saldo_pendiente)}.` : "El servicio quedó pagado por completo en línea."} Tu cita está pendiente de confirmación del profesional; te avisaremos por correo cuando la confirme.`}
            {resultadoPago.estado === "aprobado_abono" && "El pago fue recibido, pero no se pudo confirmar la cita automáticamente. Contacta al salón para resolverlo."}
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

            {nivelDescuentoMaximo && (
              <section className="cita-beneficio-fidelidad" role="status" aria-label="Descuento de fidelización disponible">
                <div className="cita-beneficio-icono" aria-hidden="true">
                  <Award />
                </div>
                <div className="cita-beneficio-contenido">
                  <span className="cita-beneficio-etiqueta">Beneficio de fidelización disponible</span>
                  <h3 className="cita-beneficio-titulo">
                    Puedes elegir un descuento de hasta {nivelDescuentoMaximo.porcentaje}%
                  </h3>
                  <p className="cita-beneficio-detalle">Tienes <strong>{fidelizacion.saldo_puntos} puntos</strong>. Elige el porcentaje disponible al reservar.</p>
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
          <>
          <section className="cita-formulario">
            <div className="cita-form-head">
              <button
                className="cita-volver-servicios"
                type="button"
                onClick={() => SetServicioId("")}
              >
                Cambiar servicio
              </button>
              <div className="cita-form-intro">
                                {imagenServicioSeleccionado && (
                  <img className="cita-servicio-elegido-imagen" src={imagenServicioSeleccionado.imagen} alt={imagenServicioSeleccionado.nombre} />
                )}
<span className="cita-form-kicker">Información de reserva</span>
                <h2 className="cita-form-titulo">Completa tu cita</h2>
                <p className="cita-form-desc">
                  Servicio seleccionado: <strong>{servicioSeleccionado.nombre}</strong>
                </p>
              </div>

              {tienePrecioFijo && nivelesDescuentoDisponibles.length > 0 && (
                <section className="cita-opcion-descuento">
                  <label className="cita-toggle-texto-principal" htmlFor="cita-descuento-puntos">
                    Elige tu descuento por puntos
                  </label>
                  <select
                    id="cita-descuento-puntos"
                    value={porcentajeDescuento}
                    onChange={(event) => setPorcentajeDescuento(Number(event.target.value))}
                  >
                    <option value={0}>Sin descuento</option>
                    {nivelesDescuentoDisponibles
                      .slice()
                      .sort((a, b) => Number(a.porcentaje) - Number(b.porcentaje))
                      .map((nivel) => (
                        <option key={nivel.porcentaje} value={nivel.porcentaje}>
                          {nivel.porcentaje}% — usa {nivel.puntos} puntos
                        </option>
                      ))}
                  </select>
                  {nivelDescuento && (
                    <p className="cita-toggle-nota">
                      Ahorras {formatoPrecio(descuentoPotencial)} y se descuentan {nivelDescuento.puntos} puntos al aprobarse la reserva.
                    </p>
                  )}
                </section>
              )}
            </div>

            <div className="cita-form-content">
              <form id="cita-reserva-form" onSubmit={handleSubmit}>
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
                      min="08:00"
                      max="17:00"
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


              </form>


            </div>
          </section>
          <aside className="cita-payment-panel" aria-label="Resumen del pago">
                <span className="cita-payment-kicker">{tienePrecioFijo ? "Resumen de pago" : "Precio del servicio"}</span>
                <div className="cita-reserva-resumen">
                  {tienePrecioFijo ? (
                    <>
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
                        <div className="cita-reserva-pago">
                          <span>Pagas ahora en línea</span>
                          <strong>{formatoPrecio(montoSeleccionado)}</strong>
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
                    </>
                  ) : (
                    <div className="cita-precio-por-definir">
                      <strong>Precio a definir en el salón</strong>
                      <p>El valor se acordará en el salón según el estado de tu cabello o las necesidades del servicio. Puedes reservar tu cita sin pagar ahora.</p>
                    </div>
                  )}
                </div>
              <button className="cita-boton" form="cita-reserva-form" type="submit" disabled={reservando}>
                  {reservando
                    ? (tienePrecioFijo ? "Preparando el pago..." : "Reservando cita...")
                    : !tienePrecioFijo
                      ? "Reservar cita sin pagar"
                      : tipoPagoReserva === "completo"
                        ? "Pagar servicio completo"
                        : "Pagar reserva y confirmar cita"}
                </button>
              </aside>
        </>
        )}
      </div>

    </div>
  );

}

export default Cita;


