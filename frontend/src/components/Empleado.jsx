import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";




export function Empleado() {

    const [hoy, SetCitasHoy] = useState(null);
    const [pendientes, SetPendientes] = useState(null);
    const [finalizadas, SetFinalizadas] = useState(null);
    const [realizar, SetRealizar] = useState(null);
    const [message, SetMessage] = useState("");

    const navigate = useNavigate();


 


    async function citasHoy() {

        try {

            const response = await fetch(
                "http://localhost:3000/inser/empleado/citasHoy",
                {
                    method: "GET",
                    credentials: "include"
                }
            );

            const data = await response.json();

            if (response.ok) {
                SetCitasHoy(data);
            } 

        } catch (error) {
            SetMessage(error.message);
        }
    }

    async function citasPendientesEmpleado() {

        try {

            const response = await fetch(
                "http://localhost:3000/inser/empleado/citasPendientesEmpleado",
                {
                    method: "GET",
                    credentials: "include"
                }
            );

            const data = await response.json();

            if (response.ok) {
                SetPendientes(data);
            } 

        } catch (error) {
            SetMessage(error.message);
        }
    }

    async function citasFinalizadasEmpleado() {

        try {

            const response = await fetch(
                "http://localhost:3000/inser/empleado/citasFinalizadasEmpleado",
                {
                    method: "GET",
                    credentials: "include"
                }
            );

            const data = await response.json();

            if (response.ok) {
                SetFinalizadas(data);
            } 

        } catch (error) {
            SetMessage(error.message);
        }
    }

    async function citasRealizar() {

        try {

            const response = await fetch(
                "http://localhost:3000/inser/empleado/citaRealizarEmpleado",
                {
                    method: "GET",
                    credentials: "include"
                }
            );

            const data = await response.json();

            if (response.ok) {
                SetRealizar(data);
            } 

        } catch (error) {
            SetMessage(error.message);
        }
    }

    useEffect(() => {

        citasHoy();
        citasPendientesEmpleado();
        citasFinalizadasEmpleado();
        citasRealizar();

    }, []);

    useEffect(() => {
        if (!message) return;

        const temporizador = setTimeout(() => {
            SetMessage("");
        }, 4000);

        return () => clearTimeout(temporizador);
    }, [message]);

    async function cerrarSesion() {

        await fetch(
            "http://localhost:3000/inser/logout",
            {
                method: "POST",
                credentials: "include"
            }
        );

        localStorage.removeItem("user");

        navigate("/login");
    }

    return (

        <div className="layout-dashboard">

            <aside className="sidebar">

                <h1 className="sidebar-title">
                    JC Alta<br />
                    Peluqueria
                </h1>

                <nav className="sidebar-menu">

                    <button
                        className="menu-btn"
                        onClick={() => navigate("/citasEmpleado")}
                    >
                        Gestionar mis citas
                    </button>

                    <button onClick={cerrarSesion}>
                        Cerrar sesión
                    </button>

                </nav>

            </aside>

            <main className="main-content">

                <div className="header-user">

                    <h2>
                        Hola 👋
                    </h2>

                    <p>
                        Bienvenido a tu panel de JC Alta Peluqueria.
                    </p>

                </div>

                {message && (
                    <p className="empleado-message">
                        {message}
                    </p>
                )}

                <div className="cards-grid">

                    <div className="citas-hoy-card card-stat">

                        <h2>
                            Citas de hoy
                        </h2>

                        <p className="citas-hoy-numero">
                            {hoy?.Hoy}
                        </p>

                        <span className="card-subtext">
                            Citas programadas
                        </span>

                    </div>

                    <div className="citas-pendientes-card card-stat">

                        <h2>
                            Citas Pendientes
                        </h2>

                        <p className="citas-pendientes-numero">
                            {pendientes}
                        </p>

                        <span className="card-subtext">
                            Por confirmar
                        </span>

                    </div>

                    <div className="citas-finalizadas-card card-stat">

                        <h2>
                            Citas Finalizadas
                        </h2>

                        <p className="citas-finalizadas-numero">
                            {finalizadas}
                        </p>

                        <span className="card-subtext">
                            Completadas
                        </span>

                    </div>

                </div>

                <div className="panel-empleado-grid">

                    <div className="proxima-cita-card">

                        <h2>
                            🗓️ Próxima cita
                        </h2>

                        {realizar ? (

                            <>

                                <div className="cita-fila">

                                    <span className="cita-label">
                                        Fecha
                                    </span>

                                    <span className="cita-valor">
                                        {realizar.fecha.split("T")[0]}
                                    </span>

                                </div>

                                <div className="cita-fila">

                                    <span className="cita-label">
                                        Hora
                                    </span>

                                    <span className="cita-valor">
                                        {realizar.hora.slice(0, 5)}
                                    </span>

                                </div>

                                <div className="cita-fila">

                                    <span className="cita-label">
                                        Cliente
                                    </span>

                                    <span className="cita-valor">
                                        {realizar.cliente?.nombre}
                                    </span>

                                </div>

                                <div className="cita-fila">

                                    <span className="cita-label">
                                        Servicio
                                    </span>

                                    <span className="cita-valor">
                                        {realizar.Servicio?.nombre}
                                    </span>

                                </div>

                                <div className="cita-fila">

                                    <span className="cita-label">
                                        Estado
                                    </span>

                                    <span className="cita-valor estado-bold">
                                        {realizar.estado}
                                    </span>

                                </div>

                            </>

                        ) : (

                            <p>
                                No tienes citas pendientes.
                            </p>

                        )}

                    </div>

                    <div className="acciones-empleado">

                        <button
                            onClick={() => navigate("/citasEmpleado")}
                            className="accion-btn"
                        >

                            <span>
                                📅
                            </span>

                            <div>

                                <h3>
                                    Gestionar Citas
                                </h3>

                            </div>

                        </button>

                    </div>

                </div>

            </main>

        </div>

    );
}

export default Empleado;