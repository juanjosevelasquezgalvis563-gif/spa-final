import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/pagination';

function Carousel() {
  const slides = [
    {
      image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1600',
      title: 'Belleza y Elegancia',
    },
    {
      image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1600',
      title: 'Spa & Relajación',
    },
    {
      image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=1600',
      title: 'Transforma tu Estilo',
    },
  ];

  return (
    <Swiper
      modules={[Autoplay, Pagination]}
      slidesPerView={1}
      loop={true}
      autoplay={{
        delay: 3000,
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
              <h1>{slide.title}</h1>
            </div>
          </div>
        </SwiperSlide>
      ))}
    </Swiper>
  );
}

export default Carousel;