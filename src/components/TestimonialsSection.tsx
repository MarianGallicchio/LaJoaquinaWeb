import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { MessageCircle, Star, Heart, BadgeCheck } from 'lucide-react';
import { StoreSettings, Review } from '../types';
import { DEFAULT_SETTINGS, waLink } from '../lib/storeSettings';
import { fetchAllReviewsAdmin } from '../lib/cloudDb';

// Opiniones reales: muestra las reseñas aprobadas en el admin.
// Si todavía no hay, invita a dejar la primera por WhatsApp.
export const TestimonialsSection: React.FC<{ settings?: StoreSettings }> = ({ settings }) => {
  const store = settings || DEFAULT_SETTINGS;
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    let alive = true;
    fetchAllReviewsAdmin()
      .then((all) => {
        if (alive) setReviews(all.filter((r) => r.approved).slice(0, 6));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section id="testimonios" className="py-16 sm:py-24 relative overflow-hidden">
      <div className="absolute top-6 left-10 text-[#E8DFC9] text-7xl select-none pointer-events-none opacity-40 font-serif">
        🐾
      </div>
      <div className="absolute bottom-6 right-12 text-[#E8DFC9] text-8xl select-none pointer-events-none opacity-30 font-serif">
        🐾
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1B4E43] font-display">
            Opiniones de clientes
          </h2>
          <p className="text-sm text-[#6A5949] mt-1">
            Solo reseñas reales de compras verificadas, nada inventado.
          </p>
        </div>

        {reviews.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="max-w-2xl mx-auto bg-[#FFFDF9] border border-[#E5D7BF] rounded-3xl p-8 sm:p-10 shadow-3d text-center"
          >
            <div className="w-16 h-16 rounded-full bg-[#E8F3EF] flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 text-[#EFA332]" />
            </div>
            <p className="text-sm text-[#6A5949] mt-2 leading-relaxed">
              Todavía no publicamos reseñas: preferimos mostrar solo opiniones reales de
              clientes verificados antes que inventarlas.
            </p>
            <p className="text-sm text-[#6A5949] mt-1 leading-relaxed">
              ¿Ya compraste? Contanos cómo le fue a tu mascota y la publicamos acá.
            </p>
            <a
              href={waLink(store.whatsapp, '¡Hola La Joaquina! Quiero dejar una reseña de mi compra.')}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm px-6 py-3 rounded-full transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              <span>Dejar mi reseña por WhatsApp</span>
            </a>
            <p className="mt-4 flex items-center justify-center gap-1 text-[11px] text-[#8A7969]">
              Hecho con <Heart className="w-3.5 h-3.5 text-[#DE5D4E] fill-[#DE5D4E]" /> para las mascotas argentinas
            </p>
          </motion.div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {reviews.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: Math.min(i * 0.06, 0.3) }}
                  className="bg-[#FFFDF9] border border-[#E5D7BF] rounded-3xl p-5 shadow-3d flex flex-col"
                >
                  <div className="flex items-center gap-0.5 mb-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${s <= Math.round(r.rating) ? 'text-[#EFA332] fill-[#EFA332]' : 'text-[#D8CBAF]'}`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-[#4A3D31] leading-relaxed flex-1">“{r.comment}”</p>
                  <div className="mt-3 pt-3 border-t border-[#EFE8D8]">
                    <p className="text-xs font-bold text-[#1B4E43] flex items-center gap-1">
                      <BadgeCheck className="w-3.5 h-3.5 text-[#256B5C]" />
                      {r.customerName}
                    </p>
                    <p className="text-[11px] text-[#8A7969]">compró {r.productName}</p>
                  </div>
                </motion.div>
              ))}
            </div>
            <p className="mt-6 text-center text-xs text-[#8A7969]">
              ¿Ya compraste? Dejá tu opinión desde cada producto y aparece acá. 🐾
            </p>
          </>
        )}
      </div>
    </section>
  );
};
