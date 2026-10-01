import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';



export function CitasEmpleado() {
    const [empleado, SetEmpleado] = useState([]);
    const [message, SetMessage] = useState("");
    




    async function obtenerEmpleado() {
        try {
            const response = await fetch("http://localhost:3000/inser/empleado", {
                method: "GET",
                credentials:'include',
            });

            const data = await response.json();

            if (response.ok) {
                  SetEmpleado(data);
                return;
            }else{
                SetMessage(data.message);
            }

           

        } catch (error) {
            SetMessage('Error de conexión con el servidor');
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
                `http://localhost:3000/inser/empleado/comfirmar/${id}`,
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
                `http://localhost:3000/inser/empleado/finalizar/${id}`,
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
                `http://localhost:3000/inser/empleado/cancelar/${id}`,
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
        <div>

            
            {message && (
                <div className="mensaje-cita">
                    {message}
                </div>
            )}

            <div className="empleado-lista">

                {empleado.map((citas) => (
                    <div key={citas.id} className="empleado-card">

                        <p>
                            <strong>Fecha:</strong>{" "}
                            {citas.fecha.split("T")[0]}
                        </p>

                        <p>
                            <strong>Hora:</strong>{" "}
                            {citas.hora.slice(0, 5)}
                        </p>

                        <p>
                            <strong>Cliente:</strong>{" "}
                            {citas.cliente?.nombre}
                        </p>

                        <p>
                            <strong>Servicio:</strong>{" "}
                            {citas.Servicio?.nombre}
                        </p>

                        <p>
                            <strong>Estado:</strong>{" "}
                            <span className="estado-cita">
                                {citas.estado}
                            </span>
                        </p>

                        <div className="empleado-botones">

                            <button
                                className="btn-confirmar"
                                onClick={() => comfirmar(citas.id)}
                            >
                                Confirmar cita
                            </button>

                            <button
                                className="btn-finalizar"
                                onClick={() => finalizar(citas.id)}
                            >
                                Finalizar cita
                            </button>

                            <button
                                className="btn-cancelar"
                                onClick={() => cancelar(citas.id)}
                            >
                                Cancelar cita
                            </button>

                        </div>

                    </div>
                ))}

            </div>

        </div>
    );
}

export default CitasEmpleado;