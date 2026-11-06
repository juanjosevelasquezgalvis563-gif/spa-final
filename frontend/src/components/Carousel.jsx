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
      title: 'Corte, cepillado y cuidado capilar',
      description: 'Un estilo pensado para resaltar tu esencia.',
    },
    {
      image: imagenBelleza2,
      title: 'Manicure y Pedicure',
      description: 'Cuidado y detalle en cada acabado.',
    },
    {
      image: imagenBelleza3,
      title: 'Masajes y tratamientos faciales y corporales',
      description: 'Un espacio para relajarte y renovar tu bienestar.',
    },
  ];

  return (
    <section className="showcase" id="showcase">
      <div className="showcase-head">
        <span className="showcase-tag">Nuestros espacios</span>

        <h2>Un ambiente pensado para ti</h2>

        <p>
          En JC Alta Peluquería, cada espacio está preparado para que disfrutes
          de tus servicios con comodidad, cuidado y atención personalizada.
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
                  <div className="showcase-caption">
                    <span className="showcase-caption-label">JC Alta Peluquería</span>
                    <h3>{slide.title}</h3>
                    <p>{slide.description}</p>
                  </div>
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