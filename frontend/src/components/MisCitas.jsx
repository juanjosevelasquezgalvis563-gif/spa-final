import React from 'react'
import { useState } from 'react'
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom'



export function MisCitas() {

    const [cliente, SetCliente] = useState([]);
    const [message, SetMessage] = useState("");

    const navigate = useNavigate();




    async function obtenerCliente() {
        try {
            const response = await fetch("http://localhost:3000/inser/cliente", {
                method: 'GET',
                credentials: 'include',
            })

            const data = await response.json();

            if (response.ok) {
                SetCliente(data);
            }else{
                SetMessage(data.message);
            }

        } catch (error) {
            SetMessage('Error de conexion con el servidor');
        }
    }

    async function cancelarSuCita(id) {
        try {
            const response = await fetch(
                `http://localhost:3000/inser/cliente/cancelar/${id}`,
                {
                    method: 'PUT',
                    credentials: 'include',
                }
            )

            const data = await response.json();

            if (response.ok) {
                SetMessage(data.message);
                obtenerCliente();
            }else{
                SetMessage(data.message);
            }

        } catch (error) {
            SetMessage('Error de conexion con el servidor');
        }
    }

    useEffect(() => {
        obtenerCliente();
    }, [])

    useEffect(() => {
        if (!message) return;

        const temporizador = setTimeout(() => {
            SetMessage("");
        }, 4000);

        return () => clearTimeout(temporizador);
    }, [message])

    return (
        <div className="mis-citas-container">

            <div className="mis-citas-card">

                <div className="mis-citas-header">
                    <h2 className="tabla-title">Mis citas</h2>
                </div>




                {message && (
                    <div className="mensaje-cita">
                        {message}
                    </div>
                )}


                <div className="tabla-responsive">

                    <table className="tabla-citas">

                        <thead>
                            <tr>
                                <th>Cliente</th>
                                <th>Servicio</th>
                                <th>Fecha</th>
                                <th>Hora</th>
                                <th>Estado</th>
                                <th>Cancelar</th>
                                <th>Reprogramar</th>
                            </tr>
                        </thead>

                        <tbody>

                            {cliente.map((clientes) => (

                                <tr key={clientes.id}>

                                    <td>{clientes.cliente.nombre}</td>

                                    <td>{clientes.Servicio.nombre}</td>

                                    <td>
                                        {clientes.fecha.split("T")[0]}
                                    </td>

                                    <td>
                                        {clientes.hora.slice(0, 5)}
                                    </td>

                                    <td>
                                        <span className={"estado ${clientes.estado}"}>
                                            {clientes.estado}
                                        </span>
                                    </td>

                                    <td>

                                        <button
                                            className="btn-cancelar"
                                            onClick={() => cancelarSuCita(clientes.id)}
                                        >
                                            Cancelar
                                        </button>

                                    </td>

                                    <td>

                                        <button
                                            className="btn-reprogramar"
                                            onClick={() => navigate(`/reprogramar/${clientes.id}`)}
                                        >
                                            Reprogramar
                                        </button>

                                    </td>

                                </tr>











                            ))}

                        </tbody>

                    </table>

                </div>

            </div>

        </div>
    );
}

export default MisCitas;