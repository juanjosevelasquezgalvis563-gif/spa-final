import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { API_ROOT } from '../lib/api';



export function CitasEmpleado() {
    const [empleado, SetEmpleado] = useState([]);
    const [message, SetMessage] = useState("");
    const [cargando, SetCargando] = useState(true);
    const [errorCarga, SetErrorCarga] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const perfilId = new URLSearchParams(location.search).get("perfilId");




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

    async function finalizar(id) {
        try {
            const response = await fetch(
                `${API_ROOT}/inser/empleado/finalizar/${id}`,
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

    return (
        <div className="empleado-container gestionar-citas">

            {perfilId && (
                <button type="button" className="menu-btn" onClick={() => navigate('/admin')}>
                    Volver al panel administrador
                </button>
            )}

            <header className="gestionar-citas-header">
                <div>
                    <span className="gestionar-citas-eyebrow">AGENDA PROFESIONAL</span>
                    <h1>Gestionar citas</h1>
                    <p>Organiza tu jornada y mantén cada servicio al día.</p>
                </div>
                {!cargando && (
                    <div className="gestionar-citas-total" aria-label={`${empleado.length} citas`}>
                        <strong>{String(empleado.length).padStart(2, "0")}</strong>
                        <span>{empleado.length === 1 ? "cita en agenda" : "citas en agenda"}</span>
                    </div>
                )}
            </header>

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
                    empleado.map((citas) => (
                        <article key={citas.id} className="empleado-card">
                            <div className="cita-agenda-head">
                                <div className="cita-agenda-fecha">
                                    <span>FECHA Y HORA</span>
                                    <strong>{citas.fecha?.split("T")[0] || "Fecha por definir"}</strong>
                                    <time>{citas.hora?.slice(0, 5) || "--:--"}</time>
                                </div>
                                <span className={`estado-cita ${citas.estado?.toLowerCase() || ""}`}>
                                    {citas.estado || "Sin estado"}
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

                            <div className="empleado-botones">
                                <button
                                    className="btn-confirmar"
                                    onClick={() => comfirmar(citas.id)}
                                >
                                    Confirmar
                                </button>
                                <button
                                    className="btn-finalizar"
                                    onClick={() => finalizar(citas.id)}
                                >
                                    Finalizar
                                </button>
                                <button
                                    className="btn-cancelar"
                                    onClick={() => cancelar(citas.id)}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </article>
                    ))
                )}
            </div>

        </div>
    );
}

export default CitasEmpleado;