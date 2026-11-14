import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { API_ROOT } from '../lib/api';

function obtenerFechaHoyKeyLocal(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function formatearDuracion(inicio, fin = Date.now(), mostrarSegundos = false) {
    const inicioMs = new Date(inicio).getTime();
    const finMs = fin instanceof Date
        ? fin.getTime()
        : typeof fin === 'number'
            ? fin
            : new Date(fin).getTime();
    if (!Number.isFinite(inicioMs) || !Number.isFinite(finMs)) return "Duración no disponible";

    const totalSegundos = Math.max(0, Math.floor((finMs - inicioMs) / 1000));
    const horas = Math.floor(totalSegundos / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);
    const segundos = totalSegundos % 60;
    const duracion = horas > 0 ? `${horas} h ${minutos} min` : `${minutos} min`;

    return mostrarSegundos ? `${duracion} ${segundos} s` : duracion;
}


export function CitasEmpleado() {
    const [empleado, SetEmpleado] = useState([]);
    const [message, SetMessage] = useState("");
    const [cargando, SetCargando] = useState(true);
    const [errorCarga, SetErrorCarga] = useState(false);
    const [ahora, setAhora] = useState(Date.now());
    const location = useLocation();
    const navigate = useNavigate();
    const parametros = new URLSearchParams(location.search);
    const perfilId = parametros.get("perfilId");
    const filtro = parametros.get("filtro") || "pendientes";
    const panelInicial = ['pendientes', 'finalizadas', 'canceladas'].includes(filtro)
        ? filtro
        : 'pendientes';

    function cambiarPanel(estado) {
        const parametrosPanel = new URLSearchParams({ filtro: estado });
        if (perfilId) parametrosPanel.set('perfilId', perfilId);
        navigate(`/citasEmpleado?${parametrosPanel.toString()}`);
    }




    async function obtenerEmpleado() {
        SetCargando(true);
        SetErrorCarga(false);
        try {
            const response = await fetch(`${API_ROOT}/inser/empleado`, {
                method: "GET",
                credentials:'include',
            });

            const data = await response.json();
            if (!response.ok) {
                SetErrorCarga(true);
                SetEmpleado([]);
                SetMessage(data.message || "No se pudieron cargar las citas.");
                return;
            }

            if (!Array.isArray(data)) {
                SetErrorCarga(true);
                SetEmpleado([]);
                SetMessage("La respuesta del servidor no contiene una lista de citas.");
                return;
            }

            SetEmpleado(data);
        } catch (error) {
            SetErrorCarga(true);
            SetEmpleado([]);
            SetMessage('Error de conexión con el servidor');
        } finally {
            SetCargando(false);
        }
    }

    useEffect(() => {
        obtenerEmpleado();
    }, []);

    const hayCitaEnCurso = empleado.some((cita) => cita.estado?.toLowerCase() === 'en_curso');

    useEffect(() => {
        if (!hayCitaEnCurso) return undefined;

        const temporizador = window.setInterval(() => setAhora(Date.now()), 1000);
        return () => window.clearInterval(temporizador);
    }, [hayCitaEnCurso]);

    useEffect(() => {
        if (!message) return;

        const temporizador = setTimeout(() => {
            SetMessage("");
        }, 4000);

        return () => clearTimeout(temporizador);
    }, [message]);

    async function comfirmar(id) {
        try {
            const response = await fetch(
                `${API_ROOT}/inser/empleado/comfirmar/${id}`,
                {
                    method: "PUT",
                    credentials:'include',
                }
            );

            const data = await response.json();

            if (response.ok) {
                SetMessage(data.message);
                obtenerEmpleado();
            }else{
                SetMessage(data.message);
            }

        } catch (error) {
            SetMessage('Error de conexión con el servidor');
        }
    }

    async function comenzar(id) {
        try {
            const response = await fetch(
                `${API_ROOT}/inser/empleado/comenzar/${id}`,
                {
                    method: "PUT",
                    credentials: 'include',
                }
            );

            const data = await response.json();

            if (response.ok) {
                SetMessage(data.message);
                setAhora(Date.now());
                await obtenerEmpleado();
            } else {
                SetMessage(data.message || 'No se pudo comenzar el servicio.');
            }
        } catch (error) {
            SetMessage('Error de conexión con el servidor');
        }
    }

    async function finalizar(id) {
        try {
            const response = await fetch(
                `${API_ROOT}/inser/empleado/finalizar/${id}`,
                {
                    method: "PUT",
                    credentials: 'include',
                }
            );

            const data = await response.json();

            if (response.ok) {
                SetMessage(data.message);
                await obtenerEmpleado();
                const parametrosFinalizadas = new URLSearchParams({ filtro: 'finalizadas' });
                if (perfilId) parametrosFinalizadas.set('perfilId', perfilId);
                navigate(`/citasEmpleado?${parametrosFinalizadas.toString()}`);
            } else {
                SetMessage(data.message);
            }
        } catch (error) {
            SetMessage('Error de conexión con el servidor');
        }
    }

    async function cancelar(id) {
        try {
            const response = await fetch(
                `${API_ROOT}/inser/empleado/cancelar/${id}`,
                {
                    method: "PUT",
                    credentials:'include',
                }
            );

            const data = await response.json();

            if (response.ok) {
                SetMessage(data.message);
                obtenerEmpleado();
            }else{
                SetMessage(data.message);
            }

        } catch (error) {
            SetMessage('Error de conexión con el servidor');
        }
    }

    const seccionesCitas = [
        {
            estado: 'pendientes',
            titulo: 'Pendientes',
            citas: empleado.filter((cita) => ['pendiente', 'confirmada', 'en_curso'].includes(cita.estado?.toLowerCase())),
        },
        {
            estado: 'finalizadas',
            titulo: 'Finalizadas',
            citas: empleado.filter((cita) => cita.estado?.toLowerCase() === 'finalizada'),
        },
        {
            estado: 'canceladas',
            titulo: 'Canceladas',
            citas: empleado.filter((cita) => cita.estado?.toLowerCase() === 'cancelada'),
        },
    ].map((seccion) => ({
        ...seccion,
        citas: filtro === 'hoy'
            ? seccion.citas.filter((cita) => cita.fecha?.slice(0, 10) === obtenerFechaHoyKeyLocal())
            : seccion.citas,
    })).filter((seccion) => seccion.estado === panelInicial);

    function renderCita(citas) {
        return (
            <article key={citas.id} className="empleado-card">
                <div className="cita-agenda-head">
                    <div className="cita-agenda-fecha">
                        <span>FECHA Y HORA</span>
                        <strong>{citas.fecha?.split("T")[0] || "Fecha por definir"}</strong>
                        <time>{citas.hora?.slice(0, 5) || "--:--"}</time>
                    </div>
                    <span className={`estado-cita ${citas.estado?.toLowerCase() || ""}`}>
                        {citas.estado?.toLowerCase() === 'en_curso' ? 'En curso' : citas.estado || "Sin estado"}
                    </span>
                </div>

                <div className="cita-agenda-detalles">
                    <p>
                        <strong>Cliente</strong>
                        <span>{citas.cliente?.nombre || "Cliente sin nombre"}</span>
                    </p>
                    <p>
                        <strong>Servicio</strong>
                        <span>{citas.Servicio?.nombre || "Servicio no disponible"}</span>
                    </p>
                </div>

                {citas.estado?.toLowerCase() === 'en_curso' && citas.inicio_atencion && (
                    <div className="cita-tiempo-servicio cita-tiempo-en-curso" role="timer" aria-live="off">
                        <span>Tiempo transcurrido</span>
                        <strong>{formatearDuracion(citas.inicio_atencion, ahora, true)}</strong>
                    </div>
                )}

                {citas.estado?.toLowerCase() === 'finalizada' && citas.inicio_atencion && citas.fin_atencion && (
                    <div className="cita-tiempo-servicio cita-tiempo-finalizado">
                        <span>Duración del servicio</span>
                        <strong>{formatearDuracion(citas.inicio_atencion, citas.fin_atencion)}</strong>
                    </div>
                )}

                {['pendiente', 'confirmada', 'en_curso'].includes(citas.estado?.toLowerCase()) && (
                    <div className="empleado-botones">
                        <button
                            className="btn-confirmar"
                            onClick={() => comfirmar(citas.id)}
                            disabled={citas.estado?.toLowerCase() !== 'pendiente'}
                        >
                            Confirmar
                        </button>
                        <button
                            className="btn-cancelar"
                            onClick={() => cancelar(citas.id)}
                            disabled={citas.estado?.toLowerCase() === 'en_curso'}
                        >
                            Cancelar
                        </button>
                        <button
                            className="btn-confirmar"
                            onClick={() => comenzar(citas.id)}
                            disabled={citas.estado?.toLowerCase() !== 'confirmada'}
                        >
                            Comenzar
                        </button>
                        <button
                            className="btn-finalizar"
                            onClick={() => finalizar(citas.id)}
                            disabled={citas.estado?.toLowerCase() !== 'en_curso'}
                        >
                            Finalizar
                        </button>
                    </div>
                )}
            </article>
        );
    }

    return (
        <div className="empleado-container gestionar-citas">

            {perfilId && (
                <button type="button" className="menu-btn" onClick={() => navigate('/admin')}>
                    Volver al panel administrador
                </button>
            )}
            <button type="button" className="menu-btn" onClick={() => navigate('/')}>
                Página principal
            </button>

            <header className="gestionar-citas-header">
                <div>
                    <span className="gestionar-citas-eyebrow">AGENDA PROFESIONAL</span>
                    <h1>Gestionar citas</h1>
                    <p>Organiza tu jornada y mantén cada servicio al día.</p>
                </div>
            </header>

            <nav className="gestionar-citas-filtros" aria-label="Filtrar citas por estado">
                {[
                    { estado: 'pendientes', titulo: 'Pendientes' },
                    { estado: 'finalizadas', titulo: 'Finalizadas' },
                    { estado: 'canceladas', titulo: 'Canceladas' },
                ].map((opcion) => (
                    <button
                        key={opcion.estado}
                        type="button"
                        className={panelInicial === opcion.estado ? 'activo' : ''}
                        aria-pressed={panelInicial === opcion.estado}
                        onClick={() => cambiarPanel(opcion.estado)}
                    >
                        {opcion.titulo}
                    </button>
                ))}
            </nav>

            {message && (
                <div className="mensaje-cita" role="status" aria-live="polite">
                    {message}
                </div>
            )}

            <div className="empleado-lista">
                {cargando ? (
                    <div className="gestionar-citas-vacio" role="status">
                        <span className="gestionar-citas-vacio-icono" aria-hidden="true">···</span>
                        <h2>Cargando agenda</h2>
                        <p>Estamos organizando tus citas.</p>
                    </div>
                ) : errorCarga ? (
                    <div className="gestionar-citas-vacio" role="alert">
                        <span className="gestionar-citas-vacio-icono" aria-hidden="true">!</span>
                        <h2>No se pudo cargar la agenda</h2>
                        <p>Intenta actualizar la página en unos momentos.</p>
                    </div>
                ) : empleado.length === 0 ? (
                    <div className="gestionar-citas-vacio">
                        <span className="gestionar-citas-vacio-icono" aria-hidden="true">—</span>
                        <h2>Tu agenda está despejada</h2>
                        <p>Cuando tengas citas asignadas, aparecerán aquí.</p>
                    </div>
                ) : (
                    <div className="agenda-estados-grid">
                        {seccionesCitas.map((seccion) => (
                            <section className="agenda-estado-panel" key={seccion.estado}>
                                <header className="agenda-estado-panel-header">
                                    <span className="agenda-estado-panel-titulo">{seccion.titulo}</span>
                                </header>
                                <div className="agenda-estado-panel-contenido" id={`citas-${seccion.estado}`}>
                                    {seccion.citas.length > 0 ? (
                                        <div className="agenda-estado-panel-citas">
                                            {seccion.citas.map(renderCita)}
                                        </div>
                                    ) : (
                                        <p className="agenda-estado-vacio">No hay citas {seccion.titulo.toLowerCase()}.</p>
                                    )}
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
}

export default CitasEmpleado;