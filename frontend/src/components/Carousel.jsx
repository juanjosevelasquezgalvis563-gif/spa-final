import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import imagenBelleza1 from '../assets/carousel1.jpg';
import imagenBelleza2 from '../assets/carousel2.jpg';
import imagenBelleza3 from '../assets/carousel3.jpg';

import 'swiper/css';
import 'swiper/css/pagination';

function Carousel() {
  const slides = [
    {
      image: imagenBelleza1,
      title: 'Belleza y Elegancia',
    },
    {
      image: imagenBelleza2,
      title: 'Spa & Relajación',
    },
    {
      image: imagenBelleza3,
      title: 'Transforma tu Estilo',
    },
  ];

  return (
    <section className="showcase" id="showcase">
      <div className="showcase-head">
        <span className="showcase-tag">Nuestros espacios</span>

        <h2>Un ambiente pensado para ti</h2>

        <p>
          En Velure Spa, creemos que el bienestar es un arte. Por eso, hemos diseñado cada uno de nuestros rincones 
          para ofrecerte una experiencia distinguida y profundamente relajante.
          Conéctate con la tranquilidad y déjate consentir.
        </p>
      </div>

      <div className="showcase-carousel">
        <Swiper
          modules={[Autoplay, Pagination]}
          slidesPerView={1}
          loop={true}
          autoplay={{
            delay: 4500,
            disableOnInteraction: false,
          }}
          pagination={{ clickable: true }}
        >
          {slides.map((slide, index) => (
            <SwiperSlide key={index}>
              <div
                className="slide"
                style={{
                  backgroundImage: `url(${slide.image})`,
                }}
              >
                <div className="overlay">
                  <h3>{slide.title}</h3>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}

export default Carousel;