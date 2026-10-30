
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export function Cliente() {
  const [message, SetMessage] = useState("");
  const [cantidad, SetCantidad] = useState(null);
  const [pendientes, SetPendientes] = useState(null);
  const [confirmadas, SetConfirmadas] = useState(null);
  const [finalizadas, SetFinalizadas] = useState(null);
  const [realizar, SetRealizar] = useState(null);
  const [ultimas, SetUltimasCitas] = useState([]);

  const [fidelizacion, setFidelizacion] = useState({
    saldo_puntos: 0,
    descuentoDisponible: 0,
    descuentoMaximo: 15000,
    historial: []
  });

  const [citasParaResena, setCitasParaResena] = useState([]);
  const [citaSeleccionada, setCitaSeleccionada] = useState("");
  const [calificacion, setCalificacion] = useState(0);
  const [comentario, setComentario] = useState("");
  const [resenas, setResenas] = useState([]);

  const navigate = useNavigate();
  const location = useLocation();
  const perfilId = new URLSearchParams(location.search).get("perfilId");
  const perfilPath = (path) => perfilId ? `${path}?perfilId=${encodeURIComponent(perfilId)}` : path;
  const navegarPerfil = (path) => navigate(perfilPath(path));

  async function cantidadCitas() {
    try {
      const response = await fetch(
        'http://localhost:3000/inser/cliente/cantidadCitas',
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
        'http://localhost:3000/inser/cliente/citasPendientes',
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
        'http://localhost:3000/inser/cliente/citasComfirmadas',
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
        'http://localhost:3000/inser/cliente/citasFinalizadas',
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
        'http://localhost:3000/inser/cliente/citaRealizar',
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
        'http://localhost:3000/inser/cliente/ultimasCitas',
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
        'http://localhost:3000/inser/cliente/fidelizacion',
        { credentials: "include" }
      );

      const data = await response.json();

      if (response.ok) {
        setFidelizacion({
          saldo_puntos: Number(data.saldo_puntos) || 0,
          descuentoDisponible: Number(data.descuentoDisponible) || 0,
          descuentoMaximo: Number(data.descuentoMaximo) || 15000,
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

  async function obtenerResenas() {
    try {
      const response = await fetch(
        'http://localhost:3000/inser/cliente/resenas',
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
        'http://localhost:3000/inser/cliente/citasParaResena',
        { credentials: "include" }
      );

      const data = await response.json();

      if (!response.ok) {
        SetMessage(data.message);
        return;
      }

      const citas = Array.isArray(data) ? data : data.citas || [];

      const responseResenas = await fetch(
        'http://localhost:3000/inser/cliente/resenas',
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

  async function crearResena() {
    if (!citaSeleccionada) {
      SetMessage('Selecciona una cita para calificar');
      return;
    }

    if (calificacion === 0) {
      SetMessage('Selecciona una calificación');
      return;
    }

    try {
      const response = await fetch(
        'http://localhost:3000/inser/cliente/resenas',
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
          `${data.message}. Ganaste ${data.puntos_ganados ?? 20} puntos.`
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
    }
  }

  useEffect(() => {
    cantidadCitas();
    citasPendientes();
    citasComfirmadas();
    citasFinalizadas();
    citasRealizar();
    ultimasCitas();
    obtenerFidelizacion();
    obtenerResenas();
    prepararCitasParaResena();
  }, []);

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
        <h2 className="logo">JC Alta Peluqueria</h2>

        <button onClick={() => navegarPerfil("/citas")}>
          Mis citas
        </button>

        <button onClick={() => navegarPerfil("/cita")}>
          Agendar cita
        </button>

        <button onClick={() => navegarPerfil("/perfil")}>
          Mi perfil
        </button>

        <button onClick={() => perfilId ? navigate("/admin") : navigate("/login")}>
          Cerrar sesión
        </button>

        <button
          onClick={() =>
            document.getElementById('fidelizacion')?.scrollIntoView({
              behavior: 'smooth'
            })
          }
        >
          Mis puntos
        </button>

        <button
          onClick={() =>
            document.getElementById('resenas')?.scrollIntoView({
              behavior: 'smooth'
            })
          }
        >
          Calificar servicio
        </button>
      </aside>

      <main className="contenido">
        <div className="bienvenida">
          <p>Bienvenido a tu panel de JC Alta Peluqueria 👋</p>
        </div>

        {message && (
          <p className="cliente-message">{message}</p>
        )}

        <div className="cards">
          <div className="card">
            <h4>Total de citas</h4>
            <h2>{cantidad}</h2>
            <span>Todas tus citas</span>
          </div>

          <div className="card naranja">
            <h4>Pendientes</h4>
            <h2>{pendientes}</h2>
            <span>Por confirmar</span>
          </div>

          <div className="card verde">
            <h4>Confirmadas</h4>
            <h2>{confirmadas}</h2>
            <span>Próximas citas</span>
          </div>

          <div className="card azul">
            <h4>Finalizadas</h4>
            <h2>{finalizadas}</h2>
            <span>Completadas</span>
          </div>
        </div>

        <div className="panel-superior">
          <div className="citas-realizar">
            <h4>📅 Próxima cita</h4>

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
              <span className="estado">
                {realizar?.estado || "Sin cita"}
              </span>
            </div>
          </div>

          <div className="acciones">
            <button
              className="accion"
              onClick={() => navegarPerfil("/cita")}
            >
              📅
              <div>
                <h3>Agendar nueva cita</h3>
                <p>Reserva tu próximo servicio</p>
              </div>
            </button>

            <button
              className="accion"
              onClick={() => navegarPerfil("/citas")}
            >
              📋
              <div>
                <h3>Ver mis citas</h3>
                <p>Consulta tu historial completo</p>
              </div>
            </button>

            <button
              className="accion"
              onClick={() => navegarPerfil("/perfil")}
            >
              👤
              <div>
                <h3>Editar mi perfil</h3>
                <p>Actualiza tus datos personales</p>
              </div>
            </button>
          </div>
        </div>

        <section className="fidelizacion" id="fidelizacion">
          <div className="fidelizacion-cabecera">
            <div>
              <span className="fidelizacion-etiqueta">
                PROGRAMA DE BENEFICIOS
              </span>

              <h2>Velure Rewards</h2>

              <p>Cada visita te acerca a nuevos beneficios.</p>
            </div>

            <div className="fidelizacion-icono">✨</div>
          </div>

          <div className="puntos-resumen">
            <div>
              <span>Mis puntos disponibles</span>

              <h2>{fidelizacion.saldo_puntos}</h2>

              <p>Puntos acumulados en tus servicios y reseñas</p>
            </div>

            <div className="puntos-icono">★</div>
          </div>

          <div className="descuento-disponible">
            <h3>Mi descuento disponible</h3>

            <h2>{fidelizacion.descuentoDisponible}%</h2>

            {fidelizacion.descuentoDisponible === 0 ? (
              <p>
                Acumula 100 puntos para desbloquear tu primer descuento.
              </p>
            ) : (
              <p>
                Tienes disponible un descuento del{' '}
                {fidelizacion.descuentoDisponible}% en servicios.
                El ahorro máximo es de $
                {fidelizacion.descuentoMaximo.toLocaleString('es-CO')} COP
                por cita.
              </p>
            )}

            <div className="niveles-descuento">
              <div>
                <strong>100 puntos</strong>
                <span>5% de descuento</span>
              </div>

              <div>
                <strong>200 puntos</strong>
                <span>10% de descuento</span>
              </div>

              <div>
                <strong>400 puntos</strong>
                <span>15% de descuento</span>
              </div>
            </div>

            <p>
              El descuento se muestra como beneficio disponible.
              El canje todavía debe realizarse al reservar o pagar.
            </p>
          </div>

          <div className="como-ganar-puntos">
            <h3>¿Cómo ganar puntos?</h3>

            <div className="beneficio-puntos">
              <span>✂️</span>

              <div>
                <h4>Finaliza tus servicios</h4>
                <p>
                  Acumula puntos según las reglas de fidelización del negocio.
                </p>
              </div>
            </div>

            <div className="beneficio-puntos">
              <span>⭐</span>

              <div>
                <h4>Comparte tu experiencia</h4>
                <p>Gana 20 puntos al publicar una reseña válida.</p>
              </div>
            </div>
          </div>

          <div className="historial-puntos">
            <h3>Historial de puntos</h3>

            {fidelizacion.historial.length === 0 ? (
              <p className="sin-puntos">
                Todavía no tienes movimientos de puntos.
                ¡Completa las acciones del programa para comenzar!
              </p>
            ) : (
              fidelizacion.historial.map((movimiento) => (
                <div
                  className="movimiento-puntos"
                  key={movimiento.id}
                >
                  <div className="movimiento-icono">
                    {movimiento.tipo === 'canje' ? '🎁' : '✨'}
                  </div>

                  <div className="movimiento-info">
                    <h4>
                      {movimiento.descripcion || 'Movimiento de puntos'}
                    </h4>

                    <span>
                      {movimiento.fecha_creacion
                        ? new Date(
                            movimiento.fecha_creacion
                          ).toLocaleDateString('es-CO')
                        : ''}
                    </span>
                  </div>

                  <strong
                    className={
                      movimiento.tipo === 'canje'
                        ? 'puntos-restados'
                        : 'puntos-ganados'
                    }
                  >
                    {movimiento.tipo === 'canje' ? '-' : '+'}
                    {movimiento.puntos}
                  </strong>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="formulario-resena" id="resenas">
          <h2>Califica tu servicio</h2>

          <p>Comparte tu experiencia y gana 20 puntos.</p>

          {citasParaResena.length === 0 ? (
            <p>No tienes citas pendientes por calificar.</p>
          ) : (
            <>
              <label htmlFor="cita-resena">
                Cita finalizada
              </label>

              <select
                id="cita-resena"
                value={citaSeleccionada}
                onChange={(e) => setCitaSeleccionada(e.target.value)}
              >
                <option value="">Seleccionar cita</option>

                {citasParaResena.map((cita) => (
                  <option key={cita.id} value={cita.id}>
                    {cita.Servicio?.nombre || "Servicio"} -{' '}
                    {cita.fecha?.split("T")[0]}
                  </option>
                ))}
              </select>

              <label>Calificación</label>

              <div className="estrellas-resena">
                {[1, 2, 3, 4, 5].map((estrella) => (
                  <button
                    key={estrella}
                    type="button"
                    className={
                      estrella <= calificacion ? "seleccionada" : ""
                    }
                    onClick={() => setCalificacion(estrella)}
                    aria-label={`${estrella} estrellas`}
                  >
                    {estrella <= calificacion ? "★" : "☆"}
                  </button>
                ))}
              </div>

              <p>{calificacion} de 5 estrellas</p>

              <label htmlFor="comentario-resena">
                Comentario (opcional)
              </label>

              <textarea
                id="comentario-resena"
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                maxLength={500}
                placeholder="Cuéntanos cómo fue tu experiencia..."
              />

              <button
                type="button"
                onClick={crearResena}
                disabled={!citaSeleccionada || calificacion === 0}
              >
                Publicar reseña
              </button>
            </>
          )}

          <div className="resenas-publicadas">
            <h3>Mis reseñas publicadas</h3>

            {resenas.length === 0 ? (
              <p>Aún no has publicado reseñas.</p>
            ) : (
              resenas.map((resena) => (
                <div key={resena.id}>
                  <p>
                    {"★".repeat(resena.calificacion)}
                    {"☆".repeat(5 - resena.calificacion)}
                  </p>

                  <p>{resena.comentario || "Sin comentario"}</p>

                  <span>
                    {resena.fecha_creacion
                      ? new Date(
                          resena.fecha_creacion
                        ).toLocaleDateString('es-CO')
                      : ''}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default Cliente;
