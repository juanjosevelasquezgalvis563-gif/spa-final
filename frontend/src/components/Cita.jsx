import React from 'react'
import {  useState } from "react";


export function Cita() {
  const [fecha, SetFecha] = useState("");
  const [hora, SetHora] = useState("");
  const [cliente, SetCliente] = useState([]);
  const [empleadoId, SetEmpleadoId] = useState("");
  const [servicioId, SetServicioId] = useState("");
  const [message, SetMessage] = useState("");
  

  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      const response = await fetch("http://localhost:3000/inser/cliente", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fecha,
          hora,
          usuario_id: user.id,
          empleado_id: empleadoId,
          servicio_id: servicioId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        SetMessage(data.message);
        SetFecha("");
        SetHora("");
        SetEmpleadoId("");
        SetServicioId("");
      } else {
        SetMessage(data.error);
      }
    } catch (error) {
      SetMessage(error.message);
    }
  }
 return (
  <div className="cita-container">
    <h2 className="cita-title">Agenda tu cita</h2>

    <form onSubmit={handleSubmit} className="cliente-form">
      <input
        type="date"
        value={fecha}
        onChange={(e) => SetFecha(e.target.value)}
        className="cliente-input"
      />

      <input
        type="time"
        value={hora}
        onChange={(e) => SetHora(e.target.value)}
        className="cliente-input"
      />

      <select
        value={empleadoId}
        onChange={(e) => SetEmpleadoId(e.target.value)}
        className="cliente-input"
      >
        <option value="">Seleccione un empleado</option>
        <option value="3">Santiago</option>
        <option value="5">Antony</option>
        <option value="11">María</option>
      </select>

      <select
        value={servicioId}
        onChange={(e) => SetServicioId(e.target.value)}
        className="cliente-input"
      >
        <option value="">Seleccione un servicio</option>
        <option value="1">Pestañas</option>
        <option value="2">Lavado de pelo</option>
        <option value="3">Uñas</option>
      </select>

      <button type="submit" className="cliente-button">
        Agendar cita
      </button>
    </form>

    {message && <p className="mensaje">{message}</p>}
  </div>
);
}
export default Cita;