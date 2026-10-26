

const reels = [
  {
    id: "DexbzN6J7nO",
    titulo: "Nuestros últimos trabajos",
  },
  {
    id: "DemKG2wxSCl",
    titulo: "Estilo y tendencia",
  },
  {
    id: "DecE2h0R38R",
    titulo: "Descubre nuestros cortes",
  },
];

export default function Novedades() {
  return (
    <section className="novedades" id="novedades">
      <div className="novedades-header">
        <span className="novedades-etiqueta">
          JC ALTA PELUQUERÍA
        </span>

        <h2>Novedades</h2>

        <p>
          Descubre nuestros últimos trabajos, estilos
          y tendencias.
        </p>
      </div>

      <div className="novedades-grid">
        {reels.map((reel) => (
          <article className="novedad-card" key={reel.id}>
            <iframe
              src={`https://www.instagram.com/reel/${reel.id}/embed`}
              title={reel.titulo}
              loading="lazy"
              allowFullScreen
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            />

            <h3>{reel.titulo}</h3>
          </article>
        ))}
      </div>

      <a
        className="novedades-instagram"
        href="https://www.instagram.com/jennifer_.correa/"
        target="_blank"
        rel="noreferrer"
      >
        Ver más en Instagram ↗
      </a>
    </section>
  );
}
