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
      </div>

      <div className="hero-image">
        <video
          src= {videoSpa}
          alt="JC Alta Peluquería"
          loading="lazy"
          width="350"
          height="350"
          autoPlay
          muted
          loop
        />

        <div className="hero-badge">
          <span className="hero-badge-icon" aria-hidden="true">✦</span>

          
        </div>
      </div>
    </section>
  );
}

export default Hero;