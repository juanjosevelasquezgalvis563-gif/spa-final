import { useCallback, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/image.png";
import { API_ROOT } from "../lib/api";
import { useSession } from "../context/useSession";
import {
  ArrowUpRight,
  Award,
  CalendarDays,
  CalendarPlus,
  CircleCheck,
  CirclePlus,
  Clock3,
  Gift,
  ListChecks,
  MessageSquareText,
  Scissors,
  Star,
  UserRound,
} from "lucide-react";

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

const NIVELES_FIDELIDAD = [
  { puntos: 300, descuento: 5 },
  { puntos: 600, descuento: 10 },
  { puntos: 900, descuento: 15 },
];

const ETIQUETAS_ESTADO = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  en_curso: "En curso",
  finalizada: "Finalizada",
  cancelada: "Cancelada",
};

function partesFecha(valor) {
  if (!valor) return null;
  const texto = String(valor).slice(0, 10);
  const fecha = new Date(`${texto}T12:00:00`);
  if (Number.isNaN(fecha.getTime())) return null;
  return {
    dia: String(fecha.getDate()).padStart(2, "0"),
    mes: MESES[fecha.getMonth()],
    semana: DIAS[fecha.getDay()],
    legible: fecha.toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
  };
}

function fechaCorta(valor) {
  const partes = partesFecha(valor);
  if (!partes) return "Sin fecha";
  return `${partes.dia} ${partes.mes.slice(0, 3)} ${partes.legible.slice(-4)}`;
}

function etiquetaEstado(estado) {
  return ETIQUETAS_ESTADO[estado] || "Sin cita";
}

function inicialesDe(nombre) {
  const partes = String(nombre || "").trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "JC";
  return (partes[0][0] + (partes[1]?.[0] || "")).toUpperCase();
}

function nivelSiguiente(saldo) {
  return NIVELES_FIDELIDAD.find((nivel) => nivel.puntos > saldo) || null;
}

