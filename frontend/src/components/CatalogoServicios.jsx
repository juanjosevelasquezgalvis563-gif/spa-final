
const servicios = [
  {
    id: 1,
    nombre: "Diseños De Color",
    descripcion:
      "Cortes modernos y clásicos, adaptados a tu estilo y personalidad.",
    precio: "",
    video: "",
  },
  {
    id: 2,
    nombre: "Corte y Cepillado",
    descripcion:
      "Cortes con acabados detallados y estilos para cada ocasión.",
    precio: "",
    video: "",
  },
  {
    id: 3,
    nombre: "Limpieza Facial",
    descripcion:
      "Perfilado y definición para una barba limpia y bien cuidada.",
    precio: "",
    video: "",
  },
  {
    id: 4,
    nombre: "Keratina",
    descripcion:
      "Encuentra un estilo que se adapte a tu imagen y personalidad.",
    precio: "",
    video: "",
  },
  {
    id: 5,
    nombre: "Maquillaje",
    descripcion:
      "Encuentra un estilo que se adapte a tu imagen y personalidad.",
    precio: "",
    video: "",
  },
  {
    id: 6,
    nombre: "Uñas y Manicure",
    descripcion:
      "Encuentra un estilo que se adapte a tu imagen y personalidad.",
    precio: "",
    video: "",
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
