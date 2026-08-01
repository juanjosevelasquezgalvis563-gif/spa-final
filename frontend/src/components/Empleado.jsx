import React, { useEffect, useState } from "react";
import {useNavigate} from "react-router-dom";

export function Empleado() {
  const [empleado, SetEmpleado] = useState([]);
  const [message, SetMessage] = useState("");
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  async function obtenerEmpleado() {
    try {
      const response = await fetch("http://localhost:3000/inser/empleado", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
       navigate('/login')
        return;
      } else {
        SetEmpleado(data);
       
      }
    } catch (error) {
      SetMessage(error.message);
    }
  }

  useEffect(() => {
    obtenerEmpleado();
  }, []);

  async function comfirmar(id) {
    try {
      const response = await fetch(
        `http://localhost:3000/inser/empleado/comfirmar/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        SetMessage(data.message);
        obtenerEmpleado();
      } else {
        SetMessage(data.error);
      }
    } catch (error) {
      SetMessage(error.message);
    }
  }

  async function finalizar(id) {
    try {
      const response = await fetch(
        `http://localhost:3000/inser/empleado/finalizar/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        SetMessage(data.message);
        obtenerEmpleado();
      } else {
        SetMessage(data.error);
      }
    } catch (error) {
      SetMessage(error.message);
    }
  }

  async function cancelar(id) {
    try {
      const response = await fetch(
        `http://localhost:3000/inser/empleado/cancelar/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        SetMessage(data.message);
        obtenerEmpleado();
      } else {
        SetMessage(data.error);
      }
    } catch (error) {
      SetMessage(error.message);
    }
  }

  return (
    <div className="empleado-container">

      {message && (
        <p className="empleado-message">
          {message}
        </p>
      )}

      <div className="empleado-lista">

        {empleado.map((citas) => (
          <div key={citas.id} className="empleado-card">

            <p>
              <strong>Fecha:</strong> {citas.fecha}
            </p>

            <p>
              <strong>Hora:</strong> {citas.hora}
            </p>

            <p>
              <strong>Cliente:</strong> {citas.nombre_cliente}
            </p>

            <p>
              <strong>Servicio:</strong> {citas.nombre_servicio}
            </p>

            <p>
              <strong>Estado:</strong>
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

export default Empleado;