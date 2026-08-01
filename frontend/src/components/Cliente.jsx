import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useEffect } from 'react';

export function Cliente() {
  const[cliente, SetCliente] = useState([])
  const [message, SetMessage] = useState("");
  const [cantidad, SetCantidad] = useState(null);
  const [pendientes, SetPendientes] = useState(null);
  const [confirmadas, SetConfirmadas] = useState(null);
  const [finalizadas, SetFinalizadas] = useState(null);
  const [realizar, SetRealizar] = useState(null);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

  


  async function cantidadCitas() {
    try {
      const response = await fetch("http://localhost:3000/inser/cliente/cantidadCitas", {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`

        },
      })
      const data = await response.json();
      if (!response.ok) {
          navigate('/login')
          return;
      } else {
        SetCantidad(data);
        SetMessage(data.error)
      }

    } catch (error) {
      SetMessage(error.message)
    }
  }
  useEffect(() => {
    if (user) {
      cantidadCitas(user.id);
    }
  }, [])

  async function citasPendientes() {
    try {
      const response = await fetch("http://localhost:3000/inser/cliente/citasPendientes", {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`

        },
      })
      const data = await response.json();
      if (response.ok) {
        SetPendientes(data);
      } else {
        SetMessage(data.error)
      }

    } catch (error) {
      SetMessage(error.message)
    }
  }

  useEffect(() => {
    if (user) {
      citasPendientes(user.id);
    }
  }, [])

  async function citasComfirmadas() {
    try {
      const response = await fetch("http://localhost:3000/inser/cliente/citasComfirmadas", {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`

        },
      })
      const data = await response.json();
      if (response.ok) {
        SetConfirmadas(data);
      } else {
        SetMessage(data.error)
      }

    } catch (error) {
      SetMessage(error.message)
    }
  }

  useEffect(() => {
    if (user) {
      citasComfirmadas(user.id);
    }
  }, [])

  async function citasFinalizadas() {
    try {
      const response = await fetch("http://localhost:3000/inser/cliente/citasFinalizadas", {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`

        },
      })
      const data = await response.json();
      if (response.ok) {
        SetFinalizadas(data);
      } else {
        SetMessage(data.error)
      }

    } catch (error) {
      SetMessage(error.message)
    }
  }

  useEffect(() => {
    if (user) {
      citasFinalizadas(user.id);
    }
  }, [])

  async function citasRealizar(){
    try{
      const response = await fetch("http://localhost:3000/inser/cliente/citaRealizar",{
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      
      })
      const data = await response.json();
      if(response.ok){
        SetRealizar(data);
       
      }else{
        SetMessage(data.error)
      }
    }catch(error){
      SetMessage(error.message)
    }
  }
  useEffect(() =>{
     citasRealizar(user.id);
  },[])

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

        <button onClick={() => navigate("/login")}>
          Cerrar sesión
        </button>

      </aside>

      <main className="contenido">

        <div className="bienvenida">
          <h1>Hola, {user.nombre} 👋</h1>
          <p>Bienvenido a tu panel de JC Alta Peluqueria.</p>
        </div>

        <div className="cards">

          <div className="card">
            <h4>Total de citas</h4>
            <h2>{cantidad && cantidad.total_citas}</h2>
            <span>Todas tus citas</span>
          </div>

          <div className="card naranja">
            <h4>Pendientes</h4>
            <h2>{pendientes && pendientes.citas_pendientes}</h2>
            <span>Por confirmar</span>
          </div>

          <div className="card verde">
            <h4>Confirmadas</h4>
            <h2>{confirmadas && confirmadas.citas_confirmadas}</h2>
            <span>Próximas citas</span>
          </div>

          <div className="card azul">
            <h4>Finalizadas</h4>
            <h2>{finalizadas && finalizadas.citas_finalizadas}</h2>
            <span>Completadas</span>
          </div>

        </div>

        <div className="citas-realizar">
    <h4>📅 Próxima cita</h4>

    <div className="cita-info">
        <h3>Fecha</h3>
        <p>{realizar && realizar.fecha}</p>

        <h3>Hora</h3>
        <p>{realizar && realizar.hora}</p>

        <h3>Servicio</h3>
        <p>{realizar && realizar.servicio}</p>

        <h3>Empleado</h3>
        <p>{realizar && realizar.empleado}</p>

        <h3>Estado</h3>
        <span className="estado">
            {realizar && realizar.estado}
        </span>
    </div>
</div>

        <div className="acciones">

          <button className="accion" onClick={() => navigate("/cita")}>
            📅
            <div>
              <h3>Agendar nueva cita</h3>
              <p>Reserva tu próximo servicio</p>
            </div>
          </button>

          <button className="accion" onClick={() => navigate("/citas")}>
            📋
            <div>
              <h3>Ver mis citas</h3>
              <p>Consulta tu historial completo</p>
            </div>
          </button>

          <button className="accion" onClick={() => navigate('/perfil')}>
            👤
            <div>
              <h3>Editar mi perfil</h3>
              <p>Actualiza tus datos personales</p>
            </div>
          </button>

        </div>
        

      </main>

    </div>
  );
}
export default Cliente;