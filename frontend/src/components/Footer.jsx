import React from 'react';


export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">

        <div className="footer-brand">
          <span className="footer-tagline">Belleza, Cosmetica y cuidado personal</span>
          <h2> JC ALTA PELUQUERIA</h2>
          <div className="footer-line"></div>
          <p>
            Creamos experiencias de belleza pensadas para
             resaltar tu esencia y devolverte la confianza.
          </p>
          <a href="#servicios" className="footer-cta">
            Descubre nuestros servicios <span>↗</span>
          </a>
        </div>

        <div className="footer-section">
          <h3>Explora</h3>
          <ul>
            <li><a href="/">Inicio</a></li>
            <li><a href="#servicios">Nuestros servicios</a></li>
            <li><a href="#nosotros">Sobre nosotros</a></li>
            
          </ul>
        </div>

        <div className="footer-section">
          <h3>Contáctanos</h3>
          <ul className="footer-contact">
            <li>
              <span className="footer-icon">⌖</span>
              <span>Carrera 58C 23-02, Bello, Antioquia, Colombia</span>
            </li>
            <li>
              <span className="footer-icon">☎</span>
              <a href="wa.link/okfwcg" target="_blank" rel="noreferrer">
                
              </a>
            </li>
            <li>
              <span className="footer-icon">✉</span>
              <a href="jcaltapeluqueria9@gmail.com">
                jcaltapeluqueria9@gmail.com
              </a>
            </li>
          </ul>
        </div>

        <div className="footer-section footer-social">
          <h3>Síguenos</h3>
          <p>Experta en color y recuperación capilar</p>
          <div className="footer-social-links">
            <a href="https://www.instagram.com/jennifer_.correa/" target="_blank" rel="noreferrer" aria-label="Instagram">ig</a>
            <a href="https://www.tiktok.com/@jcaltapeluqueria" target="_blank" rel="noreferrer" aria-label="TikTok">♪</a>
          </div>
          <span className="footer-social-note">Belleza en cada detalle.</span>
        </div>

      </div>

      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} VelureSpa. Todos los derechos reservados.</p>
        <p className="footer-made">Hecho con <span>♥</span> para tu bienestar</p>
      </div>
    </footer>
    
  );
}
