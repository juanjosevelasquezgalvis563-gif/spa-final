import Hero from './components/Hero';
import Carousel from './components/Carousel';
import logo from './assets/image.png';
import Footer from './components/Footer';
import About from "./components/About.jsx";
import ComoLlegar from "./components/ComoLlegar";
import Capacitaciones from "./components/Capacitaciones";
import Educate from "./components/Educate";
import CatalogoServicios from "./components/CatalogoServicios";
import Novedades from './components/novedades';
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
            <a href="#sobre-nosotros">Nosotros</a>
            <a href="#catalogo-servicios">Nuestros Servicios</a>
            <a href="#showcase">Ambientes</a>
            <a href="#capacitaciones">Capacitaciones</a>
            <a href="#educate">Educate</a>
            <a href="#ubicacion">Cómo Llegar</a>
            <a href="#novedades">Novedades</a>
            
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
        <About />
        <CatalogoServicios />
        <Carousel />
        <Capacitaciones />
        <Educate />
        <ComoLlegar />
        <Novedades />
      </main>

      <Footer/>
    </>
  );
}

export default App;