
import { useEffect, useState, useCallback } from "react";
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

async function leerRespuesta(respuesta) {
    const texto = await respuesta.text();

    try {
        return texto ? JSON.parse(texto) : {};
    } catch {
        throw new Error("El servidor devolvió una respuesta no válida.");
    }
}

export default function RegistrarPago({ rol }) {

    const baseRuta = rol === "administrador"
        ? "administrador"
        : "empleado";

    const [citas, setCitas] = useState([]);
    const [fechaPago, setFechaPago] = useState(fechaActual());
    const [cargando, setCargando] = useState(true);
    const [guardandoId, setGuardandoId] = useState(null);
    const [mensaje, setMensaje] = useState("");
    const [esError, setEsError] = useState(false);

    // Consultar citas finalizadas que todavía no tienen pago.
    const obtenerCitas = useCallback(async () => {
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

            const data = await leerRespuesta(respuesta);

            if (!respuesta.ok) {
                throw new Error(
                    data.message || "No se pudieron cargar las citas."
                );
            }

            if (!Array.isArray(data)) {
                throw new Error("La respuesta no contiene una lista de citas.");
            }

            setCitas(data);

        } catch (error) {
            console.error("Error al consultar citas:", error);
            setMensaje(error.message);
            setEsError(true);
            setCitas([]);

        } finally {
            setCargando(false);
        }
    }, [baseRuta]);

    useEffect(() => {
        obtenerCitas();
    }, [obtenerCitas]);

    // Registrar el pago de una cita.
    const registrar = async (cita) => {

        if (guardandoId !== null) return;

        try {
            setMensaje("");
            setEsError(false);

            if (!Number.isInteger(Number(cita.id)) || Number(cita.id) <= 0) {
                throw new Error("El ID de la cita no es válido.");
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
                    // El backend calcula el total utilizando
                    // precio_final y el descuento guardado en la cita.
                    body: JSON.stringify({
                        cita_id: Number(cita.id),
                        fecha_pago: fechaPago
                    })
                }
            );

            const data = await leerRespuesta(respuesta);

            if (!respuesta.ok) {
                throw new Error(
                    data.message || "No se pudo registrar el pago."
                );
            }

            const detalle = data.detalle || {};

            setMensaje(
                `${data.message} Total pagado: ${formatoPrecio(
                    detalle.total_pagado
                )}`
            );

            setEsError(false);

            // Actualizar la lista para retirar la cita que ya fue pagada.
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
                    Registra los pagos de las citas finalizadas.
                    Se respetará el descuento aplicado al cliente
                    y el backend calculará el valor definitivo.
                </p>
            </div>

            {mensaje && (
                <div
                    className={`registrar-pago-mensaje ${
                        esError ? "error" : "exito"
                    }`}
                    role="status"
                >
                    {mensaje}
                </div>
            )}

            <div className="registrar-pago-fecha">
                <label htmlFor={`fechaPago-${baseRuta}`}>
                    Fecha del pago
                </label>

                <input
                    id={`fechaPago-${baseRuta}`}
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

                        const precioOriginal = Number(
                            cita.precio_original ??
                            cita.Servicio?.precio ??
                            0
                        );

                        const descuentoPorcentaje = Number(
                            cita.descuento_porcentaje || 0
                        );

                        const descuentoValor = Number(
                            cita.descuento_valor || 0
                        );

                        const precioFinal = Number(
                            cita.precio_final ??
                            Math.max(0, precioOriginal - descuentoValor)
                        );

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

                                </div>

                                <div className="registrar-pago-desglose">

                                    <h4>Desglose del pago</h4>

                                    <div>
                                        <span>Precio original:</span>
                                        <strong>
                                            {formatoPrecio(precioOriginal)}
                                        </strong>
                                    </div>

                                    {descuentoPorcentaje > 0 && (
                                        <div className="registrar-pago-descuento">

                                            <span>
                                                Descuento aplicado ({descuentoPorcentaje}%):
                                            </span>

                                            <strong>
                                                - {formatoPrecio(descuentoValor)}
                                            </strong>

                                        </div>
                                    )}

                                    <div className="registrar-pago-precio-final">
                                        <span>Precio final:</span>

                                        <strong>
                                            {formatoPrecio(precioFinal)}
                                        </strong>
                                    </div>

                                    <div className="registrar-pago-saldo">
                                        <span>Total a registrar:</span>

                                        <strong>
                                            {formatoPrecio(precioFinal)}
                                        </strong>
                                    </div>

                                </div>

                                <button
                                    type="button"
                                    className="registrar-pago-boton"
                                    onClick={() => registrar(cita)}
                                    disabled={
                                        guardandoId !== null ||
                                        precioFinal <= 0
                                    }
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