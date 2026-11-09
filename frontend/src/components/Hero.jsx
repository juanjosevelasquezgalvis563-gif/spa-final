import { useNavigate } from 'react-router-dom'
import videoSpa from '../assets/video-inicio.mp4';

export function Hero() {
  const navigate = useNavigate();

  return (
    <section className="hero" id="inicio">
      <div className="hero-content">
        

        <h1>
          Descubre tu mejor versión en
          <span> JC Alta Peluquería </span>
        </h1>

        <p>
          En JC Alta Peluquería, realzamos tu belleza con servicios diseñados para ti. 
          Descubre nuestros tratamientos capilares, diseños de color, cortes modernos, 
          maquillaje y cuidado personal, con atención profesional y dedicación en cada detalle.
          ¡Regálate una experiencia de belleza y bienestar que te haga brillar!
        </p>

        <div className="hero-buttons">
          <button
            className="btn-primary"
            onClick={() => navigate('/login')}
          >
            Agendar mi cita
          </button>

          <button
            className="btn-secondary"
            onClick={() => navigate('/registro')}
          >
            Crear cuenta
          </button>

        </div>

        <div className="hero-features">
          <span> Atención profesional</span>
          <span> Tratamientos capilares</span>
          <span> Estilo personalizado</span>
          <span> Experiencia de calidad</span>
        </div>

        <div className="hero-social">
          <div className="hero-social-heading">
            <span className="hero-social-line" aria-hidden="true" />
            <h2>Nuestras redes sociales</h2>
            <span className="hero-social-line" aria-hidden="true" />
          </div>

          <div className="hero-social-links">
            <a
              href="https://wa.link/okfwcg"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Escríbenos por WhatsApp (abre en una nueva pestaña)"
            >
              <svg className="hero-social-whatsapp" viewBox="0 0 32 32" aria-hidden="true">
                <path d="M16.04 3C8.86 3 3.02 8.82 3.02 15.98c0 2.28.6 4.5 1.74 6.46L3 29l6.75-1.72a13.1 13.1 0 0 0 6.28 1.6h.01c7.17 0 13.01-5.82 13.01-12.98A12.9 12.9 0 0 0 25.23 6.7 12.94 12.94 0 0 0 16.04 3Zm0 23.67h-.01a10.9 10.9 0 0 1-5.55-1.51l-.4-.24-4 .99 1.07-3.88-.26-.4a10.74 10.74 0 0 1-1.67-5.65c0-5.98 4.87-10.84 10.86-10.84 2.9 0 5.63 1.13 7.68 3.18a10.78 10.78 0 0 1 3.18 7.68c0 5.98-4.87 10.84-10.9 10.84Zm5.96-8.12c-.33-.16-1.94-.96-2.24-1.07-.3-.11-.52-.16-.74.16-.22.33-.85 1.07-1.04 1.29-.19.22-.38.25-.71.08-.33-.16-1.39-.51-2.65-1.63-.98-.87-1.64-1.94-1.83-2.27-.19-.33-.02-.5.14-.66.15-.15.33-.38.49-.57.16-.19.22-.33.33-.55.11-.22.05-.41-.03-.57-.08-.16-.74-1.77-1.02-2.42-.27-.63-.54-.55-.74-.56h-.63c-.22 0-.57.08-.87.41-.3.33-1.15 1.12-1.15 2.73s1.18 3.17 1.34 3.39c.16.22 2.32 3.54 5.62 4.96.79.34 1.4.54 1.88.69.79.25 1.51.22 2.08.13.63-.09 1.94-.79 2.21-1.56.27-.77.27-1.42.19-1.56-.08-.14-.3-.22-.63-.38Z" />
              </svg>
              <span>WhatsApp</span>
              <span className="hero-social-arrow" aria-hidden="true">↗</span>
            </a>

            <a
              href="https://www.instagram.com/jennifer_.correa/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Síguenos en Instagram (abre en una nueva pestaña)"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle className="hero-social-dot" cx="17.5" cy="6.8" r="1" />
              </svg>
              <span>Instagram</span>
              <span className="hero-social-arrow" aria-hidden="true">↗</span>
            </a>

            <a
              href="https://www.tiktok.com/@jcaltapeluqueria"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Síguenos en TikTok (abre en una nueva pestaña)"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M14 3v11.2a4.2 4.2 0 1 1-3.5-4.14V13a1.8 1.8 0 1 0 1.5 1.78V3h2c.34 2.2 1.58 3.68 3.8 4.15v2.1A7.4 7.4 0 0 1 14 7.5" />
              </svg>
              <span>TikTok</span>
              <span className="hero-social-arrow" aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </div>

      <div className="hero-image">
        <video
          src= {videoSpa}
          loading="lazy"
          width="350"
          height="350"
          autoPlay
          muted
          loop
          playsInline
          aria-label="Video de JC Alta Peluquería"
        />
      </div>
    </section>
  );
}

export default Hero;