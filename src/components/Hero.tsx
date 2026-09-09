import React from 'react';
import { 
  ShieldCheck, 
  Truck, 
  Sparkles, 
  HeartHandshake, 
  ShoppingBag, 
  ArrowRight,
  Star
} from 'lucide-react';
import { ProductCategory } from '../types';

interface HeroProps {
  onSelectCategory: (category: ProductCategory) => void;
  onOpenCalculator: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onSelectCategory, onOpenCalculator }) => {
  return (
    <section className="relative overflow-hidden pt-6 pb-12 sm:pt-10 sm:pb-16 bg-gradient-to-b from-[#FAF7F2] via-[#F6EFE2] to-[#FAF7F2]">
      {/* Decorative subtle background blobs */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-[#EFA332]/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-[#1B4E43]/10 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Text Block */}
          <div className="lg:col-span-7 space-y-5 text-left">
            
            {/* Pill Eyebrow */}
            <div className="inline-flex items-center gap-2 bg-[#E8F3EF] border border-[#BCE0D4] px-3.5 py-1.5 rounded-full text-xs font-bold text-[#1B4E43] shadow-2xs">
              <span className="flex h-2 w-2 rounded-full bg-[#256B5C] animate-ping" />
              <span>Tienda online · Bella Vista · Envíos a todo el país</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1B4E43] leading-[1.12] tracking-tight">
              Todo lo que tu perro y tu gato necesitan, con el{' '}
              <span className="text-[#DE5D4E] underline decoration-[#EFA332] decoration-wavy decoration-2">
                cariño de siempre
              </span>.
            </h1>

            {/* Subheading */}
            <p className="text-base sm:text-lg text-[#5A4D3F] max-w-2xl leading-relaxed">
              Alimentos balanceados de primeras marcas, piedras sanitarias de alto rendimiento y accesorios premium. 
              <strong> Comprá acá con carrito, descuentos directos y envíos a todo el país</strong>.
            </p>

            {/* CTA Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
              <a
                href="#catalogo"
                onClick={() => onSelectCategory('todos')}
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-b from-[#F5B44A] to-[#E39420] text-[#1E170E] font-bold px-6 py-3.5 rounded-full transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-sm sm:text-base font-display btn-gloss"
              >
                <ShoppingBag className="w-5 h-5" />
                <span>Ver Catálogo Completo</span>
                <ArrowRight className="w-4 h-4 ml-0.5" />
              </a>

              <button
                onClick={onOpenCalculator}
                className="inline-flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-[#1B4E43] hover:text-[#256B5C] bg-[#FFFDF9] border border-[#D9CBBA] px-4 py-3.5 rounded-full hover:bg-[#F2ECE0] transition-colors cursor-pointer"
              >
                <span>🧮 Calcular Ración Diaria</span>
              </button>
            </div>

            {/* Micro Rating Strip */}
            <div className="pt-4 flex flex-wrap items-center gap-6 text-xs text-[#6A5A4A] border-t border-[#E8DFC9]/70">
              <div className="flex items-center gap-1.5">
                <div className="flex text-[#EFA332]">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-[#EFA332]" />
                  ))}
                </div>
                <span className="font-bold text-[#1B4E43]">4.9 / 5</span>
                <span>(clientes en todo el país)</span>
              </div>

              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#256B5C]" />
                <span>Compra 100% Protegida</span>
              </div>

              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#EFA332]" />
                <span>Despachos en 24hs</span>
              </div>
            </div>

          </div>

          {/* Right Visual Card with Pet Highlights */}
          <div className="lg:col-span-5 relative">
            {/* Sellos flotantes 3D */}
            <div className="absolute -top-3 -left-1 sm:-left-3 z-10 glass border border-white/60 shadow-3d rounded-2xl px-3 py-1.5 text-[11px] sm:text-xs font-black text-[#1B4E43] animate-floaty" style={{ ['--float-rot' as any]: '-4deg' }}>
              🚚 Envíos 24/48 hs
            </div>
            <div className="absolute -top-3 right-2 sm:right-4 z-10 bg-gradient-to-b from-[#1B4E43] to-[#0F2E27] text-[#FFE194] rounded-2xl px-3 py-1.5 text-[11px] sm:text-xs font-black shadow-3d animate-floaty" style={{ ['--float-rot' as any]: '3deg', animationDelay: '1.2s' }}>
              10% OFF transferencia
            </div>
            <div className="bg-[#FFFDF9] p-4 sm:p-5 rounded-3xl border border-[#E5D7BF] shadow-3d relative overflow-hidden mt-3">
              
              {/* Pet Banner Collage */}
              <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-[#EFE8D8]">
                <img 
                  src="https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=800&auto=format&fit=crop&q=80" 
                  alt="Perro y gato felices con La Joaquina" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                
                {/* Floating badge inside image */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#FFE194]">Sabrosito · Raza · Dogui · Criadores</p>
                    <p className="text-sm sm:text-base font-bold font-display">Bolsas cerradas de fábrica</p>
                  </div>
                  <span className="bg-[#EFA332] text-[#1E170E] text-[11px] font-extrabold px-2.5 py-1 rounded-full uppercase">
                    Original
                  </span>
                </div>
              </div>

              {/* Quick Feature Grid beneath picture */}
              <div className="grid grid-cols-3 gap-2.5 mt-4 text-center">
                <button
                  onClick={() => onSelectCategory('perros')}
                  className="bg-gradient-to-b from-[#FFFEFB] to-[#FAF3E4] hover:from-white hover:to-[#F5EAD3] p-2.5 rounded-2xl border border-[#E8DFC9] transition-all group cursor-pointer lift-3d"
                >
                  <span className="text-2xl block mb-1 group-hover:scale-110 transition-transform">🐶</span>
                  <span className="text-xs font-bold text-[#1B4E43] block">Perros</span>
                  <span className="text-[10px] text-[#786653]">Adulto & Puppy</span>
                </button>

                <button
                  onClick={() => onSelectCategory('gatos')}
                  className="bg-gradient-to-b from-[#FFFEFB] to-[#FAF3E4] hover:from-white hover:to-[#F5EAD3] p-2.5 rounded-2xl border border-[#E8DFC9] transition-all group cursor-pointer lift-3d"
                >
                  <span className="text-2xl block mb-1 group-hover:scale-110 transition-transform">🐱</span>
                  <span className="text-xs font-bold text-[#1B4E43] block">Gatos</span>
                  <span className="text-[10px] text-[#786653]">Castrados & Mix</span>
                </button>

                <button
                  onClick={() => onSelectCategory('piedras')}
                  className="bg-gradient-to-b from-[#FFFEFB] to-[#FAF3E4] hover:from-white hover:to-[#F5EAD3] p-2.5 rounded-2xl border border-[#E8DFC9] transition-all group cursor-pointer lift-3d"
                >
                  <span className="text-2xl block mb-1 group-hover:scale-110 transition-transform">🧼</span>
                  <span className="text-xs font-bold text-[#1B4E43] block">Piedras</span>
                  <span className="text-[10px] text-[#786653]">Sílice & Bentonita</span>
                </button>
              </div>

              {/* Testimonials Teaser Pill */}
              <div className="mt-3.5 bg-[#FAF5EC] border border-[#E3D6BE] p-2.5 rounded-2xl flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#EFA332] text-[#1E170E] flex items-center justify-center shrink-0 text-sm font-bold">
                    ⭐
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#1B4E43]">Testimonios & Reseñas</p>
                    <p className="text-[11px] text-[#6A5949]">4.9 / 5 estrellas de familias en AMBA</p>
                  </div>
                </div>
                <a
                  href="#testimonios"
                  className="text-xs font-bold text-[#1B4E43] hover:text-[#256B5C] underline shrink-0 cursor-pointer"
                >
                  Ver opiniones
                </a>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
