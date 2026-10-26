import React from "react";
import { useNavigate } from "react-router-dom";
import videoSpa from "../assets/nuestra-esencia.mp4";


function About() {
  const navigate = useNavigate();

  return (
    <section className="about-section" id="sobre-nosotros">
      <div className="about-container">

        {/* Texto de presentación */}
        <div className="about-content">
          <span className="about-eyebrow">
            ✦ NUESTRA ESENCIA ✦
          </span>

          <h2 className="about-title">
            Un espacio para <br />
            <span>reconectar contigo</span>
          </h2>

          <div className="about-divider"></div>

          <p className="about-intro">
            Bienvenido a Velure SPA
          </p>

          <p className="about-description">
            Creemos que el bienestar comienza cuando te regalas un
            momento para ti. Por eso, hemos creado un espacio donde
            la tranquilidad, el cuidado personal y la armonía se
            encuentran para brindarte una experiencia especial.
          </p>

          <p className="about-description">
            Queremos que cada visita sea una pausa de la rutina,
            un momento para respirar, renovar tu energía y dedicarte
            el cuidado que mereces. Nuestro propósito es acompañarte
            a sentirte bien por dentro y por fuera.
          </p>

          <p className="about-quote">
            "Tu bienestar no es un lujo, es una forma de amarte."
          </p>

          <button
            className="about-button"
            onClick={() => navigate("/login")}
          >
            Regálate un momento <span>↗</span>
          </button>
        </div>

        {/* Espacio para el video */}
        <div className="about-media">
          <div className="about-video-frame">
            <video
              className="about-video"
              src={videoSpa}
              autoPlay
              muted
              loop
              playsInline
              controls
              preload="metadata"
            />

            <div className="about-video-caption">
              <span className="about-caption-icon">✧</span>
              <div>
                <span className="about-caption-title">
                  La experiencia Velure
                </span>
                <span className="about-caption-subtitle">
                  Un momento solo para ti
                </span>
              </div>
            </div>
          </div>

          <div className="about-floating-note">
            <span>♡</span>
            Bienestar en cada detalle
          </div>
        </div>

      </div>

      {/* Valores de la marca */}
      <div className="about-values">
        <div className="about-value">
          <span className="about-value-icon">✿</span>
          <h3>Bienestar</h3>
          <p>Un momento para renovar tu energía.</p>
        </div>

        <div className="about-value">
          <span className="about-value-icon">♡</span>
          <h3>Cuidado personal</h3>
          <p>Dedicarte tiempo también es importante.</p>
        </div>

        <div className="about-value">
          <span className="about-value-icon">❋</span>
          <h3>Tranquilidad</h3>
          <p>Un espacio para desconectar de la rutina.</p>
        </div>
      </div>
    </section>
  );
}

export default About;