export function Cliente() {
  const [message, SetMessage] = useState("");
  const [cantidad, SetCantidad] = useState(null);
  const [pendientes, SetPendientes] = useState(null);
  const [confirmadas, SetConfirmadas] = useState(null);
  const [finalizadas, SetFinalizadas] = useState(null);
  const [realizar, SetRealizar] = useState(null);
  const [ultimas, SetUltimasCitas] = useState([]);
  const [nombreCliente, setNombreCliente] = useState("");
  const [seccionActiva, setSeccionActiva] = useState("resumen");

  const [fidelizacion, setFidelizacion] = useState({
    saldo_puntos: 0,
    descuentoDisponible: 0,
    descuentoMaximo: 15000,
    historial: [],
  });
  const [citasParaDescuento, setCitasParaDescuento] = useState([]);
  const [citaSeleccionadaDescuento, setCitaSeleccionadaDescuento] = useState("");
  const [cargandoCitasDescuento, setCargandoCitasDescuento] = useState(false);

  const [citasParaResena, setCitasParaResena] = useState([]);
  const [citaSeleccionada, setCitaSeleccionada] = useState("");
  const [calificacion, setCalificacion] = useState(0);
  const [comentario, setComentario] = useState("");
  const [resenas, setResenas] = useState([]);
  const [publicandoResena, setPublicandoResena] = useState(false);
  const [canjeandoDescuento, setCanjeandoDescuento] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useSession();
  const perfilId = new URLSearchParams(location.search).get("perfilId");
  const perfilPath = (path) => (perfilId ? `${path}?perfilId=${encodeURIComponent(perfilId)}` : path);
  const navegarPerfil = (path) => navigate(perfilPath(path));

  const irASeccion = (id) => {
    setSeccionActiva(id);
    if (id === "resumen") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  async function cerrarSesion() {
    if (perfilId) {
      navigate("/admin");
      return;
    }

    try {
      await logout();
      navigate("/");
    } catch (error) {
      SetMessage("No pudimos cerrar tu sesión. Inténtalo de nuevo.");
    }
  }

  const obtenerNombreCliente = useCallback(async () => {
    try {
      const esPerfilAdmin = Boolean(perfilId);
      const url = esPerfilAdmin
        ? `${API_ROOT}/inser/administrador/perfiles?rol=cliente`
        : `${API_ROOT}/inser/me`;

      const response = await fetch(url, { credentials: "include" });
      const data = await response.json();

      if (!response.ok) {
        SetMessage(data.message || "No se pudo cargar el nombre del cliente");
        return;
      }

      const cliente = esPerfilAdmin
        ? Array.isArray(data) && data.find((perfil) => String(perfil.id) === perfilId)
        : data.user;

      if (cliente?.nombre) {
        setNombreCliente(cliente.nombre);
      }
    } catch (error) {
      console.error(error);
      SetMessage("No se pudo cargar el nombre del cliente");
    }
  }, [perfilId]);

  async function obtenerCitasParaDescuento() {
    try {
      setCargandoCitasDescuento(true);

      const response = await fetch(
        `${API_ROOT}/inser/cliente/citasParaDescuento`,
        {
          credentials: "include"
        }
      );

      const data = await response.json();

      if (!response.ok) {
        SetMessage(data.message || "No se pudieron consultar las citas.");
        return;
      }

      setCitasParaDescuento(Array.isArray(data) ? data : []);

    } catch (error) {
      console.error("Error al consultar citas para descuento:", error);
      SetMessage("Error al consultar las citas disponibles.");
    } finally {
      setCargandoCitasDescuento(false);
    }
  }

  async function cantidadCitas() {
    try {
      const response = await fetch(
        `${API_ROOT}/inser/cliente/cantidadCitas`,
        { credentials: "include" }
      );
      const data = await response.json();

      if (response.ok) SetCantidad(data);
      else SetMessage(data.message);
    } catch {
      SetMessage("No pudimos completar la solicitud. Revisa tu conexión e inténtalo de nuevo.");
    }
  }

  async function citasPendientes() {
    try {
      const response = await fetch(
        `${API_ROOT}/inser/cliente/citasPendientes`,
        { credentials: "include" }
      );
      const data = await response.json();

      if (response.ok) SetPendientes(data);
      else SetMessage(data.message);
    } catch {
      SetMessage("No pudimos completar la solicitud. Revisa tu conexión e inténtalo de nuevo.");
    }
  }

  async function citasComfirmadas() {
    try {
      const response = await fetch(
        `${API_ROOT}/inser/cliente/citasComfirmadas`,
        { credentials: "include" }
      );
      const data = await response.json();

      if (response.ok) SetConfirmadas(data);
      else SetMessage(data.message);
    } catch {
      SetMessage("No pudimos completar la solicitud. Revisa tu conexión e inténtalo de nuevo.");
    }
  }

  async function citasFinalizadas() {
    try {
      const response = await fetch(
        `${API_ROOT}/inser/cliente/citasFinalizadas`,
        { credentials: "include" }
      );
      const data = await response.json();

      if (response.ok) SetFinalizadas(data);
      else SetMessage(data.message);
    } catch {
      SetMessage("No pudimos completar la solicitud. Revisa tu conexión e inténtalo de nuevo.");
    }
  }

  async function citasRealizar() {
    try {
      const response = await fetch(
        `${API_ROOT}/inser/cliente/citaRealizar`,
        { credentials: "include" }
      );
      const data = await response.json();

      if (response.ok) SetRealizar(data);
      else SetMessage(data.message);
    } catch {
      SetMessage("No pudimos completar la solicitud. Revisa tu conexión e inténtalo de nuevo.");
    }
  }

  async function ultimasCitas() {
    try {
      const response = await fetch(
        `${API_ROOT}/inser/cliente/ultimasCitas`,
        { credentials: "include" }
      );
      const data = await response.json();

      if (response.ok) SetUltimasCitas(Array.isArray(data) ? data : []);
      else SetMessage(data.message);
    } catch {
      SetMessage("No pudimos completar la solicitud. Revisa tu conexión e inténtalo de nuevo.");
    }
  }

  async function obtenerFidelizacion() {
    try {
      const response = await fetch(
        `${API_ROOT}/inser/cliente/fidelizacion`,
        { credentials: "include" }
      );

      const data = await response.json();

      if (response.ok) {
        setFidelizacion({
          saldo_puntos: Number(data.saldo_puntos) || 0,
          descuentoDisponible: Number(data.descuentoDisponible) || 0,
          descuentoMaximo: Number(data.descuentoMaximo) || 15000,
          historial: Array.isArray(data.historial) ? data.historial : [],
        });
      } else {
        SetMessage(data.message || "No se pudo consultar la fidelización");
      }
    } catch (error) {
      console.error(error);
      SetMessage("Error al consultar los puntos");
    }
  }

  async function obtenerResenas() {
    try {
      const response = await fetch(
        `${API_ROOT}/inser/cliente/resenas`,
        { credentials: "include" }
      );

      const data = await response.json();

      if (response.ok) {
        setResenas(data.resenas || []);
      } else {
        SetMessage(data.message);
      }
    } catch (error) {
      console.error(error);
      SetMessage("Error al consultar las reseñas");
    }
  }
async function prepararCitasParaResena() {
    try {
      const response = await fetch(
        `${API_ROOT}/inser/cliente/citasParaResena`,
        { credentials: "include" }
      );

      const data = await response.json();

      if (!response.ok) {
        SetMessage(data.message);
        return;
      }

      const citas = Array.isArray(data) ? data : data.citas || [];

      const responseResenas = await fetch(
        `${API_ROOT}/inser/cliente/resenas`,
        { credentials: "include" }
      );

      const dataResenas = await responseResenas.json();

      if (!responseResenas.ok) {
        SetMessage(dataResenas.message);
        return;
      }

      const resenasRegistradas = dataResenas.resenas || [];

      const citasSinResena = citas.filter(
        (cita) => !resenasRegistradas.some((resena) => Number(resena.cita_id) === Number(cita.id))
      );

      setCitasParaResena(citasSinResena);
    } catch (error) {
      console.error(error);
      SetMessage("Error al consultar las citas para calificar");
    }
  }

  async function crearResena(event) {
    event.preventDefault();

    if (publicandoResena) return;

    if (!citaSeleccionada) {
      SetMessage("Selecciona una cita para calificar");
      return;
    }

    if (calificacion === 0) {
      SetMessage("Selecciona una calificación");
      return;
    }

    setPublicandoResena(true);

    try {
      const response = await fetch(`${API_ROOT}/inser/cliente/resenas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          cita_id: Number(citaSeleccionada),
          calificacion,
          comentario,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        SetMessage(`${data.message}. Ganaste ${data.puntos_ganados ?? 5} puntos.`);

        setCitaSeleccionada("");
        setCalificacion(0);
        setComentario("");

        await prepararCitasParaResena();
        await obtenerFidelizacion();
        await obtenerResenas();
      } else {
        SetMessage(data.message);
      }
    } catch (error) {
      console.error(error);
      SetMessage("Error al publicar la reseña");
    } finally {
      setPublicandoResena(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(obtenerNombreCliente);
    cantidadCitas();
    citasPendientes();
    citasComfirmadas();
    citasFinalizadas();
    citasRealizar();
    ultimasCitas();
    obtenerFidelizacion();
    obtenerResenas();
    obtenerCitasParaDescuento();
    prepararCitasParaResena();
  }, [obtenerNombreCliente]);

  useEffect(() => {
    if (!message) return;

    const temporizador = setTimeout(() => {
      SetMessage("");
    }, 4000);

    return () => clearTimeout(temporizador);
  }, [message]);

  const saldoPuntos = Number(fidelizacion.saldo_puntos) || 0;
  const proximoNivel = nivelSiguiente(saldoPuntos);
  const progresoPuntos = proximoNivel
    ? Math.min(100, Math.round((saldoPuntos / proximoNivel.puntos) * 100))
    : 100;
  const faltanPuntos = proximoNivel ? proximoNivel.puntos - saldoPuntos : 0;
  const proximaFecha = partesFecha(realizar?.fecha);
  const citaSeleccionadaInfo = citasParaResena.find(
    (item) => Number(item.id) === Number(citaSeleccionada)
  );
  const ultimasCitasVisibles = ultimas.slice(0, 4);

  return (
    <div className="dashboard panel-cliente">
      <aside className="pc-rail">
        <div className="pc-rail-brand">
          <span className="pc-rail-logo">
            <img src={logo} alt="JC Alta Peluquería" />
          </span>
          <div className="pc-rail-brand-text">
            <strong>JC Alta Peluquería</strong>
            <span>Panel de cliente</span>
          </div>
        </div>

        <nav className="pc-nav" aria-label="Secciones del panel">
          <span className="pc-nav-label">Mi cuenta</span>

          <button
            type="button"
            className={`pc-nav-item ${seccionActiva === "resumen" ? "is-active" : ""}`}
            onClick={() => irASeccion("resumen")}
          >
            <CalendarDays aria-hidden="true" />
            <span>Resumen</span>
          </button>

          <button
            type="button"
            className="pc-nav-item"
            onClick={() => navegarPerfil("/citas")}
          >
            <ListChecks aria-hidden="true" />
            <span>Mis citas</span>
          </button>

          <button
            type="button"
            className="pc-nav-item"
            onClick={() => navegarPerfil("/cita")}
          >
            <CalendarPlus aria-hidden="true" />
            <span>Agendar cita</span>
          </button>

          <button
            type="button"
            className={`pc-nav-item ${seccionActiva === "fidelizacion" ? "is-active" : ""}`}
            onClick={() => irASeccion("fidelizacion")}
          >
            <Award aria-hidden="true" />
            <span>Mis puntos</span>
          </button>

          <button
            type="button"
            className={`pc-nav-item ${seccionActiva === "resenas" ? "is-active" : ""}`}
            onClick={() => irASeccion("resenas")}
          >
            <MessageSquareText aria-hidden="true" />
            <span>Mis reseñas</span>
          </button>

          {!perfilId && (
            <button
              type="button"
              className="pc-nav-item"
              onClick={() => navegarPerfil("/perfil")}
            >
              <UserRound aria-hidden="true" />
              <span>Mis datos</span>
            </button>
          )}
        </nav>

        <div className="pc-rail-foot">
          <div className="pc-user">
            <span className="pc-user-avatar" aria-hidden="true">
              {inicialesDe(nombreCliente)}
            </span>
            <div className="pc-user-info">
              <strong title={nombreCliente}>{nombreCliente || "Cliente"}</strong>
              <span>Cliente</span>
            </div>
          </div>

          <button type="button" className="pc-rail-link" onClick={() => navigate("/")}>
            Página principal
            <ArrowUpRight aria-hidden="true" />
          </button>

          <button type="button" className="pc-rail-link" onClick={cerrarSesion}>
            {perfilId ? "Volver al panel administrador" : "Cerrar sesión"}
          </button>
        </div>
      </aside>
<div className="pc-main">
        {message && (
          <p className="cliente-message" role="status">
            {message}
          </p>
        )}

        <header className="pc-topbar">
          <div>
            <span className="pc-eyebrow">Mi panel</span>
            <h1>
              {nombreCliente ? `Hola, ${nombreCliente}` : "Panel de cliente"}
            </h1>
            <p className="pc-topbar-sub">
              Aquí tienes el resumen de tus citas, tus puntos y tus reseñas en
              JC Alta Peluquería.
            </p>
          </div>

          <div className="pc-topbar-actions">
            <span className="pc-date">
              <Clock3 aria-hidden="true" />
              {new Date().toLocaleDateString("es-CO", {
                weekday: "long",
                day: "2-digit",
                month: "long",
              })}
            </span>
            <button
              type="button"
              className="pc-btn is-gold"
              onClick={() => navegarPerfil("/cita")}
            >
              <CalendarPlus aria-hidden="true" />
              Agendar cita
            </button>
          </div>
        </header>

        <section className="pc-next" aria-labelledby="pc-next-title">
          {realizar ? (
            <>
              <div className="pc-next-body">
                <span className="pc-eyebrow">Tu próxima cita</span>
                <h2 className="pc-next-title" id="pc-next-title">
                  {realizar?.Servicio?.nombre || "Servicio por confirmar"}
                </h2>

                <ul className="pc-next-meta">
                  <li>
                    <UserRound aria-hidden="true" />
                    {realizar?.empleado?.nombre || "Profesional por asignar"}
                  </li>
                  <li>
                    <CalendarDays aria-hidden="true" />
                    {proximaFecha?.legible || "Fecha por confirmar"}
                  </li>
                  <li>
                    <span className={`pc-status is-${realizar?.estado || "pendiente"}`}>
                      {etiquetaEstado(realizar?.estado)}
                    </span>
                  </li>
                </ul>

                <div className="pc-next-actions">
                  <button
                    type="button"
                    className="pc-btn is-gold"
                    onClick={() => navegarPerfil("/citas")}
                  >
                    <ListChecks aria-hidden="true" />
                    Ver mis citas
                  </button>
                  <button
                    type="button"
                    className="pc-btn"
                    onClick={() => navegarPerfil("/cita")}
                  >
                    <CalendarPlus aria-hidden="true" />
                    Agendar otra
                  </button>
                </div>
              </div>

              <div className="pc-next-date">
                <span className="pc-next-weekday">
                  {proximaFecha?.semana || "Sin día"}
                </span>
                <span className="pc-next-day">{proximaFecha?.dia || "--"}</span>
                <span className="pc-next-month">{proximaFecha?.mes || "---"}</span>
                <span className="pc-next-time">
                  {realizar?.hora?.slice(0, 5) || "--:--"}
                </span>
              </div>
            </>
          ) : (
            <div className="pc-next-empty">
              <div>
                <span className="pc-eyebrow">Tu próxima cita</span>
                <h2 className="pc-next-title" id="pc-next-title">
                  Aún no tienes una cita agendada
                </h2>
                <p>
                  Reserva tu próximo servicio y asegura tu horario con el
                  profesional que prefieras.
                </p>
              </div>
              <button
                type="button"
                className="pc-btn is-gold"
                onClick={() => navegarPerfil("/cita")}
              >
                <CalendarPlus aria-hidden="true" />
                Agendar ahora
              </button>
            </div>
          )}
        </section>

        <div className="pc-stats">
          <article className="pc-stat">
            <div className="pc-stat-top">
              <span className="pc-stat-icon" aria-hidden="true">
                <CalendarDays />
              </span>
            </div>
            <div>
              <p className="pc-stat-value">{cantidad ?? 0}</p>
              <p className="pc-stat-label">Total de citas</p>
            </div>
            <span className="pc-stat-hint">Todas tus citas registradas</span>
          </article>

          <article className="pc-stat is-gold">
            <div className="pc-stat-top">
              <span className="pc-stat-icon" aria-hidden="true">
                <Clock3 />
              </span>
            </div>
            <div>
              <p className="pc-stat-value">{pendientes ?? 0}</p>
              <p className="pc-stat-label">Pendientes</p>
            </div>
            <span className="pc-stat-hint">Esperando confirmación</span>
          </article>

          <article className="pc-stat is-green">
            <div className="pc-stat-top">
              <span className="pc-stat-icon" aria-hidden="true">
                <CircleCheck />
              </span>
            </div>
            <div>
              <p className="pc-stat-value">{confirmadas ?? 0}</p>
              <p className="pc-stat-label">Confirmadas</p>
            </div>
            <span className="pc-stat-hint">Tus próximas visitas</span>
          </article>

          <article className="pc-stat is-plum">
            <div className="pc-stat-top">
              <span className="pc-stat-icon" aria-hidden="true">
                <Star />
              </span>
            </div>
            <div>
              <p className="pc-stat-value">{finalizadas ?? 0}</p>
              <p className="pc-stat-label">Finalizadas</p>
            </div>
            <span className="pc-stat-hint">Servicios completados</span>
          </article>
        </div>
<div className="pc-grid">
          <section className="pc-card" id="fidelizacion" aria-labelledby="pc-puntos-title">
            <div className="pc-card-head">
              <div>
                <span className="pc-eyebrow">Programa de beneficios</span>
                <h2 className="pc-card-title" id="pc-puntos-title">
                  Programa de fidelización
                </h2>
              </div>
              <span className="pc-points-badge" aria-hidden="true">
                <Award />
              </span>
            </div>

            <div className="pc-points">
              <div>
                <span className="pc-points-label">Puntos disponibles</span>
                <p className="pc-points-value">
                  {saldoPuntos}
                  <small>puntos</small>
                </p>
              </div>
              <div>
                <span className="pc-points-label">Descuento actual</span>
                <p className="pc-points-value">
                  {fidelizacion.descuentoDisponible}
                  <small>%</small>
                </p>
              </div>
            </div>

            <div className="pc-progress">
              <div className="pc-progress-head">
                <span>
                  {proximoNivel ? (
                    <>
                      Te faltan <strong>{faltanPuntos} puntos</strong> para el{" "}
                      {proximoNivel.descuento}% de descuento
                    </>
                  ) : (
                    <>
                      ¡Nivel máximo alcanzado! Disfrutas del{" "}
                      <strong>{fidelizacion.descuentoDisponible}%</strong>
                    </>
                  )}
                </span>
                <span>{progresoPuntos}%</span>
              </div>
              <div
                className="pc-progress-track"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progresoPuntos}
                aria-label="Progreso del programa de fidelización"
              >
                <span
                  className="pc-progress-fill"
                  style={{ width: `${progresoPuntos}%` }}
                />
              </div>
            </div>

            <ul className="pc-tiers">
              {NIVELES_FIDELIDAD.map((nivel) => (
                <li
                  key={nivel.puntos}
                  className={`pc-tier ${saldoPuntos >= nivel.puntos ? "is-reached" : ""}`}
                >
                  <strong>{nivel.puntos} pts</strong>
                  <span>{nivel.descuento}% de descuento</span>
                </li>
              ))}
            </ul>

            <p className="pc-note">
              El descuento se aplica al reservar tu cita. Ahorro máximo por nivel:{" "}
              <strong>5% = $6.000 COP</strong>,{" "}
              <strong>10% = $12.000 COP</strong> y{" "}
              <strong>15% = $18.000 COP</strong>. El canje se coordina con el salón al reservar.
            </p>

            <ul className="pc-earn">
              <li>
                <span className="pc-earn-icon" aria-hidden="true">
                  <Scissors />
                </span>
                <div className="pc-earn-text">
                  <strong>Finaliza tus servicios</strong>
                  <span>
                    Acumula puntos según el valor del servicio que disfrutes.
                  </span>
                </div>
              </li>
              <li>
                <span className="pc-earn-icon" aria-hidden="true">
                  <MessageSquareText />
                </span>
                <div className="pc-earn-text">
                  <strong>Comparte tu experiencia</strong>
                  <span>Gana 5 puntos al publicar una reseña válida.</span>
                </div>
              </li>
            </ul>
          </section>

          <section className="pc-card" aria-labelledby="pc-historial-title">
            <div className="pc-card-head">
              <div>
                <span className="pc-eyebrow">Movimientos</span>
                <h2 className="pc-card-title" id="pc-historial-title">
                  Historial de puntos
                </h2>
              </div>
              <span className="pc-chip">
                {fidelizacion.historial.length} registros
              </span>
            </div>

            {fidelizacion.historial.length === 0 ? (
              <p className="pc-empty">
                Todavía no tienes movimientos de puntos. Completa un servicio o
                deja una reseña para empezar a acumular.
              </p>
            ) : (
              <ul className="pc-list">
                {fidelizacion.historial.slice(0, 6).map((movimiento) => (
                  <li className="pc-list-item" key={movimiento.id}>
                    <span className="pc-list-icon" aria-hidden="true">
                      {movimiento.tipo === "canje" ? <Gift /> : <CirclePlus />}
                    </span>
                    <div className="pc-list-body">
                      <strong>
                        {movimiento.descripcion || "Movimiento de puntos"}
                      </strong>
                      <span>
                        {movimiento.fecha_creacion
                          ? new Date(movimiento.fecha_creacion).toLocaleDateString("es-CO")
                          : "Sin fecha"}
                      </span>
                    </div>
                    <span
                      className={`pc-delta ${movimiento.tipo === "canje" ? "is-minus" : "is-plus"}`}
                    >
                      {movimiento.tipo === "canje" ? "−" : "+"}
                      {movimiento.puntos}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
<div className="pc-grid">
          <section className="pc-card" aria-labelledby="pc-citas-title">
            <div className="pc-card-head">
              <div>
                <span className="pc-eyebrow">Historial</span>
                <h2 className="pc-card-title" id="pc-citas-title">
                  Mis citas recientes
                </h2>
              </div>
              <button
                type="button"
                className="pc-btn is-ghost"
                onClick={() => navegarPerfil("/citas")}
              >
                Ver todas
              </button>
            </div>

            {ultimasCitasVisibles.length === 0 ? (
              <p className="pc-empty">
                Cuando agendes tu primera cita aparecerá aquí con su estado y
                profesional asignado.
              </p>
            ) : (
              <ul className="pc-list">
                {ultimasCitasVisibles.map((cita) => (
                  <li className="pc-list-item" key={cita.id}>
                    <span className="pc-list-icon" aria-hidden="true">
                      <CalendarDays />
                    </span>
                    <div className="pc-list-body">
                      <strong>{cita?.Servicio?.nombre || "Servicio"}</strong>
                      <span>
                        {fechaCorta(cita?.fecha)} ·{" "}
                        {cita?.hora?.slice(0, 5) || "--:--"} ·{" "}
                        {cita?.empleado?.nombre || "Sin asignar"}
                      </span>
                    </div>
                    <span className="pc-chip">{etiquetaEstado(cita?.estado)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="pc-card" aria-labelledby="pc-accesos-title">
            <div className="pc-card-head">
              <div>
                <span className="pc-eyebrow">Atajos</span>
                <h2 className="pc-card-title" id="pc-accesos-title">
                  Accesos rápidos
                </h2>
              </div>
            </div>

            <div className="pc-form">
              <button
                type="button"
                className="pc-action"
                onClick={() => navegarPerfil("/cita")}
              >
                <span className="pc-action-icon" aria-hidden="true">
                  <CalendarPlus />
                </span>
                <span className="pc-action-text">
                  <strong>Agendar nueva cita</strong>
                  <span>Reserva tu próximo servicio</span>
                </span>
              </button>

              <button
                type="button"
                className="pc-action"
                onClick={() => navegarPerfil("/citas")}
              >
                <span className="pc-action-icon" aria-hidden="true">
                  <ListChecks />
                </span>
                <span className="pc-action-text">
                  <strong>Ver mis citas</strong>
                  <span>Consulta y reprograma tus reservas</span>
                </span>
              </button>

              {!perfilId && (
                <button
                  type="button"
                  className="pc-action"
                  onClick={() => navegarPerfil("/perfil")}
                >
                  <span className="pc-action-icon" aria-hidden="true">
                    <UserRound />
                  </span>
                  <span className="pc-action-text">
                    <strong>Actualizar mis datos</strong>
                    <span>Mantén tu información al día</span>
                  </span>
                </button>
              )}
            </div>
          </section>
        </div>
<div className="pc-reviews" id="resenas">
          <section className="pc-card" aria-labelledby="pc-nueva-resena-title">
            <div className="pc-card-head">
              <div>
                <span className="pc-eyebrow">Tu experiencia cuenta</span>
                <h2 className="pc-card-title" id="pc-nueva-resena-title">
                  Cuéntanos cómo te fue
                </h2>
              </div>
              <span className="pc-points-badge" aria-hidden="true">
                <MessageSquareText />
              </span>
            </div>

            {citasParaResena.length === 0 ? (
              <p className="pc-empty">
                No tienes citas pendientes por calificar. Cuando finalices un
                servicio podrás dejar aquí tu opinión y ganar 5 puntos.
              </p>
            ) : (
              <form className="pc-form" onSubmit={crearResena}>
                <div className="pc-field">
                  <label htmlFor="cita-resena">Elige el servicio</label>
                  <select
                    id="cita-resena"
                    value={citaSeleccionada}
                    onChange={(event) => setCitaSeleccionada(event.target.value)}
                  >
                    <option value="">Seleccionar una cita finalizada</option>
                    {citasParaResena.map((cita) => (
                      <option key={cita.id} value={cita.id}>
                        {cita.Servicio?.nombre || "Servicio"} ·{" "}
                        {cita.empleado?.nombre || "Profesional no asignado"} ·{" "}
                        {fechaCorta(cita.fecha)}
                      </option>
                    ))}
                  </select>
                </div>

                {citaSeleccionadaInfo && (
                  <div className="pc-selected">
                    <CircleCheck aria-hidden="true" />
                    <div>
                      <strong>
                        {citaSeleccionadaInfo.Servicio?.nombre || "Servicio"}
                      </strong>
                      <span>
                        Atendido por{" "}
                        {citaSeleccionadaInfo.empleado?.nombre ||
                          "profesional no asignado"}
                      </span>
                      <small>{fechaCorta(citaSeleccionadaInfo.fecha)}</small>
                    </div>
                  </div>
                )}

                <fieldset className="pc-stars">
                  <legend>¿Cómo calificarías la atención?</legend>
                  <div className="pc-stars-row" role="group" aria-label="Calificación">
                    {[1, 2, 3, 4, 5].map((estrella) => (
                      <button
                        key={estrella}
                        type="button"
                        className={estrella <= calificacion ? "is-on" : ""}
                        onClick={() => setCalificacion(estrella)}
                        aria-pressed={calificacion === estrella}
                      >
                        {estrella <= calificacion ? "★" : "☆"}
                      </button>
                    ))}
                    <span className="pc-stars-value">
                      {calificacion > 0
                        ? `${calificacion} de 5`
                        : "Selecciona una calificación"}
                    </span>
                  </div>
                </fieldset>

                <div className="pc-field">
                  <label htmlFor="comentario-resena">Tu comentario (opcional)</label>
                  <textarea
                    id="comentario-resena"
                    value={comentario}
                    onChange={(event) => setComentario(event.target.value)}
                    maxLength={500}
                    placeholder="¿Qué fue lo que más te gustó?"
                  />
                  <span className="pc-counter">{comentario.length}/500</span>
                </div>

                <button
                  type="submit"
                  className="pc-submit"
                  disabled={!citaSeleccionada || calificacion === 0 || publicandoResena}
                >
                  <MessageSquareText aria-hidden="true" />
                  {publicandoResena ? "Publicando…" : "Publicar reseña"}
                </button>

                <p className="pc-hint">
                  Al publicar una reseña válida ganas 5 puntos.
                </p>
              </form>
            )}
          </section>

          <section className="pc-card" aria-labelledby="pc-mis-resenas-title">
            <div className="pc-card-head">
              <div>
                <span className="pc-eyebrow">Tu historial</span>
                <h2 className="pc-card-title" id="pc-mis-resenas-title">
                  Mis reseñas
                </h2>
              </div>
              <span className="pc-chip">{resenas.length} publicadas</span>
            </div>

            {resenas.length === 0 ? (
              <p className="pc-empty">
                Tus reseñas publicadas aparecerán aquí.
              </p>
            ) : (
              <ul className="pc-review-list">
                {resenas.map((resena) => (
                  <li className="pc-review" key={resena.id}>
                    <div className="pc-review-top">
                      <span
                        className="pc-review-stars"
                        aria-label={`${resena.calificacion} de 5 estrellas`}
                      >
                        {"★".repeat(resena.calificacion)}
                        <i>{"★".repeat(Math.max(0, 5 - resena.calificacion))}</i>
                      </span>

                      <time>
                        {resena.fecha_creacion
                          ? new Date(resena.fecha_creacion).toLocaleDateString("es-CO")
                          : ""}
                      </time>
                    </div>

                    <p>{resena.comentario || "Sin comentario"}</p>

                    <div className="pc-review-by">
                      <Scissors aria-hidden="true" />
                      <strong>{resena.cita?.empleado?.nombre || "Profesional"}</strong>
                      <span>· {resena.cita?.Servicio?.nombre || "Servicio"}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          
        </div>
      </div>
    </div>
  );
}

export default Cliente;
