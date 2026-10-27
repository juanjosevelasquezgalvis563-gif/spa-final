import video1 from "../assets/educate1.mp4";
import video2 from "../assets/educate2.mp4";
import video3 from "../assets/educate3.mp4";
import video4 from "../assets/educate4.mp4";
import video5 from "../assets/educate5.mp4";


const lecciones = 
[
  {
    numero: "01",
    categoria: "PRODUCTOS",
    titulo: "Productos que JAMÁS deberías comprar para tu cabello",
    descripcion: "Conoce cuáles son los productos comerciales que pueden dañar tu fibra capilar y tu piel cabelluda a largo plazo, desde champús demasiado abrasivos hasta mascarillas con efectos superficiales.",
    consejo: "Evita champús de limpieza muy agresivos que resequen tu hebra capilar o mascarillas que solo den una falsa sensación de suavidad sin nutrir realmente el cabello.",
    duracion: "00:32",
    video: video1,
    destacada: true,
  },
  {
    numero: "02",
    categoria: "RUTINA CAPILAR",
    titulo: "El lavado también hace la diferencia",
    descripcion: "Descubre los hábitos reales para conseguir un cabello de revista, evitando prácticas incorrectas como el uso de agua hirviendo, la falta de termoprotector o dormir con el cabello mojado[cite: 5].",
    consejo: "Haz exactamente lo contrario a los mitos comunes: protege tu cabello del calor excesivo, evita dormir con la hebra húmeda y cuida la salud de tu fibra capilar[cite: 5].",
    duracion: "00:28",
    video: video2,
  },
  {
    numero: "03",
    categoria: "TRATAMIENTOS",
    titulo: "Cómo mantener los resultados de tu keratina",
    descripcion: "Descubre las 3 cosas que jamás debes hacer después de aplicarte una keratina para conservar su duración, suavidad y brillo por más tiempo[cite: 6].",
    consejo: "Evita usar champú con sal, protégete adecuadamente al visitar la piscina, el mar o el sauna, y espera al menos un mes antes de realizarte un nuevo procedimiento de color[cite: 6].",
    duracion: "00:32",
    video: video3,
  },
  {
    numero: "04",
    categoria: "TENDENCIAS DE COLOR",
    titulo: "Descubre las mejores tendencias en tonos para tu cabello",
    descripcion: "Conoce estilos como el Avellana Hair, Teddy Bear Caramel Hair y Sunflower Blonde Hair, que ofrecen opciones desde castaños cálidos de bajo mantenimiento hasta rubios dorados luminosos[cite: 7].",
    consejo: "Elige el tono que mejor se adapte a tu estilo y nivel de mantenimiento deseado, ya sea un castaño elegante o un rubio radiante que resalte tu mirada[cite: 7].",
    duracion: "00:30",
    video: video4,
  },
  {
    numero: "05",
    categoria: "CUIDADO DEL COLOR",
    titulo: "Tu color merece una rutina especial",
    descripcion: "Descubre los 3 pasos esenciales para evitar el cabello seco en verano: utiliza un spray multibeneficios como protector (Paso 1), lava tu melena con un champú ultra nutritivo (Paso 2) y aplica una mascarilla capilar intensiva (Paso 3) para mantener tu color y brillo protegidos bajo el sol[cite: 8].",
    consejo: "Sigue estos 3 pasos clave durante tus vacaciones o días de exposición solar para blindar tu cabello contra la resequedad y conservar la vitalidad de tu tinte[cite: 8].",
    duracion: "00:39",
    video: video5,
  }
];

function Reproductor({ leccion }) {
  return (
    <div className="edu-player">
      {leccion.video ? (
        <video
          src={leccion.video}
          controls
          playsInline
          preload="metadata"
        >
          Tu navegador no puede reproducir este video.
        </video>
      ) : (
        <div className="edu-placeholder">
          <span className="edu-placeholder-num">{leccion.numero}</span>
          <span className="edu-play">▶</span>
          <span className="edu-placeholder-text">
            TU PRÓXIMA LECCIÓN
          </span>
        </div>
      )}

      <span className="edu-duration">{leccion.duracion}</span>
    </div>
  );
}

