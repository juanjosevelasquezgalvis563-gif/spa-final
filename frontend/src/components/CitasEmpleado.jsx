import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { API_ROOT } from '../lib/api';

function obtenerFechaHoyKeyLocal(date = new Date()) {
    const partes = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(date);
    const valores = Object.fromEntries(partes.map(({ type, value }) => [type, value]));
    return `${valores.year}-${valores.month}-${valores.day}`;
}

function formatearHoraLocal(hora) {
    const texto = String(hora || '');
    const coincidencia = /(?:^|T)(\d{1,2}):([0-5]\d)/.exec(texto);
    if (!coincidencia) return '--:--';
    const horas24 = Number(coincidencia[1]);
    const hora12 = horas24 % 12 || 12;
    return `${hora12}:${coincidencia[2]} ${horas24 >= 12 ? 'p. m.' : 'a. m.'}`;
}

function formatearFechaSolicitud(fecha) {
    const coincidencia = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(fecha || ''));
    if (!coincidencia) return 'Fecha por definir';
    return new Intl.DateTimeFormat('es-CO', {
        day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC'
    }).format(new Date(`${coincidencia[1]}-${coincidencia[2]}-${coincidencia[3]}T12:00:00Z`));
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
    const [reprogramaciones, setReprogramaciones] = useState([]);
    const [propuestas, setPropuestas] = useState({});
    const [trabajandoSolicitud, setTrabajandoSolicitud] = useState(null);
    const [message, SetMessage] = useState("");
    const [citaPrecioPendiente, setCitaPrecioPendiente] = useState(null);
    const [precioAcordado, setPrecioAcordado] = useState("");
    const [confirmandoId, setConfirmandoId] = useState(null);
    const [reintentandoCorreoId, setReintentandoCorreoId] = useState(null);
    const [guardandoFinalizacion, setGuardandoFinalizacion] = useState(false);
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
                SetMessage("No pudimos cargar tus citas. Inténtalo de nuevo.");
                return;
            }

            SetEmpleado(data);
            try {
                const respuestaSolicitudes = await fetch(`${API_ROOT}/inser/empleado/reprogramaciones`, { credentials: 'include' });
                const solicitudes = await respuestaSolicitudes.json().catch(() => []);
                if (respuestaSolicitudes.ok && Array.isArray(solicitudes)) setReprogramaciones(solicitudes);
            } catch {
                setReprogramaciones([]);
            }
        } catch (error) {
            SetErrorCarga(true);
            SetEmpleado([]);
                SetMessage('No pudimos completar la solicitud. Revisa tu conexión e inténtalo de nuevo.');
        } finally {
            SetCargando(false);
        }
    }

    async function resolverReprogramacion(id, accion) {
        setTrabajandoSolicitud(id);
        try {
            const propuesta = propuestas[id] || {};
            const response = await fetch(`${API_ROOT}/inser/empleado/reprogramaciones/${id}/${accion}`, {
                method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
                ...(accion === 'proponer' ? { body: JSON.stringify(propuesta) } : {})
            });
            const data = await response.json().catch(() => ({}));
            SetMessage(data.message || (response.ok ? 'Solicitud actualizada.' : 'No se pudo actualizar la solicitud.'));
            if (response.ok) await obtenerEmpleado();
        } catch {
            SetMessage('No pudimos completar la solicitud. Revisa tu conexión e inténtalo de nuevo.');
        } finally {
            setTrabajandoSolicitud(null);
        }
    }

    useEffect(() => {
        obtenerEmpleado();
    }, []);

    const hayCorreoEnProceso = empleado.some((cita) => cita.correo_confirmacion_estado === 'pendiente');
    useEffect(() => {
        if (!hayCorreoEnProceso) return undefined;
        let activo = true;
        const consultarEstadoCorreo = async () => {
            try {
                const response = await fetch(`${API_ROOT}/inser/empleado`, {
                    method: 'GET',
                    credentials: 'include',
                });
                const data = await response.json();
                if (activo && response.ok && Array.isArray(data)) SetEmpleado(data);
            } catch {
               
            }
        };
        const temporizador = window.setInterval(consultarEstadoCorreo, 2000);
        return () => {
            activo = false;
            window.clearInterval(temporizador);
        };
    }, [hayCorreoEnProceso]);

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

    async function comfirmar(id, reenviarCorreo = false) {
        if (confirmandoId !== null) return;
        setConfirmandoId(id);
        if (reenviarCorreo) setReintentandoCorreoId(id);
        try {
            const opciones = { method: "PUT", credentials: "include" };
            if (reenviarCorreo) {
                opciones.headers = { "Content-Type": "application/json" };
                opciones.body = JSON.stringify({ reenviar_correo: true });
            }
            const response = await fetch(`${API_ROOT}/inser/empleado/comfirmar/${id}`, opciones);

            const data = await response.json().catch(() => ({}));

            if (response.ok) {
                SetMessage(data.message);
                await obtenerEmpleado();
            }else{
                SetMessage(data.message || "No se pudo confirmar la cita.");
                await obtenerEmpleado();
            }
            setConfirmandoId(null);
            setReintentandoCorreoId(null);

        } catch {
            setConfirmandoId(null);
            setReintentandoCorreoId(null);
            SetMessage('No pudimos completar la solicitud. Revisa tu conexión e inténtalo de nuevo.');
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
            SetMessage('No pudimos completar la solicitud. Revisa tu conexión e inténtalo de nuevo.');
        }
    }

    async function finalizar(id, precioServicio) {
        if (guardandoFinalizacion) return;
        setGuardandoFinalizacion(true);
        try {
            const opciones = {
                method: "PUT",
                credentials: 'include',
            };
            if (precioServicio != null) {
                opciones.headers = { "Content-Type": "application/json" };
                opciones.body = JSON.stringify({ precio_servicio: precioServicio });
            }
            const response = await fetch(
                `${API_ROOT}/inser/empleado/finalizar/${id}`,
                opciones
            );

            const data = await response.json();

            if (response.ok) {
                SetMessage(data.message);
                setCitaPrecioPendiente(null);
                setPrecioAcordado("");
                await obtenerEmpleado();
                const parametrosFinalizadas = new URLSearchParams({ filtro: 'finalizadas' });
                if (perfilId) parametrosFinalizadas.set('perfilId', perfilId);
                navigate(`/citasEmpleado?${parametrosFinalizadas.toString()}`);
            } else {
                SetMessage(data.message);
            }
        } catch {
            SetMessage('No pudimos completar la solicitud. Revisa tu conexión e inténtalo de nuevo.');
        } finally {
            setGuardandoFinalizacion(false);
        }
    }

    function solicitarPrecioParaFinalizar(cita) {
        const precioFijo = Number(cita.Servicio?.precio);
        if (Number.isFinite(precioFijo) && precioFijo > 0) {
            void finalizar(cita.id);
            return;
        }
        setCitaPrecioPendiente(cita);
        setPrecioAcordado("");
    }

    function guardarPrecioYFinalizar(event) {
        event.preventDefault();
        const precio = Number(precioAcordado);
        if (!Number.isFinite(precio) || precio <= 0) {
            SetMessage("Ingresa el precio acordado con el cliente.");
            return;
        }
        void finalizar(citaPrecioPendiente.id, Math.round(precio));
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
            SetMessage('No pudimos completar la solicitud. Revisa tu conexión e inténtalo de nuevo.');
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
                            disabled={confirmandoId !== null || citas.estado?.toLowerCase() !== 'pendiente'}
                        >
                            {confirmandoId === citas.id && reintentandoCorreoId === null ? "Confirmando…" : "Confirmar"}
                        </button>
                        {citas.estado?.toLowerCase() === 'confirmada' && citas.correo_confirmacion_estado === 'pendiente' && (
                            <span role="status">Enviando correo de confirmación…</span>
                        )}
                        {citas.estado?.toLowerCase() === 'confirmada' && citas.correo_confirmacion_estado === 'fallido' && (
                            <button
                                className="btn-confirmar"
                                type="button"
                                onClick={() => comfirmar(citas.id, true)}
                                disabled={confirmandoId !== null}
                            >
                                {reintentandoCorreoId === citas.id ? "Reintentando envío…" : "Reintentar correo"}
                            </button>
                        )}
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
                            onClick={() => solicitarPrecioParaFinalizar(citas)}
                            disabled={guardandoFinalizacion || citas.estado?.toLowerCase() !== 'en_curso'}
                        >
                            {guardandoFinalizacion ? "Finalizando…" : "Finalizar"}
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

            {reprogramaciones.length > 0 && (
                <section className="empleado-card solicitudes-reprogramacion-panel" aria-labelledby="solicitudes-reprogramacion-titulo">
                    <h2 id="solicitudes-reprogramacion-titulo">Solicitudes para reprogramar</h2>
                    {reprogramaciones.map((solicitud) => (
                        <article key={solicitud.id} className="cita-agenda-detalles solicitud-reprogramacion-card">
                            <p><strong>Cliente</strong><span>{solicitud.cliente?.nombre || 'Cliente'}</span></p>
                            <p><strong>Servicio</strong><span>{solicitud.servicio || 'Servicio'}</span></p>
                            <p><strong>Horario solicitado</strong><span>{formatearFechaSolicitud(solicitud.fecha_solicitada)} · {formatearHoraLocal(solicitud.hora_solicitada)}</span></p>
                            {solicitud.mensaje && <p className="solicitud-detalle-mensaje"><strong>Mensaje del cliente</strong><span>{solicitud.mensaje}</span></p>}
                            {solicitud.estado === 'propuesta' ? (
                                <p role="status">Recomendación enviada. La cita mantiene su horario actual; el cliente debe elegir otro horario y enviar una nueva solicitud.</p>
                            ) : <div className="empleado-botones">
                                <button type="button" className="btn-confirmar" disabled={trabajandoSolicitud !== null} onClick={() => resolverReprogramacion(solicitud.id, 'aceptar')}>Aceptar solicitud</button>
                                <label>Recomendación para el cliente <textarea rows={3} maxLength={1000} placeholder="Escribe recomendaciones para que el cliente elija otro horario" value={propuestas[solicitud.id]?.mensaje || ''} onChange={(e) => setPropuestas((prev) => ({ ...prev, [solicitud.id]: { mensaje: e.target.value } }))} /></label>
                                <button type="button" className="btn-confirmar" disabled={trabajandoSolicitud !== null || !propuestas[solicitud.id]?.mensaje?.trim()} onClick={() => resolverReprogramacion(solicitud.id, 'proponer')}>Enviar recomendación</button>
                            </div>}
                        </article>
                    ))}
                </section>
            )}

            {citaPrecioPendiente && (
                <div className="cita-precio-modal-fondo">
                    <section className="cita-precio-modal" role="dialog" aria-modal="true" aria-labelledby="cita-precio-modal-titulo">
                        <span className="cita-precio-modal-etiqueta">Precio del servicio</span>
                        <h2 id="cita-precio-modal-titulo">{citaPrecioPendiente.Servicio?.nombre}</h2>
                        <p>Este servicio no tiene un precio fijo. Acuerda el valor con el cliente en el salón según el estado de su cabello o las necesidades del servicio y regístralo aquí para finalizar la cita.</p>
                        <form onSubmit={guardarPrecioYFinalizar}>
                            <label htmlFor="cita-precio-acordado">Precio acordado</label>
                            <div className="cita-precio-modal-input">
                                <span>$</span>
                                <input
                                    id="cita-precio-acordado"
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={precioAcordado}
                                    onChange={(event) => setPrecioAcordado(event.target.value)}
                                    placeholder="0"
                                    autoFocus
                                    required
                                />
                            </div>
                            <div className="cita-precio-modal-acciones">
                                <button type="button" onClick={() => setCitaPrecioPendiente(null)} disabled={guardandoFinalizacion}>Volver a la cita</button>
                                <button type="submit" disabled={guardandoFinalizacion}>{guardandoFinalizacion ? "Guardando…" : "Guardar precio y finalizar"}</button>
                            </div>
                        </form>
                    </section>
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

