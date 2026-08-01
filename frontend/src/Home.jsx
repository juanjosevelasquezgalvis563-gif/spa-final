import Hero from './components/Hero';
import Carousel from './components/carousel';
import logo from './assets/image.png';
import './App.css';
import Footer from './components/Footer';
import { useNavigate } from 'react-router-dom';

function App() {
    const navigate = useNavigate();
  return (
    <>
      <header className="navbar">
        <img src={logo} alt="VelureSpa" className="logo" />

        <div className="auth-buttons">
          <button onClick={() => navigate('/login')} className="btn-login">
            Iniciar Sesión
          </button>

          <button onClick={() => navigate('/registro')} className="btn-register">
            Registrarse
          </button>
        </div>
      </header>

      <Carousel />

      <Hero />
      <Footer/>
    </>
  );
}

export default App;