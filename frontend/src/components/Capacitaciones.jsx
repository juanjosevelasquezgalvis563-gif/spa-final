
import asesorar1 from "../assets/video-asesoramiento.mp4";
import asesoria2 from "../assets/video-asesoramiento1.mp4";

// Agrega tus videos y escribe aquí la explicación técnica de cada uno.
const capacitaciones = [
  {
    id: 1,
    titulo: "Asesoria De Color",
    categoria: "Colorimetría",
    descripcion:
      "Para lograr un cambio de imagen impactante sin comprometer la salud de tu fibra capilar, el secreto está en la personalización y en técnicas de aclaración respetuosas con el cabello natural. En esta asesoría realizamos un trabajo de aclaración sutil diseñado especialmente para iluminar el rostro y aportar movimiento sin generar marcaciones bruscas ni líneas de contraste evidentes. Utilizando una crema aclaradora activada en tonos cálidos, logramos elevar la luz de la melena de forma delicada para que el cabello no sufra maltrato y mantenga su vida, suavidad y elasticidad natural. Este tipo de técnica es ideal para quienes buscan transformar su mirada y resaltar la belleza de su piel con un acabado armonioso, natural y lleno de brillo.",
    video: asesorar1,
  },
  {
    id: 2,
    titulo: "Montaje Total Del Color",
    categoria: "Cuidado del cabello",
    descripcion:
      "Antes de realizar un cambio de color impactante, el diagnóstico profesional es el paso más importante para garantizar la salud de tu fibra capilar. En esta asesoría evaluamos detenidamente las necesidades del cabello, identificando el crecimiento natural de la raíz, los residuos de decoloraciones anteriores y los matices desgastados en las puntas. Para asegurar un procedimiento seguro y efectivo, realizamos previamente una prueba de resistencia de color que nos indica exactamente hasta dónde podemos aclarar sin comprometer la estructura de la hebra. Con esta base técnica, ejecutamos un montaje total de aclaración diseñado para uniformar el tono, unificar los reflejos y lograr un rubio luminoso, impecable y perfectamente integrado que cumple con las expectativas de cada cliente.",
    video: asesoria2,
  },
  
];

export default function Capacitaciones() {
  return (
    <section className="capacitaciones" id="capacitaciones">
      <div className="capacitaciones-container">
        <span className="capacitaciones-etiqueta">
          APRENDE CON NOSOTROS
        </span>

        <h2>
          Capacitaciones a <span>ustedes</span>
        </h2>

        <p className="capacitaciones-intro">
          Descubre nuestros videos de asesoramiento y conoce más sobre los servicios de belleza que ofrecemos en JC Alta Peluquería. A través de ejemplos reales, te mostramos transformaciones capilares, resultados finales y recomendaciones de nuestros profesionales para ayudarte a elegir el estilo ideal para ti y mantener tu cabello hermoso y saludable.
        </p>

        <div className="capacitaciones-lista">
          {capacitaciones.map((capacitacion) => (
            <article
              className="capacitacion-card"
              key={capacitacion.id}
            >
              <div className="capacitacion-video">
                {capacitacion.video ? (
                  <video
                    src={capacitacion.video}
                    controls
                    preload="metadata"
                    playsInline
                  >
                    Tu navegador no puede reproducir este video.
                  </video>
                ) : (
                  <div className="capacitacion-video-vacio">
                    <span className="capacitacion-play">▶</span>
                    <p>Video de capacitación</p>
                    <small>Aquí se mostrará tu contenido</small>
                  </div>
                )}
              </div>

              <div className="capacitacion-contenido">
                <span className="capacitacion-categoria">
                  {capacitacion.categoria}
                </span>

                <h3>{capacitacion.titulo}</h3>

                <div className="capacitacion-separador" />

                <h4>Descripción técnica del contenido</h4>

                <p>{capacitacion.descripcion}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
