import empleado1 from "../assets/empleado1.jpg";
import empleado2 from "../assets/empleado2.jpg";
import empleado3 from "../assets/empleado3.jpg";


const profesionales = [
  {
    nombre: "VALENTINA ALVAREZ",
    cargo: "MANICURISTA",
    descripcion:
      "apasionada por el arte, la belleza y el cuidado de las uñas. Mi objetivo es resaltar la belleza de tus manos a través de diseños únicos, acabados impecables y servicios realizados con dedicación, creatividad y atención a cada detalle.",
    imagen: empleado1,
  },
  {
    nombre: "MELANY ARANGO",
    cargo: "MANICURISTA",
    descripcion:
      "dedicada a realzar la belleza de tus manos y uñas con creatividad, pasión y profesionalismo. Me especializo en ofrecer servicios personalizados, cuidando cada detalle para que cada cliente disfrute de una experiencia única y especial.",
    imagen: empleado2,
  },
  {
    nombre: "EVELYN NINO",
    cargo: "ESTILISTA",
    descripcion:
      " apasionada por el mundo de la belleza y el cuidado personal. Me especializo en transformar y resaltar la belleza de cada persona, ofreciendo servicios personalizados que se adaptan a sus gustos, necesidades y estilo.",
    imagen: empleado3,
  },
   {
    nombre: "STIVEN PIEDRAHITA",
    cargo: "ESTILISTA",
    descripcion:
      "La belleza está en los detalles y cada persona merece un estilo que la haga sentir única. Como estilista, me encanta crear looks modernos, innovadores y llenos de personalidad.",
    imagen: empleado3,
  },
   {
    nombre: "JENNIFER CORREA",
    cargo: "ESTILISTA",
    descripcion:
      "comprometida con el bienestar, la imagen y la satisfacción de mis clientes. Ofrezco servicios de belleza con dedicación, responsabilidad y atención personalizada, buscando siempre resaltar lo mejor de cada persona.",
    imagen: empleado1,
  },
];

function Profesionales() {
  return (
    <section className="profesionales-section" id="profesionales">
      <div className="profesionales-container">
        <div className="profesionales-header">
          <span className="profesionales-eyebrow">
            TALENTO · EXPERIENCIA · ESTILO
          </span>

          <h2>
            Nuestros <span>profesionales</span>
          </h2>

          <p>
            Detrás de cada gran resultado hay un equipo apasionado por la
            belleza. Conoce a las personas que hacen de cada visita una
            experiencia especial.
          </p>
        </div>

        <div className="profesionales-grid">
          {profesionales.map((profesional, index) => (
            <article className="profesional-card" key={index}>
              <div className="profesional-image">
                <img
                  src={profesional.imagen}
                  alt={profesional.nombre}
                  loading="lazy"
                />

                <span className="profesional-number">
                  0{index + 1}
                </span>
              </div>

              <div className="profesional-info">
                <span className="profesional-cargo">
                  {profesional.cargo}
                </span>

                <h3>{profesional.nombre}</h3>

                <p>{profesional.descripcion}</p>

                <div className="profesional-line"></div>
              </div>
            </article>
          ))}
        </div>

        <div className="profesionales-footer">
          <span className="profesionales-footer-line"></span>
          <p>Tu estilo, en manos de profesionales.</p>
          <span className="profesionales-footer-line"></span>
        </div>
      </div>
    </section>
  );
}

export default Profesionales;