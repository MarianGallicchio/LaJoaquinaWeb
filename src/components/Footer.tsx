import React from 'react';
import { Heart, ShieldCheck, Truck, Instagram, Phone } from 'lucide-react';
import { ProductCategory, StoreSettings } from '../types';
import { DEFAULT_SETTINGS, waLink, instagramUrl } from '../lib/storeSettings';
import { goAdmin } from '../lib/nav';

interface FooterProps {
  onSelectCategory: (cat: ProductCategory) => void;
  settings?: StoreSettings;
}

export const Footer: React.FC<FooterProps> = ({ onSelectCategory, settings }) => {
  const store = settings || DEFAULT_SETTINGS;
  return (
    <footer className="bg-[#1B4E43] text-[#FAF7F2] pt-14 pb-8 border-t border-[#153D34]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-12 border-b border-white/10">
          
          {/* Col 1: Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-[#EFA332] text-[#1B4E43] flex items-center justify-center font-bold text-lg">
                🐾
              </div>
              <span className="text-2xl font-bold font-display text-white">
                La Joaquina
              </span>
            </div>
            <p className="text-xs text-[#D3E5DE] leading-relaxed">
              El pet shop de confianza para tu perro y gato. Alimentos balanceados de fábrica, piedras sanitarias de alto rendimiento y accesorios con compra directa, descuentos por transferencia y envíos a todo el país.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <a
                href={waLink(store.whatsapp, '¡Hola La Joaquina!')}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#25D366] text-white flex items-center justify-center transition-colors"
                title="WhatsApp"
              >
                <Phone className="w-4 h-4" />
              </a>
              <a
                href={instagramUrl(store)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#C13584] text-white flex items-center justify-center transition-colors"
                title="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Col 2: Categories */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-[#FFE194] font-display">
              Catálogo
            </h4>
            <ul className="space-y-2 text-xs text-[#D3E5DE]">
              <li>
                <button
                  onClick={() => onSelectCategory('perros')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Alimento para Perros (Sabrosito, Raza, Dogui, Criadores)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectCategory('gatos')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Alimento para Gatos y Castrados
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectCategory('piedras')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Piedras Sanitarias (Sílice y Aglomerantes)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectCategory('accesorios')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Camas Antiestrés, Rascadores y Arnés
                </button>
              </li>
              <li>
                <a
                  href="#testimonios"
                  className="hover:text-white transition-colors cursor-pointer text-[#FFE194]"
                >
                  ⭐ Testimonios de Clientes
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Envíos y Pagos */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-[#FFE194] font-display">
              Envíos y Garantías
            </h4>
            <ul className="space-y-2 text-xs text-[#D3E5DE]">
              <li className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#EFA332] shrink-0" />
                <span>Tienda 100% online · Envíos desde Bella Vista a todo AMBA</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#EFA332] shrink-0" />
                <span>Mercado Envíos a todo el país</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-sm">📍</span>
                <span>Bella Vista, Buenos Aires · Solo online</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-sm">⚡</span>
                <span>10% OFF en transferencia bancaria</span>
              </li>
            </ul>
          </div>

          {/* Col 4: Compra directa */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-[#FFE194] font-display">
              Compra Directa
            </h4>
            <div className="bg-white/10 p-3.5 rounded-2xl border border-white/15 text-xs text-[#D3E5DE] space-y-2">
              <p>
                Comprá acá mismo con carrito: 10% OFF con transferencia, cuotas con tarjeta y envíos asegurados a todo el país.
              </p>
              <a
                href="#catalogo"
                className="inline-flex items-center gap-1.5 bg-[#EFA332] text-[#1E170E] font-bold text-xs px-3 py-1.5 rounded-xl hover:bg-[#FFD66B] transition-colors"
              >
                <span>Ver catálogo</span>
              </a>
            </div>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#A8C7BD]">
          <p>
            © {new Date().getFullYear()} La Joaquina Pet Shop. Bella Vista, Buenos Aires, Argentina. Todos los derechos reservados.
          </p>
          <p className="flex items-center gap-1">
            Hecho con <Heart className="w-3.5 h-3.5 text-[#DE5D4E] fill-[#DE5D4E]" /> para las mascotas argentinas.
            <button onClick={goAdmin} title="Acceso privado" className="ml-2 opacity-30 hover:opacity-100 transition-opacity cursor-pointer">
              🔒
            </button>
          </p>
        </div>

      </div>
    </footer>
  );
};
