import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Hero from './components/Hero';
import Carousel from './components/Carousel';
import Footer from './components/Footer';
import About from './components/About';
import ComoLlegar from './components/ComoLlegar';
import Capacitaciones from './components/Capacitaciones';
import Profesionales from './components/Profesionales';
import Educate from './components/Educate';
import CatalogoServicios from './components/CatalogoServicios';
import Novedades from './components/novedades';

import logo from './assets/image.png';

function App() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const handleSectionNavigation = (event, sectionId) => {
    event.preventDefault();

    const section = document.getElementById(sectionId);

    if (section) {
      section.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

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
            <img src={logo} alt="Velure Spa" className="logo" />
          </a>

          <nav className="navbar-links" aria-label="Secciones">
            <a href="#inicio" onClick={(event) => handleSectionNavigation(event, 'inicio')}>
              Inicio
            </a>
            <a
              href="#sobre-nosotros"
              onClick={(event) => handleSectionNavigation(event, 'sobre-nosotros')}
            >
              Nosotros
            </a>
            <a
              href="#catalogo-servicios"
              onClick={(event) => handleSectionNavigation(event, 'catalogo-servicios')}
            >
              Nuestros Servicios
            </a>
            <a href="#showcase" onClick={(event) => handleSectionNavigation(event, 'showcase')}>
              Ambientes
            </a>
            <a
              href="#capacitaciones"
              onClick={(event) => handleSectionNavigation(event, 'capacitaciones')}
            >
              Capacitaciones
            </a>
            <a href="#educate" onClick={(event) => handleSectionNavigation(event, 'educate')}>
              Educate
            </a>
            <a
              href="#profesionales"
              onClick={(event) => handleSectionNavigation(event, 'profesionales')}
            >
              Profesionales
            </a>
            <a href="#ubicacion" onClick={(event) => handleSectionNavigation(event, 'ubicacion')}>
              Cómo Llegar
            </a>
            <a href="#novedades" onClick={(event) => handleSectionNavigation(event, 'novedades')}>
              Novedades
            </a>
          </nav>

          <nav className="auth-buttons" aria-label="Acceso de usuario">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="btn-login"
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => navigate('/registro')}
              className="btn-register"
            >
              Registrarse
            </button>
          </nav>
        </div>
      </header>

      <main className="landing-main">
        <Hero />
        <About />
        <CatalogoServicios />
        <Carousel />
        <Capacitaciones />
        <Educate />
        <Profesionales />
        <ComoLlegar />
        <Novedades />
      </main>

      <Footer />
    </>
  );
}

export default App;
