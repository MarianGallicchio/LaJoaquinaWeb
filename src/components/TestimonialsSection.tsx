import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Star, 
  ChevronLeft, 
  ChevronRight, 
  Quote, 
  CheckCircle2, 
  MapPin, 
  Heart,
  Sparkles
} from 'lucide-react';
import { TESTIMONIALS } from '../data/products';

export const TestimonialsSection: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);

  const testimonials = TESTIMONIALS;

  // Auto slide every 6 seconds unless user is hovering
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isPaused, testimonials.length]);

  const handlePrev = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const handleNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const current = testimonials[currentIndex];

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 120 : -120,
      opacity: 0,
      scale: 0.96,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: 'spring', stiffness: 320, damping: 28 },
        opacity: { duration: 0.28 },
        scale: { duration: 0.28 },
      },
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -120 : 120,
      opacity: 0,
      scale: 0.96,
      transition: {
        x: { type: 'spring', stiffness: 320, damping: 28 },
        opacity: { duration: 0.2 },
      },
    }),
  };

  return (
    <section 
      id="testimonios" 
      className="py-16 sm:py-24 bg-[#F5EFE6] border-y border-[#E5D7BF] relative overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background soft ambient paw prints */}
      <div className="absolute top-6 left-10 text-[#E8DFC9] text-7xl select-none pointer-events-none opacity-40 font-serif">
        🐾
      </div>
      <div className="absolute bottom-6 right-12 text-[#E8DFC9] text-8xl select-none pointer-events-none opacity-30 font-serif">
        🐾
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 bg-[#E8F3EF] text-[#1B4E43] text-xs font-black px-3.5 py-1 rounded-full uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#EFA332]" />
            <span>Familias Felices de La Juaquina</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-[#1B4E43] font-display">
            Testimonios de Clientes y sus Mascotas
          </h2>
          <p className="text-xs sm:text-sm text-[#6A5949] mt-2.5">
            Clientes de Bella Vista, todo el AMBA y el país que confían en nuestros alimentos, piedras y envíos rápidos.
          </p>
        </div>

        {/* Carousel Container */}
        <div className="relative max-w-4xl mx-auto">
          
          <div className="relative min-h-[380px] sm:min-h-[320px] flex items-center justify-center">
            <AnimatePresence custom={direction} mode="wait">
              <motion.div
                key={current.id}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="w-full bg-[#FFFDF9] rounded-3xl border border-[#E5D7BF] shadow-lg p-6 sm:p-10 flex flex-col md:flex-row gap-6 sm:gap-8 items-center"
              >
                
                {/* Pet Image & Badge */}
                <div className="relative shrink-0 w-36 h-36 sm:w-48 sm:h-48 rounded-2xl overflow-hidden shadow-md bg-[#FAF5EC] border-2 border-[#FAF5EC]">
                  <img
                    src={current.petImage}
                    alt={current.petName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 right-2 bg-black/65 backdrop-blur-xs text-white text-[11px] font-bold py-1 px-2 rounded-xl text-center truncate">
                    {current.petType === 'perro' ? '🐶' : '🐱'} {current.petName}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col justify-between text-left space-y-3 w-full">
                  
                  {/* Top Bar: Stars + Verified */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1 text-[#EFA332]">
                      {[...Array(current.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-[#EFA332]" />
                      ))}
                    </div>

                    {current.verifiedPurchase && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#256B5C] bg-[#E8F3EF] px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        Compra Verificada
                      </span>
                    )}
                  </div>

                  {/* Quote */}
                  <div className="relative">
                    <Quote className="w-7 h-7 text-[#EFA332]/40 absolute -top-3 -left-3 -z-10" />
                    <p className="text-sm sm:text-base text-[#3D3025] font-medium leading-relaxed italic">
                      "{current.comment}"
                    </p>
                  </div>

                  {/* Purchased product tag */}
                  <div className="pt-1">
                    <span className="text-[11px] text-[#7A6A59] bg-[#FAF5EC] border border-[#E8DFC9] px-2.5 py-1 rounded-lg font-semibold inline-block">
                      🛒 Producto: <strong className="text-[#1B4E43]">{current.purchasedProduct}</strong>
                    </span>
                  </div>

                  {/* Author Profile */}
                  <div className="flex items-center justify-between pt-3 border-t border-[#F0E6D2]">
                    <div className="flex items-center gap-3">
                      <img
                        src={current.avatar}
                        alt={current.clientName}
                        className="w-10 h-10 rounded-full object-cover border border-[#E3D6BE]"
                      />
                      <div>
                        <h4 className="text-sm font-bold text-[#1B4E43] font-display">
                          {current.clientName}
                        </h4>
                        <span className="text-xs text-[#7A6A59] flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#DE5D4E]" />
                          {current.location} · {current.petBreed}
                        </span>
                      </div>
                    </div>

                    <span className="text-[11px] text-[#8A7969]">
                      {current.date}
                    </span>
                  </div>

                </div>

              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between mt-8">
            
            {/* Prev Button */}
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={handlePrev}
              className="w-10 h-10 rounded-full bg-[#FFFDF9] hover:bg-[#1B4E43] text-[#1B4E43] hover:text-white border border-[#E5D7BF] flex items-center justify-center transition-colors shadow-xs cursor-pointer"
              aria-label="Testimonio anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </motion.button>

            {/* Indicator Dots */}
            <div className="flex items-center gap-2">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setDirection(idx > currentIndex ? 1 : -1);
                    setCurrentIndex(idx);
                  }}
                  className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                    idx === currentIndex
                      ? 'w-7 bg-[#1B4E43]'
                      : 'w-2.5 bg-[#D5C7B0] hover:bg-[#BBAA90]'
                  }`}
                  aria-label={`Ir al testimonio ${idx + 1}`}
                />
              ))}
            </div>

            {/* Next Button */}
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={handleNext}
              className="w-10 h-10 rounded-full bg-[#FFFDF9] hover:bg-[#1B4E43] text-[#1B4E43] hover:text-white border border-[#E5D7BF] flex items-center justify-center transition-colors shadow-xs cursor-pointer"
              aria-label="Siguiente testimonio"
            >
              <ChevronRight className="w-5 h-5" />
            </motion.button>

          </div>

          {/* Rating counter trust badge */}
          <div className="mt-8 text-center">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5A4D3F] bg-white/70 backdrop-blur-xs px-4 py-1.5 rounded-full border border-[#E3D6BE]">
              <Heart className="w-3.5 h-3.5 text-[#DE5D4E] fill-[#DE5D4E]" />
              <span>4.9 / 5 estrellas promedio en más de 850 pedidos entregados</span>
            </span>
          </div>

        </div>

      </div>
    </section>
  );
};
