import { useNavigate } from 'react-router-dom'

export function Hero() {
  const navigate = useNavigate();

  return (
    <section className="hero" id="inicio">
      <div className="hero-content">
        <span className="hero-tag">
          ✨ Belleza • Estilo • Elegancia
        </span>

        <h1>
          Descubre tu mejor versión en
          <span> JC Alta Peluquería</span>
        </h1>

        <p>
          En JC Alta Peluquería ofrecemos una experiencia diseñada
          para resaltar tu belleza y bienestar. Conoce nuestros servicios,
          tratamientos capilares, cortes modernos y atención profesional en un
          espacio pensado para ti.
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
        <img
          src="https://images.unsplash.com/photo-1562322140-8baeececf3df?w=900&q=80"
          alt="JC Alta Peluquería"
          loading="lazy"
          width="900"
          height="1125"
        />

        <div className="hero-badge">
          <span className="hero-badge-icon" aria-hidden="true">✦</span>

          <div>
            <strong>Velure Spa</strong>
            <span>JC Alta Peluquería</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;