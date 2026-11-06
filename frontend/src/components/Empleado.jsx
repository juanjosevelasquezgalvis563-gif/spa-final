import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const API_URL = "http://localhost:3000/inser/empleado";

async function obtenerJson(ruta) {
    const url = ruta ? `${API_URL}/${ruta}` : API_URL;
    const response = await fetch(url, {
        method: "GET",
        credentials: "include"
    });

    let data;
    try {
        data = await response.json();
    } catch {
        throw new Error("El servidor devolvió una respuesta inválida.");
    }

    if (!response.ok) {
        throw new Error(data.message || "No se pudo cargar el panel.");
    }

    return data;
}

function obtenerFechaKey(fecha) {
    return typeof fecha === "string" ? fecha.slice(0, 10) : "";
}

function formatearFecha(fecha) {
    const fechaKey = obtenerFechaKey(fecha);
    if (!fechaKey) return "Fecha por definir";

    const fechaLocal = new Date(`${fechaKey}T12:00:00`);
    return new Intl.DateTimeFormat("es-CO", {
        day: "numeric",
        month: "long",
        year: "numeric"
    }).format(fechaLocal);
}

function formatearHora(hora) {
    return typeof hora === "string" ? hora.slice(0, 5) : "--:--";
}

export function Empleado() {
    const [resumen, setResumen] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [message, setMessage] = useState("");

    const navigate = useNavigate();
    const location = useLocation();
    const perfilId = new URLSearchParams(location.search).get("perfilId");
    const perfilPath = (path) => perfilId ? `${path}?perfilId=${encodeURIComponent(perfilId)}` : path;
    const fechaActual = new Date();
    const hoyKey = fechaActual.toISOString().slice(0, 10);
    const hoyLabel = new Intl.DateTimeFormat("es-CO", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC"
    }).format(fechaActual);

    const cargarPanel = useCallback(async () => {
        setCargando(true);
        setMessage("");

        try {
            const [hoy, pendientes, finalizadas, proxima, citas] = await Promise.all([
                obtenerJson("citasHoy"),
                obtenerJson("citasPendientesEmpleado"),
                obtenerJson("citasFinalizadasEmpleado"),
                obtenerJson("citaRealizarEmpleado"),
                obtenerJson("")
            ]);

            if (!Array.isArray(citas)) {
                throw new Error("La respuesta del servidor no contiene una agenda válida.");
            }

            setResumen({
                citasHoy: Number(hoy.Hoy) || 0,
                pendientes: Number(pendientes) || 0,
                finalizadas: Number(finalizadas) || 0,
                proxima,
                agendaHoy: citas
                    .filter((cita) =>
                        obtenerFechaKey(cita.fecha) === hoyKey
                        && cita.estado?.toLowerCase() !== "cancelada"
                    )
                    .sort((a, b) => formatearHora(a.hora).localeCompare(formatearHora(b.hora)))
            });
        } catch (error) {
            setMessage(error.message || "No se pudo cargar el panel del empleado.");
        } finally {
            setCargando(false);
        }
    }, [hoyKey]);

    useEffect(() => {
        const temporizador = window.setTimeout(cargarPanel, 0);
        return () => window.clearTimeout(temporizador);
    }, [cargarPanel]);

    async function cerrarSesion() {
        if (perfilId) {
            navigate("/admin");
            return;
        }

        try {
            const response = await fetch("http://localhost:3000/inser/logout", {
                method: "POST",
                credentials: "include"
            });

            if (!response.ok) {
                throw new Error("No se pudo cerrar la sesión.");
            }

            localStorage.removeItem("user");
            navigate("/login");
        } catch (error) {
            setMessage(error.message || "Error de conexión al cerrar sesión.");
        }
    }

    return (
        <div className="layout-dashboard empleado-dashboard">
            <aside className="sidebar">
                <div className="empleado-sidebar-brand">
                    <span className="empleado-brand-mark" aria-hidden="true">JC</span>
                    <div>
                        <span className="empleado-sidebar-kicker">ESTUDIO</span>
                        <h1 className="sidebar-title">JC Alta<br />Peluquería</h1>
                    </div>
                </div>

                <nav className="sidebar-menu" aria-label="Navegación del empleado">
                    <button
                        className="empleado-menu-active"
                        type="button"
                        onClick={() => navigate(perfilPath("/empleado"))}
                    >
                        <span className="empleado-menu-indicator" aria-hidden="true">01</span>
                        Resumen
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate(perfilPath("/citasEmpleado"))}
                    >
                        <span className="empleado-menu-indicator" aria-hidden="true">02</span>
                        Gestionar mis citas
                    </button>
                    <button type="button" onClick={cerrarSesion}>
                        <span className="empleado-menu-indicator" aria-hidden="true">03</span>
                        {perfilId ? "Volver al panel administrador" : "Cerrar sesión"}
                    </button>
                </nav>

                <div className="empleado-sidebar-footer">
                    <span className="empleado-online-dot" aria-hidden="true" />
                    <span>Espacio de trabajo</span>
                </div>
            </aside>

            <main className="main-content">
                <section className="empleado-welcome">
                    <div className="empleado-welcome-copy">
                        <span className="empleado-eyebrow">PANEL DEL EQUIPO</span>
                        <h2>Tu jornada, en orden.</h2>
                        <p>Un resumen claro para que puedas enfocarte en cada cliente.</p>
                    </div>
                    <div className="empleado-today">
                        <span className="empleado-today-mark" aria-hidden="true">HOY</span>
                        <time dateTime={hoyKey}>{hoyLabel}</time>
                    </div>
                    <span className="empleado-welcome-watermark" aria-hidden="true">JC</span>
                </section>

                {message && (
                    <div className="empleado-message" role="alert">
                        <span>{message}</span>
                        {!resumen && (
                            <button type="button" onClick={cargarPanel}>
                                Intentar de nuevo
                            </button>
                        )}
                    </div>
                )}

                <section className="empleado-stats" aria-label="Resumen de citas">
                    <article className="empleado-stat-card empleado-stat-primary">
                        <div className="empleado-stat-topline">
                            <span>CITAS DE HOY</span>
                            <span className="empleado-stat-icon" aria-hidden="true">01</span>
                        </div>
                        <strong>{cargando ? "—" : resumen?.citasHoy ?? "—"}</strong>
                        <p>Por atender durante la jornada</p>
                    </article>
                    <article className="empleado-stat-card">
                        <div className="empleado-stat-topline">
                            <span>PENDIENTES</span>
                            <span className="empleado-stat-icon" aria-hidden="true">02</span>
                        </div>
                        <strong>{cargando ? "—" : resumen?.pendientes ?? "—"}</strong>
                        <p>Esperan confirmación</p>
                    </article>
                    <article className="empleado-stat-card">
                        <div className="empleado-stat-topline">
                            <span>FINALIZADAS</span>
                            <span className="empleado-stat-icon" aria-hidden="true">03</span>
                        </div>
                        <strong>{cargando ? "—" : resumen?.finalizadas ?? "—"}</strong>
                        <p>Servicios completados</p>
                    </article>
                </section>

                <section className="empleado-feature-grid">
                    <article className="empleado-next-card">
                        <div className="empleado-section-heading">
                            <div>
                                <span className="empleado-section-kicker">SIGUIENTE EN TU AGENDA</span>
                                <h3>Próxima cita</h3>
                            </div>
                            <span className="empleado-heading-mark" aria-hidden="true">↗</span>
                        </div>

                        {cargando ? (
                            <div className="empleado-next-empty">Cargando los detalles de tu próxima cita…</div>
                        ) : message && !resumen ? (
                            <div className="empleado-next-empty">No se pudo consultar la próxima cita.</div>
                        ) : resumen?.proxima ? (
                            <div className="empleado-next-content">
                                <div className="empleado-next-time">
                                    <strong>{formatearHora(resumen.proxima.hora)}</strong>
                                    <span>{formatearFecha(resumen.proxima.fecha)}</span>
                                </div>
                                <div className="empleado-next-details">
                                    <span className="empleado-next-status">
                                        {resumen.proxima.estado || "Cita programada"}
                                    </span>
                                    <h4>{resumen.proxima.cliente?.nombre || "Cliente"}</h4>
                                    <p>{resumen.proxima.Servicio?.nombre || "Servicio por confirmar"}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="empleado-next-empty">
                                No tienes citas pendientes por atender. Disfruta el espacio entre servicios.
                            </div>
                        )}

                        <button
                            type="button"
                            className="empleado-text-link"
                            onClick={() => navigate(perfilPath("/citasEmpleado"))}
                        >
                            Ver agenda completa <span aria-hidden="true">→</span>
                        </button>
                    </article>

                    <aside className="empleado-quick-card">
                        <span className="empleado-section-kicker">ACCESO RÁPIDO</span>
                        <div className="empleado-quick-icon" aria-hidden="true">↗</div>
                        <h3>Gestiona tu agenda</h3>
                        <p>Confirma citas, consulta los servicios y mantén cada turno actualizado.</p>
                        <button
                            type="button"
                            onClick={() => navigate(perfilPath("/citasEmpleado"))}
                        >
                            Abrir gestión de citas <span aria-hidden="true">→</span>
                        </button>
                    </aside>
                </section>

                <section className="empleado-agenda-card">
                    <div className="empleado-section-heading">
                        <div>
                            <span className="empleado-section-kicker">VISTA DEL DÍA</span>
                            <h3>Agenda de hoy</h3>
                        </div>
                        <span className="empleado-agenda-count">
                            {cargando ? "…" : `${resumen?.agendaHoy.length || 0} ${resumen?.agendaHoy.length === 1 ? "turno" : "turnos"}`}
                        </span>
                    </div>

                    {cargando ? (
                        <div className="empleado-agenda-empty">Cargando los turnos de hoy…</div>
                    ) : message && !resumen ? (
                        <div className="empleado-agenda-empty">No se pudo cargar la agenda del día.</div>
                    ) : resumen?.agendaHoy.length ? (
                        <div className="empleado-agenda-list">
                            {resumen.agendaHoy.map((cita) => (
                                <article className="empleado-agenda-row" key={cita.id}>
                                    <time className="empleado-agenda-time">{formatearHora(cita.hora)}</time>
                                    <span className="empleado-agenda-rule" aria-hidden="true" />
                                    <div className="empleado-agenda-client">
                                        <strong>{cita.cliente?.nombre || "Cliente"}</strong>
                                        <span>{cita.Servicio?.nombre || "Servicio por confirmar"}</span>
                                    </div>
                                    <span className={`empleado-agenda-status ${cita.estado?.toLowerCase() || ""}`}>
                                        {cita.estado || "Programada"}
                                    </span>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <div className="empleado-agenda-empty">
                            <strong>Tu agenda está despejada por ahora.</strong>
                            <span>Cuando tengas citas para hoy, aparecerán aquí.</span>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}

export default Empleado;
