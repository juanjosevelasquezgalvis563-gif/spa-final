
import { useEffect, useState } from "react";
import { API_ROOT } from "../lib/api";

function fechaActual() {
    const fecha = new Date();
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
}

function formatoPrecio(valor) {
    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0
    }).format(Number(valor) || 0);
}

export default function RegistrarPago({ rol }) {
    const baseRuta = rol === "administrador"
        ? "administrador"
        : "empleado";

    const [citas, setCitas] = useState([]);
    const [totales, setTotales] = useState({});
    const [fechaPago, setFechaPago] = useState(fechaActual());
    const [cargando, setCargando] = useState(true);
    const [guardandoId, setGuardandoId] = useState(null);
    const [mensaje, setMensaje] = useState("");
    const [esError, setEsError] = useState(false);

    
    const obtenerCitas = async () => {
        try {
            setCargando(true);
            setMensaje("");
            setEsError(false);

            const respuesta = await fetch(
                `${API_ROOT}/inser/${baseRuta}/citasFinalizadasPago`,
                {
                    method: "GET",
                    credentials: "include"
                }
            );

            const data = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(
                    data.message || "No se pudieron cargar las citas."
                );
            }

            if (!Array.isArray(data)) {
                throw new Error("La respuesta del servidor no es válida.");
            }

            setCitas(data);

        } catch (error) {
            console.error("Error al obtener citas:", error);
            setMensaje(error.message);
            setEsError(true);
            setCitas([]);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        obtenerCitas();
    }, [baseRuta]);

    const cambiarTotal = (citaId, valor) => {
        setTotales((prev) => ({
            ...prev,
            [citaId]: valor
        }));
    };

   
    const registrar = async (cita) => {
        try {
            setMensaje("");
            setEsError(false);

            const totalPago = Number(
                totales[cita.id] ?? cita.Servicio?.precio
            );

            if (!Number.isInteger(Number(cita.id)) || Number(cita.id) <= 0) {
                throw new Error("El ID de la cita no es válido.");
            }

            if (!Number.isFinite(totalPago) || totalPago <= 0) {
                throw new Error("El valor del pago no es válido.");
            }

            if (!fechaPago) {
                throw new Error("Selecciona la fecha del pago.");
            }

            setGuardandoId(cita.id);

            const respuesta = await fetch(
                `${API_ROOT}/inser/${baseRuta}/registrarPago`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        cita_id: Number(cita.id),
                        total_pago: totalPago,
                        fecha_pago: fechaPago
                    })
                }
            );

            const data = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(
                    data.message || "No se pudo registrar el pago."
                );
            }

            setMensaje("Pago registrado correctamente.");
            setEsError(false);

            // Recargar las citas para retirar la que ya fue pagada.
            await obtenerCitas();

        } catch (error) {
            console.error("Error al registrar pago:", error);
            setMensaje(error.message);
            setEsError(true);
        } finally {
            setGuardandoId(null);
        }
    };

    if (cargando) {
        return (
            <section className="registrar-pago-container">
                <p className="registrar-pago-cargando">
                    Cargando citas finalizadas...
                </p>
            </section>
        );
    }

    return (
        <section className="registrar-pago-container">

            <div className="registrar-pago-header">
                <h2>Registrar pagos</h2>

                <p>
                    Registra los pagos correspondientes a las citas
                    que ya fueron finalizadas.
                </p>
            </div>

            {mensaje && (
                <div
                    className={`registrar-pago-mensaje ${
                        esError ? "error" : "exito"
                    }`}
                >
                    {mensaje}
                </div>
            )}

            <div className="registrar-pago-fecha">
                <label htmlFor="fechaPago">
                    Fecha del pago
                </label>

                <input
                    id="fechaPago"
                    type="date"
                    value={fechaPago}
                    onChange={(e) => setFechaPago(e.target.value)}
                    max={fechaActual()}
                />
            </div>

            {citas.length === 0 ? (
                <div className="registrar-pago-vacio">
                    <p>
                        No hay citas finalizadas pendientes por pagar.
                    </p>
                </div>
            ) : (
                <div className="registrar-pago-lista">

                    {citas.map((cita) => {
                        const total = totales[cita.id] ??
                            cita.Servicio?.precio ?? "";

                        return (
                            <article
                                className="registrar-pago-card"
                                key={cita.id}
                            >
                                <div className="registrar-pago-card-header">
                                    <h3>
                                        {cita.Servicio?.nombre || "Servicio"}
                                    </h3>

                                    <span className="registrar-pago-estado">
                                        Finalizada
                                    </span>
                                </div>

                                <div className="registrar-pago-info">

                                    <div>
                                        <strong>Cliente:</strong>
                                        <span>
                                            {cita.cliente?.nombre || "No disponible"}
                                        </span>
                                    </div>

                                    <div>
                                        <strong>Empleado:</strong>
                                        <span>
                                            {cita.empleado?.nombre || "No disponible"}
                                        </span>
                                    </div>

                                    <div>
                                        <strong>Servicio:</strong>
                                        <span>
                                            {cita.Servicio?.nombre || "No disponible"}
                                        </span>
                                    </div>

                                    <div>
                                        <strong>Fecha de la cita:</strong>
                                        <span>
                                            {cita.fecha
                                                ? String(cita.fecha).slice(0, 10)
                                                : "No disponible"}
                                        </span>
                                    </div>

                                    <div>
                                        <strong>Hora:</strong>
                                        <span>
                                            {cita.hora
                                                ? String(cita.hora).slice(0, 5)
                                                : "No disponible"}
                                        </span>
                                    </div>

                                    <div>
                                        <strong>Precio del servicio:</strong>
                                        <span>
                                            {formatoPrecio(cita.Servicio?.precio)}
                                        </span>
                                    </div>

                                </div>

                                <div className="registrar-pago-total">
                                    <label htmlFor={`total-${cita.id}`}>
                                        Total a pagar
                                    </label>

                                    <input
                                        id={`total-${cita.id}`}
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={total}
                                        onChange={(e) =>
                                            cambiarTotal(cita.id, e.target.value)
                                        }
                                        placeholder="Ingrese el total"
                                    />

                                    <p>
                                        {formatoPrecio(total)}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    className="registrar-pago-boton"
                                    onClick={() => registrar(cita)}
                                    disabled={guardandoId !== null}
                                >
                                    {guardandoId === cita.id
                                        ? "Registrando..."
                                        : "Registrar pago"}
                                </button>

                            </article>
                        );
                    })}

                </div>
            )}

        </section>
    );
}
