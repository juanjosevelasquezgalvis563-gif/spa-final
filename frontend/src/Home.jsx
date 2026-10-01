import Hero from './components/Hero';
import Carousel from './components/Carousel';
import logo from './assets/image.png';
import Footer from './components/Footer';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function App() {
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 40);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

  return (
    <>
      <header className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
        <div className="navbar-inner">
          <a
            className="navbar-brand"
            href="/"
            onClick={(event) => {
              event.preventDefault();
              navigate('/');
            }}
            aria-label="Velure Spa - Inicio"
          >
            <img src={logo} alt="VelureSpa" className="logo" />
          </a>

          <nav className="navbar-links" aria-label="Secciones">
            <a href="#inicio">Inicio</a>
            <a href="#showcase">Galería</a>
          </nav>

          <nav className="auth-buttons" aria-label="Acceso de usuario">
            <button onClick={() => navigate('/login')} className="btn-login">
              Iniciar Sesión
            </button>

            <button onClick={() => navigate('/registro')} className="btn-register">
              Registrarse
            </button>
          </nav>
        </div>
      </header>

      <main>
        <Hero />
        <Carousel />
      </main>

      <Footer/>
    </>
  );
}

export default App;