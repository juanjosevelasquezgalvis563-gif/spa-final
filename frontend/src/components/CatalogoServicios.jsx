import DiseñoColorVideo from "../assets/diseños-color.mp4";
import CorteCepilladoVideo from "../assets/corte-cepillado.mp4";
import LimpiezaFacialVideo from "../assets/limpieza-facial.mp4";
import KeratinaVideo from "../assets/keratina.mp4";
import MaquillajeVideo from "../assets/maquillaje.mp4";
import UñasManicureVideo from "../assets/uñas.jpeg";




const servicios = [
   {
    id: 1,
    nombre: "Diseños de Color",
    descripcion:
      "Dale vida a tu cabello con tonos, iluminaciones y cambios de color que resaltan tu belleza y estilo.",
    precio: "",
    video: DiseñoColorVideo,
  },
  {
    id: 2,
    nombre: "Corte y Cepillado",
    descripcion:
      "Renueva tu imagen con cortes personalizados y un cepillado profesional para lucir un cabello hermoso y con movimiento.",
    precio: "",
    video: CorteCepilladoVideo,
  },
  {
    id: 3,
    nombre: "Limpieza Facial",
    descripcion:
      "Consiente tu piel con una limpieza facial que ayuda a eliminar impurezas y deja tu rostro con una apariencia fresca y cuidada.",
    precio: "",
    video: LimpiezaFacialVideo,
  },
  {
    id: 4,
    nombre: "Keratina",
    descripcion:
      "Disfruta de un cabello más suave, manejable y brillante con un tratamiento diseñado para ayudar a controlar el frizz.",
    precio: "",
    video: KeratinaVideo,
  },
  {
    id: 5,
    nombre: "Maquillaje",
    descripcion:
      "Resalta tus facciones con un maquillaje que complemente tu estilo y te haga lucir espectacular en cada ocasión.",
    precio: "",
    video: MaquillajeVideo,
  },
  {
    id: 6,
    nombre: "Uñas y Manicure",
    descripcion:
      "Dale un toque especial a tus manos con el cuidado de tus uñas, acabados delicados y diseños que reflejan tu personalidad.",
    precio: "",
    imagen: UñasManicureVideo,
  },
];

export default function CatalogoServicios() {
  return (
    <section className="catalogo-servicios" id="catalogo-servicios">
      <header className="catalogo-header">
        <span className="catalogo-etiqueta">
          JC ALTA PELUQUERÍA
        </span>

        <h2>Nuestros servicios</h2>

        <p>
          Descubre nuestros servicios y conoce cada detalle
          a través de nuestros videos.
        </p>
      </header>

      <div className="catalogo-grid">
        {servicios.map((servicio) => (
          <article className="catalogo-card" key={servicio.id}>
            <div className="catalogo-video">
              {servicio.video ? (
                <video
                  src={servicio.video}
                  controls
                  playsInline
                  preload="metadata"
                />
              ) : servicio.imagen ? (
                <img src={servicio.imagen} alt={servicio.nombre} />
              ) : (
                <div className="catalogo-video-vacio">
                  <span className="catalogo-play">▶</span>
                  <p>Video del servicio</p>
                  <small>Aquí irá tu video</small>
                </div>
              )}
            </div>

            <div className="catalogo-info">
              <span className="catalogo-numero">
                SERVICIO {String(servicio.id).padStart(2, "0")}
              </span>

              <h3>{servicio.nombre}</h3>

              <p>{servicio.descripcion}</p>

              {servicio.precio && (
                <div className="catalogo-precio">
                  {servicio.precio}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
