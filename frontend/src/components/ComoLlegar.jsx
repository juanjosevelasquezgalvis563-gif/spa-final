
import VideoLlegada from "../assets/video-como-llegar.mp4";


const direccion = "Carrera 58C 23-02, Bello, Antioquia, Colombia";
const videoComoLlegar = VideoLlegada;

export default function ComoLlegar() {
  const mapa = `https://www.google.com/maps?q=${encodeURIComponent(direccion)}&output=embed`;
  const ruta = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(direccion)}`;

  return (
    <section className="como-llegar" id="ubicacion">
      <div className="como-llegar-container">
        <span className="como-llegar-etiqueta">VISÍTANOS</span>

        <h2>¿Cómo llegar a <span>JC Alta Peluquería?</span></h2>

        <p className="como-llegar-intro">
          Queremos que llegar a tu próxima experiencia de belleza sea fácil.
          Encuentra nuestra ubicación, consulta la dirección y conoce el camino
          antes de visitarnos.
        </p>

        <div className="ubicacion-grid">
          <article className="ubicacion-card">
            <div className="ubicacion-icono">📍</div>
            <h3>Nuestra ubicación</h3>
            <p>
              Consulta el mapa y encuentra fácilmente nuestro establecimiento.
            </p>

            <div className="mapa-contenedor">
              <iframe
                src={mapa}
                title="Ubicación de JC Alta Peluquería en Google Maps"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </article>

          <article className="ubicacion-card direccion-card">
            <div className="ubicacion-icono">🧭</div>
            <h3>Nuestra dirección</h3>
            <p className="direccion-texto">{direccion}</p>
            <p>
              Usa el siguiente botón para consultar la ruta desde tu ubicación.
            </p>

            <a
              className="ubicacion-boton"
              href={ruta}
              target="_blank"
              rel="noreferrer"
            >
              Cómo llegar en Google Maps
            </a>
          </article>

          <article className="ubicacion-card video-card">
            <div className="ubicacion-icono">🎥</div>
            <h3>Mira cómo llegar</h3>
            <p>
              Reproduce nuestro video para conocer el recorrido hasta la peluquería.
            </p>

            {videoComoLlegar ? (
              <video
                className="video-como-llegar"
                src={videoComoLlegar}
                controls
                playsInline
                preload="metadata"
              >
                Tu navegador no puede reproducir este video.
              </video>
            ) : (
              <div className="video-pendiente">
                <span>▶</span>
                <p>Aquí irá el video mostrando cómo llegar.</p>
              </div>
            )}
          </article>
        </div>
      </div>
    </section>
  );
}
