
import { useCallback, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import logo from '../assets/image.png';
import { API_ROOT } from '../lib/api';
import { useSession } from "../context/useSession";
import {
  CalendarDays,
  CalendarPlus,
  CirclePlus,
  Gift,
  ListChecks,
  MessageSquareText,
  Award,
  Scissors,
  Star,
  UserRound
} from "lucide-react";

export function Cliente() {
  const [message, SetMessage] = useState("");
  const [cantidad, SetCantidad] = useState(null);
  const [pendientes, SetPendientes] = useState(null);
  const [confirmadas, SetConfirmadas] = useState(null);
  const [finalizadas, SetFinalizadas] = useState(null);
  const [realizar, SetRealizar] = useState(null);
  const [ultimas, SetUltimasCitas] = useState([]);
  const [nombreCliente, setNombreCliente] = useState("");

  const [fidelizacion, setFidelizacion] = useState({
    saldo_puntos: 0,
    descuentoDisponible: 0,
    descuentoMaximo: 0,
    historial: []
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
  const perfilPath = (path) => perfilId ? `${path}?perfilId=${encodeURIComponent(perfilId)}` : path;
  const navegarPerfil = (path) => navigate(perfilPath(path));

  async function cerrarSesion() {
    if (perfilId) {
      navigate("/admin");
      return;
    }

    try {
      await logout();
      navigate("/");
    } catch (error) {
      SetMessage(error.message || "No se pudo cerrar la sesión.");
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
        SetMessage(data.message || 'No se pudo cargar el nombre del cliente');
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
      SetMessage('No se pudo cargar el nombre del cliente');
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
      SetMessage('Error de conexion con el servidor');
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
      SetMessage('Error de conexion con el servidor');
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
      SetMessage('Error de conexion con el servidor');
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
      SetMessage('Error de conexion con el servidor');
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
      SetMessage('Error de conexion con el servidor');
    }
  }

  async function ultimasCitas() {
    try {
      const response = await fetch(
        `${API_ROOT}/inser/cliente/ultimasCitas`,
        { credentials: "include" }
      );
      const data = await response.json();

      if (response.ok) SetUltimasCitas(data);
      else SetMessage(data.message);
    } catch {
      SetMessage('Error de conexion con el servidor');
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
          descuentoMaximo: Number(data.descuentoMaximo) || 0,
          historial: Array.isArray(data.historial)
            ? data.historial
            : []
        });
      } else {
        SetMessage(data.message || 'No se pudo consultar la fidelización');
      }
    } catch (error) {
      console.error(error);
      SetMessage('Error al consultar los puntos');
    }
  }

  async function canjearDescuento() {

    if (perfilId) {
      SetMessage("No puedes canjear puntos desde la vista de administrador.");
      return;
    }

    if (canjeandoDescuento) return;

    if (!citaSeleccionadaDescuento) {
      SetMessage("Selecciona una cita para aplicar el descuento.");
      return;
    }

    if (!fidelizacion.descuentoDisponible) {
      SetMessage("Todavía no tienes un descuento disponible.");
      return;
    }

    const confirmado = window.confirm(
      `¿Deseas aplicar el descuento del ${fidelizacion.descuentoDisponible}% a esta cita? Se descontarán los puntos correspondientes.`
    );

    if (!confirmado) return;

    setCanjeandoDescuento(true);

    try {

      const response = await fetch(
        `${API_ROOT}/inser/cliente/fidelizacion/canjear`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({
            cita_id: Number(citaSeleccionadaDescuento),
            porcentaje: fidelizacion.descuentoDisponible
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        SetMessage(data.message || "No se pudo aplicar el descuento.");
        return;
      }

      SetMessage(data.message || "Descuento aplicado correctamente.");

      // Limpiar la selección.
      setCitaSeleccionadaDescuento("");

      // Actualizar puntos disponibles.
      await obtenerFidelizacion();

      // Actualizar citas que todavía permiten descuentos.
      await obtenerCitasParaDescuento();

    } catch (error) {

      console.error("Error al canjear descuento:", error);
      SetMessage("Error al intentar aplicar el descuento.");

    } finally {
      setCanjeandoDescuento(false);
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
      SetMessage('Error al consultar las reseñas');
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

      const citasSinResena = citas.filter((cita) =>
        !resenasRegistradas.some(
          (resena) => Number(resena.cita_id) === Number(cita.id)
        )
      );

      setCitasParaResena(citasSinResena);
    } catch (error) {
      console.error(error);
      SetMessage('Error al consultar las citas para calificar');
    }
  }

  async function crearResena(event) {
    event.preventDefault();

    if (publicandoResena) return;

    if (!citaSeleccionada) {
      SetMessage('Selecciona una cita para calificar');
      return;
    }

    if (calificacion === 0) {
      SetMessage('Selecciona una calificación');
      return;
    }

    setPublicandoResena(true);

    try {
      const response = await fetch(
        `${API_ROOT}/inser/cliente/resenas`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({
            cita_id: Number(citaSeleccionada),
            calificacion,
            comentario
          })
        }
      );

      const data = await response.json();

      if (response.ok) {
        SetMessage(
          `${data.message}. Ganaste ${data.puntos_ganados ?? 5} puntos.`
        );

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
      SetMessage('Error al publicar la reseña');
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

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <h2 className="logo">
          <img src={logo} alt="Logo JC Alta Peluquería" />
        </h2>

        <button onClick={() => navegarPerfil("/citas")}>Mis citas</button>
        <button onClick={() => navegarPerfil("/cita")}>Agendar cita</button>
        <button onClick={() => navegarPerfil("/cliente/productos")}>Productos</button>
        <button onClick={() => navegarPerfil("/perfil")}>Actualizar datos</button>
        <button onClick={() => navigate("/")}>Ir a la página principal</button>

        <button onClick={cerrarSesion}>
          {perfilId ? "Volver al panel administrador" : "Cerrar sesión"}
        </button>

        <button onClick={() => document.getElementById("fidelizacion")?.scrollIntoView({ behavior: "smooth" })}>
          Mis puntos
        </button>

        <button onClick={() => document.getElementById("resenas")?.scrollIntoView({ behavior: "smooth" })}>
          Calificar servicio
        </button>
      </aside>

      <main className="contenido">
        <div className="bienvenida">
          <p>
            {nombreCliente
              ? `Bienvenid@, ${nombreCliente}`
              : "Panel de cliente"}
          </p>
        </div>

        {message && (
          <p className="cliente-message">{message}</p>
        )}

        <div className="cards">
          <div className="card">
            <h4><CalendarDays className="dashboard-icon" /> Total de citas</h4>
            <h2>{cantidad}</h2>
            <span>Todas tus citas</span>
          </div>

          <div className="card naranja">
            <h4><CalendarPlus className="dashboard-icon" /> Pendientes</h4>
            <h2>{pendientes}</h2>
            <span>Por confirmar</span>
          </div>

          <div className="card verde">
            <h4><ListChecks className="dashboard-icon" /> Confirmadas</h4>
            <h2>{confirmadas}</h2>
            <span>Próximas citas</span>
          </div>

          <div className="card azul">
            <h4><Star className="dashboard-icon" /> Finalizadas</h4>
            <h2>{finalizadas}</h2>
            <span>Completadas</span>
          </div>
        </div>

        <div className="panel-superior">
          <div className="citas-realizar">
            <h4>Próxima cita</h4>

            <div className="cita-info">
              <h3>Fecha</h3>
              <p>{realizar?.fecha?.split("T")[0] || "Sin cita"}</p>

              <h3>Hora</h3>
              <p>{realizar?.hora?.slice(0, 5) || "--:--"}</p>

              <h3>Servicio</h3>
              <p>{realizar?.Servicio?.nombre || "No disponible"}</p>

              <h3>Empleado</h3>
              <p>{realizar?.empleado?.nombre || "No asignado"}</p>

              <h3>Estado</h3>
              <span className="estado">{realizar?.estado || "Sin cita"}</span>
            </div>
          </div>

          <div className="acciones">
            <button className="accion" onClick={() => navegarPerfil("/cita")}>
              <span className="accion-icono"><CalendarPlus className="dashboard-icon" /></span>
              <div>
                <h3>Agendar nueva cita</h3>
                <p>Reserva tu próximo servicio</p>
              </div>
            </button>

            <button className="accion" onClick={() => navegarPerfil("/citas")}>
              <span className="accion-icono"><ListChecks className="dashboard-icon" /></span>
              <div>
                <h3>Ver mis citas</h3>
                <p>Consulta tu historial completo</p>
              </div>
            </button>

            <button className="accion" onClick={() => navegarPerfil("/perfil")}>
              <span className="accion-icono"><UserRound className="dashboard-icon" /></span>
              <div>
                <h3>Editar mi perfil</h3>
                <p>Actualiza tus datos personales</p>
              </div>
            </button>
          </div>
        </div>

        {/* FIDELIZACIÓN */}
        <section className="fidelizacion" id="fidelizacion">
          <div className="fidelizacion-cabecera">
            <div>
              <span className="fidelizacion-etiqueta">PROGRAMA DE BENEFICIOS</span>
              <h2>Programa de fidelización</h2>
              <p>Cada visita te acerca a nuevos beneficios.</p>
            </div>

            <div className="fidelizacion-icono">
              <Award className="dashboard-icon" />
            </div>
          </div>

          <div className="puntos-resumen">
            <div>
              <span>Mis puntos disponibles</span>
              <h2>{fidelizacion.saldo_puntos}</h2>
              <p>Puntos acumulados en tus servicios y reseñas</p>
            </div>

            <div className="puntos-icono">
              <Star className="dashboard-icon" />
            </div>
          </div>

          {/* DESCUENTOS */}
          <div className="descuento-disponible">
            <h3>Mi descuento disponible</h3>

            <h2>{fidelizacion.descuentoDisponible}%</h2>

            {fidelizacion.descuentoDisponible === 0 ? (
              <p>
                Acumula 300 puntos para desbloquear tu primer descuento.
              </p>
            ) : (
              <p>
                Tienes disponible un descuento del{" "}
                {fidelizacion.descuentoDisponible}% en servicios.
                El ahorro máximo es de $
                {fidelizacion.descuentoMaximo.toLocaleString("es-CO")} COP.
              </p>
            )}

            <div className="niveles-descuento">
              <div>
                <strong>300 puntos</strong>
                <span>5% de descuento · máximo $6.000</span>
              </div>

              <div>
                <strong>600 puntos</strong>
                <span>10% de descuento · máximo $12.000</span>
              </div>

              <div>
                <strong>900 puntos</strong>
                <span>15% de descuento · máximo $18.000</span>
              </div>
            </div>

            {fidelizacion.descuentoDisponible > 0 && (
              <>
                <label htmlFor="cita-descuento">
                  Selecciona la cita donde deseas aplicar tu descuento:
                </label>

                <select
                  id="cita-descuento"
                  value={citaSeleccionadaDescuento}
                  onChange={(e) => setCitaSeleccionadaDescuento(e.target.value)}
                  disabled={canjeandoDescuento || Boolean(perfilId) || cargandoCitasDescuento}
                >
                  <option value="">Seleccionar una cita</option>

                  {citasParaDescuento.map((cita) => (
                    <option key={cita.id} value={cita.id}>
                      {cita.Servicio?.nombre || "Servicio"} -{" "}
                      {cita.fecha?.split("T")[0]} -{" "}
                      {cita.hora?.slice(0, 5)}
                    </option>
                  ))}
                </select>

                {cargandoCitasDescuento && <p>Cargando citas disponibles...</p>}

                {!cargandoCitasDescuento && citasParaDescuento.length === 0 && (
                  <p>
                    No tienes citas pendientes o confirmadas disponibles
                    para aplicar descuentos.
                  </p>
                )}

                <button
                  type="button"
                  className="resena-publicar"
                  onClick={canjearDescuento}
                  disabled={
                    canjeandoDescuento ||
                    Boolean(perfilId) ||
                    !citaSeleccionadaDescuento ||
                    citasParaDescuento.length === 0
                  }
                >
                  {canjeandoDescuento
                    ? "Canjeando..."
                    : `Aplicar descuento del ${fidelizacion.descuentoDisponible}%`}
                </button>
              </>
            )}
          </div>

          {/* CÓMO GANAR PUNTOS */}
          <div className="como-ganar-puntos">
            <h3>¿Cómo ganar puntos?</h3>

            <div className="beneficio-puntos">
              <span><Scissors className="dashboard-icon" /></span>
              <div>
                <h4>Finaliza tus servicios</h4>
                <p>
                  Gana 1 punto por cada $2.000 COP del valor del servicio.
                  Los puntos se acreditan cuando el empleado finaliza la cita.
                </p>
              </div>
            </div>

            <div className="beneficio-puntos">
              <span><MessageSquareText className="dashboard-icon" /></span>
              <div>
                <h4>Comparte tu experiencia</h4>
                <p>Gana 5 puntos al publicar una reseña válida.</p>
              </div>
            </div>
          </div>

          {/* HISTORIAL DE PUNTOS */}
          <div className="historial-puntos">
            <h3>Historial de puntos</h3>

            {fidelizacion.historial.length === 0 ? (
              <p className="sin-puntos">
                Todavía no tienes movimientos de puntos.
                ¡Completa las acciones del programa para comenzar!
              </p>
            ) : (
              fidelizacion.historial.map((movimiento) => (
                <div className="movimiento-puntos" key={movimiento.id}>
                  <div className="movimiento-icono">
                    {movimiento.tipo === "canje"
                      ? <Gift className="dashboard-icon" />
                      : <CirclePlus className="dashboard-icon" />}
                  </div>

                  <div className="movimiento-info">
                    <h4>{movimiento.descripcion || "Movimiento de puntos"}</h4>
                    <span>
                      {movimiento.fecha_creacion
                        ? new Date(movimiento.fecha_creacion).toLocaleDateString("es-CO")
                        : ""}
                    </span>
                  </div>

                  <strong className={
                    movimiento.tipo === "canje"
                      ? "puntos-restados"
                      : "puntos-ganados"
                  }>
                    {movimiento.tipo === "canje" ? "-" : "+"}
                    {movimiento.puntos}
                  </strong>
                </div>
              ))
            )}
          </div>
        </section>

        {/* RESEÑAS */}
        <section className="formulario-resena" id="resenas">
          <div className="resena-encabezado">
            <span className="resena-etiqueta">TU EXPERIENCIA CUENTA</span>
            <h2>Cuéntanos cómo te fue</h2>
            <p>Califica el servicio y comparte tu opinión con nuestro equipo.</p>
          </div>

          <form className="resena-crear" onSubmit={crearResena}>
            <div className="resena-form-title">
              <span className="resena-form-icon">
                <MessageSquareText className="dashboard-icon" />
              </span>
              <div>
                <h3>Nueva reseña</h3>
                <p>Una reseña por cada cita finalizada.</p>
              </div>
            </div>

            {citasParaResena.length === 0 ? (
              <p className="resena-vacia">
                No tienes citas pendientes por calificar.
              </p>
            ) : (
              <>
                <label htmlFor="cita-resena">Elige el servicio</label>

                <select
                  id="cita-resena"
                  value={citaSeleccionada}
                  onChange={(e) => setCitaSeleccionada(e.target.value)}
                >
                  <option value="">Seleccionar una cita finalizada</option>

                  {citasParaResena.map((cita) => (
                    <option key={cita.id} value={cita.id}>
                      {cita.Servicio?.nombre || "Servicio"} ·{" "}
                      {cita.empleado?.nombre || "Profesional no asignado"} ·{" "}
                      {cita.fecha?.split("T")[0]}
                    </option>
                  ))}
                </select>

                <fieldset className="resena-calificacion">
                  <legend>¿Cómo calificarías la atención?</legend>

                  <div className="estrellas-resena" role="group">
                    {[1, 2, 3, 4, 5].map((estrella) => (
                      <button
                        key={estrella}
                        type="button"
                        className={estrella <= calificacion ? "seleccionada" : ""}
                        onClick={() => setCalificacion(estrella)}
                        aria-pressed={calificacion === estrella}
                      >
                        {estrella <= calificacion ? "★" : "☆"}
                      </button>
                    ))}

                    <span>
                      {calificacion > 0
                        ? `${calificacion} de 5`
                        : "Selecciona una calificación"}
                    </span>
                  </div>
                </fieldset>

                <label htmlFor="comentario-resena">Tu comentario (opcional)</label>

                <textarea
                  id="comentario-resena"
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  maxLength={500}
                  placeholder="¿Qué fue lo que más te gustó?"
                />

                <span className="resena-caracteres">
                  {comentario.length}/500
                </span>

                <button
                  className="resena-publicar"
                  type="submit"
                  disabled={!citaSeleccionada || calificacion === 0 || publicandoResena}
                >
                  {publicandoResena ? "Publicando..." : "Publicar reseña"}
                </button>

                <p className="resena-puntos">
                  Al publicar una reseña válida ganas 5 puntos.
                </p>
              </>
            )}
          </form>

          {/* RESEÑAS PUBLICADAS */}
          <div className="resenas-publicadas">
            <div className="resenas-publicadas-cabecera">
              <div>
                <span className="resena-etiqueta">TU HISTORIAL</span>
                <h3>Mis reseñas</h3>
              </div>

              <span className="resenas-conteo">{resenas.length}</span>
            </div>

            {resenas.length === 0 ? (
              <p className="resenas-sin-publicar">
                Tus reseñas publicadas aparecerán aquí.
              </p>
            ) : (
              <div className="resenas-lista">
                {resenas.map((resena) => (
                  <article className="resena-publicada" key={resena.id}>
                    <div className="resena-publicada-top">
                      <span className="resena-estrellas-lectura">
                        {"★".repeat(resena.calificacion)}
                        <span>{"☆".repeat(5 - resena.calificacion)}</span>
                      </span>

                      <time>
                        {resena.fecha_creacion
                          ? new Date(resena.fecha_creacion).toLocaleDateString("es-CO")
                          : ""}
                      </time>
                    </div>

                    <p className="resena-publicada-comentario">
                      {resena.comentario || "Sin comentario"}
                    </p>

                    <div className="resena-dirigida">
                      <span><Scissors className="dashboard-icon" /></span>
                      <div>
                        <strong>
                          {resena.cita?.empleado?.nombre || "Profesional"}
                        </strong>
                        <small>
                          {resena.cita?.Servicio?.nombre || "Servicio"}
                        </small>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default Cliente;
