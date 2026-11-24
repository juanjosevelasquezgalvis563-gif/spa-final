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

export default function RegistrarPago({ rol }) {
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
            const response = await fetch(API_ROOT + "/inser/" + baseRuta + "/citasFinalizadasPago", {
                credentials: "include",
                signal
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.message || "No se pudieron cargar las citas finalizadas.");
            if (!Array.isArray(data)) throw new Error("El servidor devolvi? una lista de citas inv?lida.");
            const pendientes = data.filter((cita) =>
                cita.estado === "finalizada" &&
                !cita.pago_completo &&
                Number(cita.saldo_pendiente) > 0
            );
            setCitas(pendientes);
            setMontoPorCita((actuales) => Object.fromEntries(pendientes.map((cita) => {
                const saldo = Math.max(0, Number(cita.saldo_pendiente) || 0);
                const anterior = Number(actuales[cita.id]);
                const monto = anterior > 0 && anterior <= saldo ? String(anterior) : (saldo > 0 ? String(saldo) : "");
                return [cita.id, monto];
            })));
        } catch (error) {
            if (error.name !== "AbortError") {
                setMensaje(error.message || "No se pudieron cargar las citas finalizadas.");
                setEsError(true);
                setCitas([]);
            }
        } finally {
            if (!signal?.aborted) setCargando(false);
        }
    }, [baseRuta]);

    useEffect(() => {
        const controller = new AbortController();
        obtenerCitas(controller.signal);
        return () => controller.abort();
    }, [obtenerCitas]);

    async function registrar(cita) {
        if (guardandoId !== null) return;
        const saldoPendiente = Math.max(0, Number(cita.saldo_pendiente) || 0);
        const montoLocal = Number(montoPorCita[cita.id]);
        if (!fechaPago) {
            setMensaje("Selecciona la fecha en que recibiste el pago.");
            setEsError(true);
            return;
        }
        if (!Number.isFinite(montoLocal) || montoLocal <= 0 || montoLocal > saldoPendiente) {
            setMensaje("El monto local debe ser mayor que cero y no puede superar el saldo pendiente.");
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
                    fecha_pago: fechaPago
                })
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.message || "No se pudo registrar el pago.");

            setMensaje(data.message || "Pago local registrado correctamente.");
            await obtenerCitas(undefined, false);
        } catch (error) {
            setMensaje(error.message || "Error de conexi?n al registrar el pago.");
            setEsError(true);
        } finally {
            setGuardandoId(null);
        }
    }

    return (
        <section className="registrar-pago-cita">
            <header className="registrar-pago-panel-head">
                <div>
                    <span>CAJA DEL SAL?N</span>
                    <h2>Registrar pagos</h2>
                    <p>Las citas finalizadas aparecen aqu?. Cada registro agrega un movimiento local independiente.</p>
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
                <p className="registrar-pago-estado" role="status">Cargando citas finalizadas?</p>
            ) : citas.length === 0 ? (
                <div className="registrar-pago-vacio">
                    <p>No hay citas finalizadas para registrar pagos.</p>
                </div>
            ) : (
                <div className="registrar-pago-lista">
                    {citas.map((cita) => {
                        const precioOriginal = Number(cita.precio_original ?? cita.Servicio?.precio) || 0;
                        const descuento = Number(cita.descuento_valor) || 0;
                        const precioFinal = Number(cita.precio_final) || Math.max(0, precioOriginal - descuento);
                        const saldo = Math.max(0, Number(cita.saldo_pendiente) || 0);
                        const pagada = saldo <= 0;

                        return (
                            <article className="registrar-pago-card" key={cita.id}>
                                <header className="registrar-pago-card-header">
                                    <div>
                                        <span className="registrar-pago-card-kicker">{cita.fecha ? String(cita.fecha).slice(0, 10) : "Fecha no disponible"} ? {cita.hora ? String(cita.hora).slice(0, 5) : "Hora no disponible"}</span>
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

                                <div className="registrar-pago-desglose">
                                    <h4>Resumen de pagos</h4>
                                    <div><span>Precio original del servicio</span><strong>{formatoCOP(precioOriginal)}</strong></div>
                                    {descuento > 0 && (
                                        <div className="registrar-pago-descuento">
                                            <span>Descuento aplicado</span><strong>?{formatoCOP(descuento)}</strong>
                                        </div>
                                    )}
                                    <div><span>Precio final</span><strong>{formatoCOP(precioFinal)}</strong></div>
                                    <div className="registrar-pago-medio-online"><span>Monto online recibido</span><strong>{formatoCOP(cita.monto_online)}</strong></div>
                                    <div className="registrar-pago-medio-local"><span>Monto local pendiente por cobrar</span><strong>{formatoCOP(cita.monto_local)}</strong></div>
                                    {Number(cita.monto_local_recibido) > 0 && (
                                        <div><span>Monto recibido en el local</span><strong>{formatoCOP(cita.monto_local_recibido)}</strong></div>
                                    )}
                                </div>

                                {!pagada && (
                                    <div className="registrar-pago-accion">
                                        <label htmlFor={"monto-local-" + cita.id}>Monto local recibido (COP)</label>
                                        <div>
                                            <input
                                                id={"monto-local-" + cita.id}
                                                type="number"
                                                min="0.01"
                                                max={saldo}
                                                step="0.01"
                                                value={montoPorCita[cita.id] || ""}
                                                onChange={(event) => setMontoPorCita((actuales) => ({ ...actuales, [cita.id]: event.target.value }))}
                                                placeholder="Ingresa el pago recibido"
                                            />
                                            <button
                                                type="button"
                                                className="registrar-pago-boton"
                                                onClick={() => registrar(cita)}
                                                disabled={guardandoId !== null || Number(montoPorCita[cita.id]) <= 0 || Number(montoPorCita[cita.id]) > saldo}
                                            >
                                                {guardandoId === cita.id ? "Registrando?" : "Registrar pago local"}
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

