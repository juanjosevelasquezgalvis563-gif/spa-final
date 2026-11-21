import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { SessionProvider } from "./context/SessionContext";
import Cliente from "./components/Cliente";
import "./App.css";
import "./dashboard-redesign.css";

const params = new URLSearchParams(window.location.search);
const ancho = Number(params.get("w"));

const respuestaJson = (data) =>
  Promise.resolve(
    new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  );

const CITAS = [
  {
    id: 21,
    fecha: "2026-11-24T00:00:00.000Z",
    hora: "15:30:00",
    estado: "confirmada",
    Servicio: { nombre: "Balayage + hidratación profunda" },
    empleado: { nombre: "Evelyn Nino" },
  },
  {
    id: 20,
    fecha: "2026-11-12T00:00:00.000Z",
    hora: "10:00:00",
    estado: "finalizada",
    Servicio: { nombre: "Corte y cepillado" },
    empleado: { nombre: "Steven Piedrahita" },
  },
  {
    id: 19,
    fecha: "2026-10-30T00:00:00.000Z",
    hora: "09:00:00",
    estado: "finalizada",
    Servicio: { nombre: "Manicure ruso + dipping" },
    empleado: { nombre: "Valentina Alvarez" },
  },
  {
    id: 18,
    fecha: "2026-10-14T00:00:00.000Z",
    hora: "17:00:00",
    estado: "cancelada",
    Servicio: { nombre: "Limpieza facial" },
    empleado: { nombre: "Jennifer Correa" },
  },
];

const HISTORIAL_PUNTOS = [
  { id: 1, tipo: "acumulacion", puntos: 42, descripcion: "Puntos por el servicio: Balayage", fecha_creacion: "2026-11-12T18:20:00.000Z" },
  { id: 2, tipo: "acumulacion", puntos: 20, descripcion: "Puntos por publicar una reseña", fecha_creacion: "2026-11-13T09:10:00.000Z" },
  { id: 3, tipo: "acumulacion", puntos: 38, descripcion: "Puntos por el servicio: Corte y cepillado", fecha_creacion: "2026-10-30T16:40:00.000Z" },
  { id: 4, tipo: "canje", puntos: 25, descripcion: "Canje de puntos en salón", fecha_creacion: "2026-10-02T11:00:00.000Z" },
  { id: 5, tipo: "acumulacion", puntos: 30, descripcion: "Puntos por el servicio: Manicure ruso", fecha_creacion: "2026-09-18T13:15:00.000Z" },
];

const RESENAS = [
  {
    id: 1,
    calificacion: 5,
    comentario: "El balayage quedó exactamente como lo imaginaba. Evelyn escuchó cada detalle y el resultado fue impecable.",
    fecha_creacion: "2026-11-13T09:10:00.000Z",
    cita_id: 20,
    cita: { empleado: { nombre: "Evelyn Nino" }, Servicio: { nombre: "Balayage + hidratación" } },
  },
  {
    id: 2,
    calificacion: 4,
    comentario: "Muy buena atención y el salón es precioso. Solo esperé unos minutos de más.",
    fecha_creacion: "2026-10-31T10:05:00.000Z",
    cita_id: 19,
    cita: { empleado: { nombre: "Valentina Alvarez" }, Servicio: { nombre: "Manicure ruso" } },
  },
];

const CITAS_POR_CALIFICAR = [CITAS[1], CITAS[2]];

const datosPorRuta = (url) => {
  if (url.includes("/cliente/cantidadCitas")) return 18;
  if (url.includes("/cliente/citasPendientes")) return 2;
  if (url.includes("/cliente/citasComfirmadas")) return 3;
  if (url.includes("/cliente/citasFinalizadas")) return 13;
  if (url.includes("/cliente/citaRealizar")) return CITAS[0];
  if (url.includes("/cliente/ultimasCitas")) return CITAS;
  if (url.includes("/cliente/fidelizacion")) {
    return {
      saldo_puntos: 145,
      descuentoDisponible: 5,
      descuentoMaximo: 15000,
      historial: HISTORIAL_PUNTOS,
    };
  }
  if (url.includes("/cliente/citasParaResena")) return CITAS_POR_CALIFICAR;
  if (url.includes("/cliente/resenas")) return { total: 2, promedio: 4.5, resenas: RESENAS };
  if (url.includes("/inser/me")) {
    return { user: { id: 4, nombre: "Camila Restrepo", email: "camila@correo.com", rol: "cliente" } };
  }
  return {};
};

window.fetch = (recurso) => {
  const url = typeof recurso === "string" ? recurso : recurso.url;
  return respuestaJson(datosPorRuta(url));
};

function Vista() {
  if (ancho) {
    return (
      <div id="frame-wrap">
        <iframe
          title="Vista previa móvil del panel"
          src="?frame=1"
          style={{ width: `${ancho}px`, height: "900px" }}
        />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <SessionProvider>
        <Cliente />
      </SessionProvider>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Vista />);
