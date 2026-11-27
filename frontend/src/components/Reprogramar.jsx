import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { API_ROOT } from "../lib/api";
import logo from "../assets/image.png";
import "./Reprogramar.css";

export function Reprogramar() {
  const [fecha, SetFecha] = useState("");
  const [hora, SetHora] = useState("");
  const [empleadoId, SetEmpleadoId] = useState("");
  const [servicioId, SetServicioId] = useState("");
  const [empleados, SetEmpleados] = useState([]);
  const [servicios, SetServicios] = useState([]);
  const [message, SetMessage] = useState("");
  const [mensajeEmpleado, setMensajeEmpleado] = useState("");
  const [propuestas, setPropuestas] = useState([]);
  const [estadoCita, setEstadoCita] = useState("");
  const [empleadoOriginalId, setEmpleadoOriginalId] = useState("");
  const [cargandoCita, setCargandoCita] = useState(true);

  
  const { id } = useParams();
  async function handleSubmit(e) {
    e.preventDefault();

    if (hora) {
      const horaValida = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(hora);
      const minutosHora = horaValida ? Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5)) : -1;
      if (minutosHora < 8 * 60 || minutosHora > 17 * 60) {
        SetMessage("El spa atiende de 8:00 a. m. a 6:00 p. m. Las citas duran una hora; la última debe iniciar a las 5:00 p. m.");
        return;
      }
    }

    if (!fecha || !hora || !empleadoId || !servicioId) {
      SetMessage("Completa la fecha, hora, empleado y servicio para reprogramar la cita.");
      return;
    }

    if (!empleados.some((empleado) => String(empleado.id) === String(empleadoId))) {
      SetMessage("Este empleado no puede realizar el servicio seleccionado.");
      return;
    }

    try {
      const response = await fetch(
        `${API_ROOT}/inser/cliente/actualizar/${id}`,
        {
          method: "PUT",
          credentials:'include',
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            fecha,
            hora,
            empleado_id: empleadoId,
            servicio_id: servicioId,
            mensaje: mensajeEmpleado,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        SetMessage(data.message);
        SetFecha("");
        SetHora("");
        setMensajeEmpleado("");
        SetEmpleadoId(empleadoOriginalId);
        await obtenerPropuestas();
      } else {
        SetMessage(data.message || "No se pudo reprogramar la cita.");
      }
    } catch {
      SetMessage('No pudimos reprogramar la cita. Revisa tu conexión e inténtalo de nuevo.');
    }
  }

  async function obtenerEmpleados(servicioActual = "", empleadoFijo = empleadoOriginalId) {
    try {
      const params = new URLSearchParams();
      if (servicioActual) {
        params.set("servicio_id", String(servicioActual));
      }

      const query = params.toString() ? `?${params.toString()}` : "";
      const response = await fetch(`${API_ROOT}/inser/cliente/empleados${query}`, {
        method: "GET",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        SetEmpleados([]);
        return;
      }

      if (Array.isArray(data)) {
        SetEmpleados(data.filter((empleado) => !empleadoFijo || String(empleado.id) === String(empleadoFijo)));
      }
    } catch {
      SetEmpleados([]);
    }
  }

  async function obtenerServicios(empleadoFijo = empleadoOriginalId) {
    try {
      const query = empleadoFijo ? `?empleado_id=${encodeURIComponent(empleadoFijo)}` : "";
      const response = await fetch(`${API_ROOT}/inser/cliente/servicios${query}`, {
        method: "GET",
        credentials: "include",
      });

      const data = await response.json();
      if (response.ok && Array.isArray(data)) {
        SetServicios(data);
      }
    } catch {
      SetServicios([]);
    }
  }

  async function obtenerPropuestas() {
    try {
      const response = await fetch(`${API_ROOT}/inser/cliente/reprogramaciones`, { credentials: "include" });
      const data = await response.json().catch(() => []);
      if (response.ok && Array.isArray(data)) setPropuestas(data);
    } catch { setPropuestas([]); }
  }

  async function obtenerCita() {
    try {
      const response = await fetch(`${API_ROOT}/inser/cliente`, { credentials: "include" });
      const citas = await response.json().catch(() => []);
      if (!response.ok || !Array.isArray(citas)) throw new Error("No pudimos verificar el estado de la cita.");
      const cita = citas.find((item) => String(item.id) === String(id));
      if (!cita) throw new Error("No encontramos esta cita en tu cuenta.");
      const asignadoId = String(cita.empleado_id || "");
      if (!asignadoId) throw new Error("La cita no tiene un empleado asignado.");
      setEmpleadoOriginalId(asignadoId);
      SetEmpleadoId(asignadoId);
      SetServicioId(String(cita.servicio_id || ""));
      await obtenerServicios(asignadoId);
      setEstadoCita(String(cita.estado || "").toLowerCase());
      if (["finalizada", "cancelada"].includes(String(cita.estado || "").toLowerCase())) {
        SetMessage("Esta cita ya no se puede reprogramar.");
      }
    } catch (error) {
      SetMessage(error.message || "No pudimos verificar la cita.");
      setEstadoCita("no_disponible");
    } finally {
      setCargandoCita(false);
    }
  }

  useEffect(() => {
    obtenerPropuestas();
    obtenerCita();
  }, []);

  useEffect(() => {
    if (!servicioId) {
      SetEmpleados([]);
      return;
    }

    obtenerEmpleados(servicioId, empleadoOriginalId);
  }, [servicioId, empleadoOriginalId]);

  useEffect(() => {
    if (!message) return;

    const temporizador = setTimeout(() => {
      SetMessage("");
    }, 4000);

    return () => clearTimeout(temporizador);
  }, [message]);

  return (
    <main className="cliente-container reprogramar-page auth-page">
      <div className="auth-layout reprogramar-layout">
        <aside className="auth-brand-panel reprogramar-brand">
          <div className="auth-brand">
            <img src={logo} alt="JC Alta Peluquería" />
            <span>JC Alta Peluquería</span>
          </div>
          <div className="auth-brand-copy">
            <span className="auth-eyebrow">GESTIONA TU RESERVA</span>
            <h1>Tu tiempo, a tu manera.</h1>
            <p>Solicita un nuevo horario. El empleado revisará la disponibilidad y confirmará el cambio.</p>
          </div>
          <div className="auth-brand-detail" aria-hidden="true"><span>JC</span></div>
          <p className="auth-brand-caption">Tu belleza, nuestro arte.</p>
        </aside>

        <section className="cliente-card reprogramar-card auth-card">
        <span className="reprogramar-eyebrow">SOLICITUD DE CAMBIO</span>
        <h2 className="cliente-title reprogramar-title">Reprogramar cita</h2>
        <p className="reprogramar-description">La cita conserva su horario actual hasta que el empleado acepte la solicitud y confirme el nuevo horario.</p>

        {cargandoCita ? <p className="cliente-message reprogramar-message" role="status">Verificando la cita…</p> : (
          ["finalizada", "cancelada", "no_disponible"].includes(estadoCita)
            ? <p className="cliente-message reprogramar-message" role="alert">{message || "Esta cita ya no se puede reprogramar."}</p>
            : <form onSubmit={handleSubmit} className="cliente-form reprogramar-form">

          <label className="reprogramar-field" htmlFor="reprogramar-fecha">
            <span>Fecha</span>
            <input
              id="reprogramar-fecha"
              type="date"
              value={fecha}
              onChange={(e) => SetFecha(e.target.value)}
              className="cliente-input"
            />
          </label>

          <label className="reprogramar-field" htmlFor="reprogramar-hora">
            <span>Hora</span>
            <input
              id="reprogramar-hora"
              type="time"
              value={hora}
              onChange={(e) => SetHora(e.target.value)}
              className="cliente-input"
            />
          </label>

          <div className="reprogramar-field">
            <span>Empleado asignado</span>
            <p className="cliente-input">{empleados.find((empleado) => String(empleado.id) === empleadoOriginalId)?.nombre || "Empleado de la cita"}</p>
          </div>

          <label className="reprogramar-field" htmlFor="reprogramar-servicio">
            <span>Servicio</span>
            <select
              id="reprogramar-servicio"
              value={servicioId}
              onChange={(e) => SetServicioId(e.target.value)}
              className="cliente-input"
              disabled={servicios.length === 0}
            >
              <option value="">Seleccione un servicio</option>
              {servicios.map((servicio) => (
                <option key={servicio.id} value={String(servicio.id)}>
                  {servicio.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="reprogramar-field" htmlFor="reprogramar-mensaje">
            <span>Mensaje para el empleado (opcional)</span>
            <textarea id="reprogramar-mensaje" value={mensajeEmpleado} maxLength={1000} onChange={(e) => setMensajeEmpleado(e.target.value)} className="cliente-input" rows={3} />
          </label>

          <button type="submit" className="cliente-button reprogramar-button">
            Actualizar cita
          </button>

          {message && (
            <p className="cliente-message reprogramar-message" role="status">
              {message}
            </p>
          )}
        </form>
        )}
        {propuestas.length > 0 && <section className="reprogramar-propuestas" aria-labelledby="propuestas-reprogramacion-titulo">
          <h3 id="propuestas-reprogramacion-titulo">Recomendación del empleado</h3>
          {propuestas.map((propuesta) => <article key={propuesta.id} className="reprogramar-propuesta">
            <p>{propuesta.mensaje || "El empleado recomienda que elijas otro horario para tu cita."}</p>
            <p>Elige una fecha y hora en el formulario y envía una nueva solicitud. Tu cita conserva su horario actual hasta que el empleado acepte una solicitud.</p>
          </article>)}
        </section>}
        </section>
      </div>
    </main>
  );
}

export default Reprogramar;
