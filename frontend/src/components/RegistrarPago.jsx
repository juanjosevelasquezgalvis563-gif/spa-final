import { useCallback, useEffect, useState } from "react";
import { API_ROOT } from "../lib/api";

function fechaLocalActual() {
    const fecha = new Date();
    const ajuste = fecha.getTimezoneOffset() * 60000;
    return new Date(fecha.getTime() - ajuste).toISOString().slice(0, 10);
}

function formatoCOP(valor) {
    return "$" + (Number(valor) || 0).toLocaleString("es-CO") + " COP";
}

export default function RegistrarPago({ rol, empleadoId = null }) {
    const baseRuta = rol === "administrador" ? "administrador" : "empleado";
    const [citas, setCitas] = useState([]);
    const [montoPorCita, setMontoPorCita] = useState({});
    const [fechaPago, setFechaPago] = useState(fechaLocalActual);
    const [cargando, setCargando] = useState(true);
    const [guardandoId, setGuardandoId] = useState(null);
    const [mensaje, setMensaje] = useState("");
    const [esError, setEsError] = useState(false);

    const obtenerCitas = useCallback(async (signal, limpiarMensaje = true) => {
        setCargando(true);
        if (limpiarMensaje) {
            setMensaje("");
            setEsError(false);
        }
        try {
            const params = new URLSearchParams();
            if (empleadoId != null && String(empleadoId).trim()) {
                params.set("empleado_id", String(empleadoId));
            }
            const query = params.toString();
            const response = await fetch(API_ROOT + "/inser/" + baseRuta + "/citasFinalizadasPago" + (query ? `?${query}` : ""), {
                credentials: "include",
                signal
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.message || "No se pudieron cargar las citas finalizadas.");
            if (!Array.isArray(data)) throw new Error("No pudimos cargar las citas finalizadas. Inténtalo de nuevo.");
            const pendientes = data.filter((cita) =>
                cita.estado === "finalizada" &&
                !cita.pago_completo &&
                (cita.precio_pendiente_por_definir || Number(cita.saldo_pendiente) > 0)
            );
            setCitas(pendientes);
            setMontoPorCita((actuales) => Object.fromEntries(pendientes.map((cita) => {
                const saldo = Math.max(0, Number(cita.saldo_pendiente) || 0);
                const anterior = Number(actuales[cita.id]);
                if (cita.servicio_sin_precio_fijo) {
                    return [cita.id, ""];
                }
                const monto = anterior > 0 && anterior <= saldo ? String(anterior) : (saldo > 0 ? String(saldo) : "");
                return [cita.id, monto];
            })));
        } catch (error) {
            if (error.name !== "AbortError") {
                setMensaje("No pudimos cargar las citas finalizadas. Inténtalo de nuevo.");
                setEsError(true);
                setCitas([]);
            }
        } finally {
            if (!signal?.aborted) setCargando(false);
        }
    }, [baseRuta, empleadoId]);

    useEffect(() => {
        const controller = new AbortController();
        obtenerCitas(controller.signal);
        return () => controller.abort();
    }, [obtenerCitas]);

    useEffect(() => {
        if (!mensaje) return undefined;
        const temporizador = window.setTimeout(() => {
            setMensaje("");
            setEsError(false);
        }, 4000);
        return () => window.clearTimeout(temporizador);
    }, [mensaje]);

    async function registrar(cita) {
        if (guardandoId !== null) return;
        const precioPendientePorDefinir = Boolean(cita.precio_pendiente_por_definir);
        const saldoPendiente = Math.max(0, Number(cita.saldo_pendiente) || 0);
        const montoLocal = Number(montoPorCita[cita.id]);
        if (!fechaPago) {
            setMensaje("Selecciona la fecha en que recibiste el pago.");
            setEsError(true);
            return;
        }
        if (!Number.isFinite(montoLocal) || montoLocal <= 0 || (!precioPendientePorDefinir && montoLocal > saldoPendiente)) {
            setMensaje(precioPendientePorDefinir
                ? "Ingresa el monto local que recibiste."
                : "El monto local debe ser mayor que cero y no puede superar el saldo pendiente.");
            setEsError(true);
            return;
        }

        setGuardandoId(cita.id);
        setMensaje("");
        setEsError(false);
        try {
            const response = await fetch(API_ROOT + "/inser/" + baseRuta + "/registrarPago", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    cita_id: Number(cita.id),
                    monto_local: montoLocal,
                    fecha_pago: fechaPago,
                    ...(empleadoId != null && String(empleadoId).trim()
                        ? { empleado_id: Number(empleadoId) }
                        : {})
                })
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.message || "No se pudo registrar el pago.");

            setMensaje(data.message || "Pago local registrado correctamente.");
            await obtenerCitas(undefined, false);
        } catch (error) {
            setMensaje(error.message || "No pudimos registrar el pago. Revisa tu conexión e inténtalo de nuevo.");
            setEsError(true);
        } finally {
            setGuardandoId(null);
        }
    }

    return (
        <section className="registrar-pago-cita">
            <header className="registrar-pago-panel-head">
                <div>
                    <span>CAJA DEL SALÓN</span>
                    <h2>Registrar pagos</h2>
                    <p>Las citas finalizadas con pagos pendientes aparecen aquí. Registra el monto que recibiste en el local.</p>
                </div>
            </header>

            <div className="registrar-pago-fecha">
                <label htmlFor={"fechaPago-" + baseRuta}>Fecha del pago</label>
                <input
                    id={"fechaPago-" + baseRuta}
                    type="date"
                    value={fechaPago}
                    max={fechaLocalActual()}
                    onChange={(event) => setFechaPago(event.target.value)}
                />
            </div>

            {mensaje && (
                <p className={"registrar-pago-mensaje " + (esError ? "error" : "exito")} role={esError ? "alert" : "status"}>
                    {mensaje}
                </p>
            )}

            {cargando ? (
                <p className="registrar-pago-estado" role="status">Cargando citas finalizadas…</p>
            ) : citas.length === 0 ? (
                <div className="registrar-pago-vacio">
                    <p>No hay citas finalizadas para registrar pagos.</p>
                </div>
            ) : (
                <div className="registrar-pago-lista">
                    {citas.map((cita) => {
                        const precioPendientePorDefinir = Boolean(cita.precio_pendiente_por_definir);
                        const precioOriginal = Number(cita.precio_original ?? cita.Servicio?.precio) || 0;
                        const descuento = Number(cita.descuento_valor) || 0;
                        const precioFinal = Number(cita.precio_final) || Math.max(0, precioOriginal - descuento);
                        const saldo = Math.max(0, Number(cita.saldo_pendiente) || 0);
                        const pagada = !precioPendientePorDefinir && saldo <= 0;

                        return (
                            <article className="registrar-pago-card" key={cita.id}>
                                <header className="registrar-pago-card-header">
                                    <div>
                                        <span className="registrar-pago-card-kicker">{cita.fecha ? String(cita.fecha).slice(0, 10) : "Fecha no disponible"} · {cita.hora ? String(cita.hora).slice(0, 5) : "Hora no disponible"}</span>
                                        <h3>{cita.Servicio?.nombre || "Servicio"}</h3>
                                    </div>
                                    <span className={"registrar-pago-estado " + (pagada ? "pagada" : "pendiente")}>
                                        {pagada ? "Pagada" : "Finalizada"}
                                    </span>
                                </header>

                                <div className="registrar-pago-info">
                                    <div><strong>Cliente</strong><span>{cita.cliente?.nombre || "No disponible"}</span></div>
                                    <div><strong>Empleado</strong><span>{cita.empleado?.nombre || "No disponible"}</span></div>
                                </div>

                                {cita.servicio_sin_precio_fijo && (
                                    <p className="registrar-pago-nota">
                                        Este servicio no tiene precio fijo. Registra aquí el monto local que recibiste.
                                    </p>
                                )}

                                <div className="registrar-pago-desglose">
                                    <h4>Resumen de pagos</h4>
                                    <div><span>Precio original del servicio</span><strong>{precioPendientePorDefinir ? "A definir" : formatoCOP(precioOriginal)}</strong></div>
                                    {descuento > 0 && (
                                        <div className="registrar-pago-descuento">
                                            <span>Descuento aplicado</span><strong>− {formatoCOP(descuento)}</strong>
                                        </div>
                                    )}
                                    <div><span>Precio final</span><strong>{precioPendientePorDefinir ? "A definir" : formatoCOP(precioFinal)}</strong></div>
                                    <div className="registrar-pago-medio-online"><span>Monto online recibido</span><strong>{formatoCOP(cita.monto_online)}</strong></div>
                                    <div className="registrar-pago-medio-local"><span>{precioPendientePorDefinir ? "Monto local por registrar" : "Monto local pendiente por cobrar"}</span><strong>{precioPendientePorDefinir ? "—" : formatoCOP(cita.monto_local)}</strong></div>
                                    {Number(cita.monto_local_recibido) > 0 && (
                                        <div><span>Monto recibido en el local</span><strong>{formatoCOP(cita.monto_local_recibido)}</strong></div>
                                    )}
                                </div>

                                {!pagada && (
                                    <div className="registrar-pago-accion">
                                        <label htmlFor={"monto-local-" + cita.id}>
                                            {precioPendientePorDefinir || cita.servicio_sin_precio_fijo
                                                ? "Registrar monto local recibido (COP)"
                                                : "Monto local recibido (COP)"}
                                        </label>
                                        <div>
                                            <input
                                                id={"monto-local-" + cita.id}
                                                type="number"
                                                min="0.01"
                                                max={precioPendientePorDefinir ? undefined : saldo}
                                                step="0.01"
                                                value={montoPorCita[cita.id] || ""}
                                                onChange={(event) => setMontoPorCita((actuales) => ({ ...actuales, [cita.id]: event.target.value }))}
                                                placeholder="Ingresa el pago recibido"
                                            />
                                            <button
                                                type="button"
                                                className="registrar-pago-boton"
                                                onClick={() => registrar(cita)}
                                                disabled={guardandoId !== null || Number(montoPorCita[cita.id]) <= 0 || (!precioPendientePorDefinir && Number(montoPorCita[cita.id]) > saldo)}
                                            >
                                                {guardandoId === cita.id ? "Registrando…" : "Registrar pago local"}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

