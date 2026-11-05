import empleado1 from "../assets/empleado1.jpg";
import empleado2 from "../assets/empleado2.jpg";
import empleado3 from "../assets/empleado3.jpg";


const profesionales = [
  {
    nombre: "Nombre del profesional",
    cargo: "Estilista profesional",
    descripcion:
      "Especialista en transformar tu estilo y resaltar tu belleza con atención personalizada.",
    imagen: empleado1,
  },
  {
    nombre: "Nombre del profesional",
    cargo: "Especialista en color",
    descripcion:
      "Experto en coloración, técnicas modernas y resultados que se adaptan a tu estilo.",
    imagen: empleado2,
  },
  {
    nombre: "Nombre del profesional",
    cargo: "Experto en belleza",
    descripcion:
      "Comprometido con el cuidado personal, los detalles y una experiencia única para cada cliente.",
    imagen: empleado3,
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