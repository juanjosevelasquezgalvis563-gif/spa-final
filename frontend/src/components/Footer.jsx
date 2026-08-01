import React from 'react'

export default function Footer() {
    return (


     <footer className="footer">
      <div className="footer-container">
        
        <div className="footer-section">
          <h2>Velure Spa</h2>
          <p>
            Belleza, estilo y bienestar en un solo lugar.
            Transformamos tu imagen con profesionalismo y elegancia.
          </p>
        </div>

        <div className="footer-section">
          <h3>Contacto</h3>
          <p>📍 Medellín, Colombia</p>
          <p>📞 +57 300 123 4567</p>
          <p>✉️ contacto@velurespa.com</p>
        </div>

        <div className="footer-section">
          <h3>Redes Sociales</h3>
          <ul>
            <li>Instagram</li>
            <li>Facebook</li>
            <li>TikTok</li>
          </ul>
        </div>

      </div>

      <div className="footer-bottom">
        <p>© 2026 Velure Spa. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}