export default function Educate() {
  const principal = lecciones[0];
  const resto = lecciones.slice(1);

  return (
    <section className="edu-section" id="educate">
      <div className="edu-shell">
        <header className="edu-heading">
          <div className="edu-heading-top">
            <span className="edu-overline">
              JC ALTA PELUQUERÍA <i />
              EDUCACIÓN PARA TI
            </span>
            <span className="edu-edition">BEAUTY GUIDE / 001</span>
          </div>

          <div className="edu-heading-main">
            <h2>
              Tu belleza.
              <br />
              <em>Tu conocimiento.</em>
            </h2>

            <div className="edu-heading-copy">
              <span className="edu-small-label">BIENVENIDA A EDUCATE</span>
              <p>
                Aprende a cuidar tu cabello más allá del salón.
                Encuentra recomendaciones sobre productos, rutinas
                y tratamientos, explicadas de forma sencilla por
                nuestros profesionales.
              </p>
              <a href="#edu-lecciones">
                DESCUBRIR LAS LECCIONES <span>↘</span>
              </a>
            </div>
          </div>

          <div className="edu-heading-bottom">
            <span>CONOCER ES TAMBIÉN CUIDAR.</span>
            <span>CONSEJOS PARA TU DÍA A DÍA</span>
          </div>
        </header>

        <div className="edu-feature">
          <div className="edu-feature-label">
            <span>LA LECCIÓN DESTACADA</span>
            <span>01 — 05</span>
          </div>

          <div className="edu-feature-grid">
            <div className="edu-feature-media">
              <Reproductor leccion={principal} />
              <span className="edu-media-caption">
                APRENDE A TU RITMO
              </span>
            </div>

            <div className="edu-feature-content">
              <span className="edu-category">
                {principal.categoria}
              </span>

              <span className="edu-big-number">01</span>

              <h3>{principal.titulo}</h3>

              <p className="edu-description">
                {principal.descripcion}
              </p>

              <div className="edu-tip">
                <span className="edu-tip-symbol">✳</span>
                <div>
                  <strong>EL CONSEJO DEL PROFESIONAL</strong>
                  <p>{principal.consejo}</p>
                </div>
              </div>

              <span className="edu-signature">
                JC Alta Peluquería · Cuidado personalizado
              </span>
            </div>
          </div>
        </div>

        <div className="edu-lessons" id="edu-lecciones">
          <div className="edu-lessons-heading">
            <div>
              <span className="edu-small-label">
                PEQUEÑOS CAMBIOS, GRANDES CUIDADOS
              </span>
              <h3>Continúa aprendiendo<span>.</span></h3>
            </div>
            <p>
              Cinco minutos pueden enseñarte
              algo nuevo sobre tu rutina.
            </p>
          </div>

          <div className="edu-timeline">
            {resto.map((leccion, index) => (
              <article
                className={`edu-lesson-row ${
                  index % 2 === 1 ? "edu-reverse" : ""
                }`}
                key={leccion.numero}
              >
                <div className="edu-lesson-number">
                  {leccion.numero}
                </div>

                <div className="edu-lesson-media">
                  <Reproductor leccion={leccion} />
                </div>

                <div className="edu-lesson-content">
                  <span className="edu-category">
                    {leccion.categoria}
                  </span>

                  <h4>{leccion.titulo}</h4>

                  <p className="edu-description">
                    {leccion.descripcion}
                  </p>

                  <div className="edu-inline-tip">
                    <span>PARA RECORDAR</span>
                    <p>{leccion.consejo}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <footer className="edu-ending">
          <div className="edu-ending-mark">E.</div>

          <div className="edu-ending-text">
            <span>EL CUIDADO CONTINÚA EN CASA</span>
            <h3>Tu rutina también merece atención.</h3>
            <p>
              Guarda tus recomendaciones favoritas y consulta
              a nuestros profesionales cuando tengas dudas.
            </p>
          </div>

          <a href="#educate">
            VOLVER AL INICIO ↑
          </a>
        </footer>
      </div>
    </section>
  );
}
