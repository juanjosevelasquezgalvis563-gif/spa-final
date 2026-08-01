import react from 'react'
export function Hero() {
  return (
    <section className="hero">
      <div className="hero-content">
        <span className="hero-tag">
          ✨ Belleza • Estilo • Elegancia
        </span>

        <h1>
          Descubre tu mejor versión en
          <span> JC Alta Peluquería</span>
        </h1>

        <p>
            En  JC Alta Peluquería ofrecemos una experiencia diseñada
          para resaltar tu belleza y bienestar. Conoce nuestros servicios,
          tratamientos capilares, cortes modernos y atención profesional en un
          espacio pensado para ti.
        </p>
        <div className="hero-features">
          <span> Atención profesional</span>
          <span> Tratamientos capilares</span>
          <span> Estilo personalizado</span>
          <span> Experiencia de calidad</span>
        </div>

      </div>

      <div className="hero-image">
        <img
          src="https://images.unsplash.com/photo-1562322140-8baeececf3df"
          alt="VelureSpa"
        />
      </div>
    </section>
  );
}

export default Hero;