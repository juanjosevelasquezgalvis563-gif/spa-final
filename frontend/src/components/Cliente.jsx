import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react';




export function Cliente() {

  const [message, SetMessage] = useState("");
  const [cantidad, SetCantidad] = useState(null);
  const [pendientes, SetPendientes] = useState(null);
  const [confirmadas, SetConfirmadas] = useState(null);
  const [finalizadas, SetFinalizadas] = useState(null);
  const [realizar, SetRealizar] = useState(null);
  const [ultimas, SetUltimasCitas] = useState([]);

  const navigate = useNavigate();


  async function cantidadCitas() {
    try {

      const response = await fetch(
        'http://localhost:3000/inser/cliente/cantidadCitas',
        {
          method: "GET",
          credentials: "include"
        }
      );

      const data = await response.json();

      if (response.ok) {
        SetCantidad(data);
      }else{
        SetMessage(data.message);
      }

    } catch (error) {
      SetMessage('Error de conexion con el servidor')
    }
  }


  async function citasPendientes() {
    try {

      const response = await fetch('http://localhost:3000/inser/cliente/citasPendientes',
        {
          method: "GET",
          credentials: "include"
        }
      );

      const data = await response.json();

      if (response.ok) {
        SetPendientes(data);
      }else{
        SetMessage(data.message);
      }

    } catch (error) {
      SetMessage('Error de conexion con el servidor');
    }
  }


  async function citasComfirmadas() {
    try {

      const response = await fetch('http://localhost:3000/inser/cliente/citasComfirmadas',
        {
          method: "GET",
          credentials: "include"
        }
      );

      const data = await response.json();

      if (response.ok) {
        SetConfirmadas(data);
      }else{
        SetMessage(data.message);
      }

    } catch (error) {
      SetMessage('Error de conexion con el servidor');
    }
  }


  async function citasFinalizadas() {
    try {

      const response = await fetch(
        'http://localhost:3000/inser/cliente/citasFinalizadas',
        {
          method: "GET",
          credentials: "include"
        }
      );

      const data = await response.json();

      if (response.ok) {
        SetFinalizadas(data);
      }else{
        SetMessage(data.message);
      }

    } catch (error) {
      SetMessage('Error de conexion con el servidor');
    }
  }


  async function citasRealizar() {
    try {

      const response = await fetch(
        'http://localhost:3000/inser/cliente/citaRealizar',
        {
          method: "GET",
          credentials: "include"
        }
      );

      const data = await response.json();

      if (response.ok) {
        SetRealizar(data);
      }else{
        SetMessage(data.message);
      }

    } catch (error) {
      SetMessage('Error de conexion con el servidor');
    }
  }


  async function ultimasCitas() {
    try {

      const response = await fetch(
        'http://localhost:3000/inser/cliente/ultimasCitas',
        {
          method: "GET",
          credentials: "include"
        }
      );

      const data = await response.json();

      if (response.ok) {
        SetUltimasCitas(data);
      }else{
        SetMessage(data.message);
      } 

    } catch (error) {
      SetMessage('Error de conexion con el servidor');
    }
  }


  useEffect(() => {

    cantidadCitas();
    citasPendientes();
    citasComfirmadas();
    citasFinalizadas();
    citasRealizar();
    ultimasCitas();

  }, []);

  useEffect(() => {

    if (!message) return;

    const temporizador = setTimeout(() => {
      SetMessage("");
    }, 4000);

    return () => clearTimeout(temporizador);

  }, [message]);


  return (
    <div className="dashboard">

      <aside className="sidebar">

        <h2 className="logo">JC Alta Peluqueria</h2>

        <button onClick={() => navigate("/citas")}>
          Mis citas
        </button>

        <button onClick={() => navigate("/cita")}>
          Agendar cita
        </button>

        <button>
          Mi perfil
        </button>

        <button onClick={() => {
          navigate("/login");
        }}>
          Cerrar sesión
        </button>

      </aside>


      <main className="contenido">

        <div className="bienvenida">

          <p>Bienvenido a tu panel de JC Alta Peluqueria 👋</p>

        </div>


        {message && (
          <p className="cliente-message">
            {message}
          </p>
        )}


        <div className="cards">

          <div className="card">
            <h4>Total de citas</h4>
            <h2>{cantidad}</h2>
            <span>Todas tus citas</span>
          </div>


          <div className="card naranja">
            <h4>Pendientes</h4>
            <h2>{pendientes}</h2>
            <span>Por confirmar</span>
          </div>


          <div className="card verde">
            <h4>Confirmadas</h4>
            <h2>{confirmadas}</h2>
            <span>Próximas citas</span>
          </div>


          <div className="card azul">
            <h4>Finalizadas</h4>
            <h2>{finalizadas}</h2>
            <span>Completadas</span>
          </div>

        </div>


        <div className="panel-superior">

          <div className="citas-realizar">

            <h4>📅 Próxima cita</h4>

            <div className="cita-info">

              <h3>Fecha</h3>
              <p>{realizar && realizar.fecha.split("T")[0]}</p>

              <h3>Hora</h3>
              <p>{realizar && realizar.hora.slice(0, 5)}</p>

              <h3>Servicio</h3>
              <p>{realizar?.Servicio?.nombre}</p>

              <h3>Empleado</h3>
              <p>{realizar?.empleado?.nombre}</p>

              <h3>Estado</h3>

              <span className="estado">
                {realizar?.estado}
              </span>

            </div>

          </div>


          <div className="acciones">

            <button
              className="accion"
              onClick={() => navigate("/cita")}
            >
              📅

              <div>
                <h3>Agendar nueva cita</h3>
                <p>Reserva tu próximo servicio</p>
              </div>

            </button>


            <button
              className="accion"
              onClick={() => navigate("/citas")}
            >
              📋

              <div>
                <h3>Ver mis citas</h3>
                <p>Consulta tu historial completo</p>
              </div>

            </button>


            <button
              className="accion"
              onClick={() => navigate("/perfil")}
            >
              👤

              <div>
                <h3>Editar mi perfil</h3>
                <p>Actualiza tus datos personales</p>
              </div>

            </button>

          </div>

        </div>


        <div className="ultimas-citas">

          <h3>📋 Mis últimas citas</h3>

          <table>

            <thead>

              <tr>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Empleado</th>
                <th>Servicio</th>
                <th>Estado</th>
              </tr>

            </thead>


            <tbody>

              {ultimas.map((citas) => (

                <tr key={citas.id}>

                  <td>{citas.fecha.split("T")[0]}</td>

                  <td>{citas.hora.slice(0, 5)}</td>

                  <td>{citas.empleado?.nombre}</td>

                  <td>{citas.Servicio?.nombre}</td>

                  <td>

                    <span className={`estado ${citas.estado}`}>
                      {citas.estado}
                    </span>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </main>

    </div>
  );
}

export default Cliente;