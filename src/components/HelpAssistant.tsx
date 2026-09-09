import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircleQuestion, X, ChevronDown, MessageCircle, Clock } from 'lucide-react';
import { StoreSettings } from '../types';
import { DEFAULT_SETTINGS, waLink } from '../lib/storeSettings';

interface HelpAssistantProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  settings?: StoreSettings;
}

// Ayuda simple que siempre funciona: preguntas frecuentes + WhatsApp directo.
// (Reemplaza al chat con IA, que necesitaba backend con clave de Gemini.)
export const HelpAssistant: React.FC<HelpAssistantProps> = ({
  isOpen,
  onToggle,
  onClose,
  settings,
}) => {
  const store = settings || DEFAULT_SETTINGS;
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: '¿Cómo compro en la tienda?',
      a: `Elegís los productos, los sumás al carrito y completás tus datos. Pagás online con Mercado Pago, por transferencia (con ${store.transferPercent}% OFF) o en efectivo. Te confirmamos todo por WhatsApp.`,
    },
    {
      q: '¿Cuánto tarda el envío?',
      a: 'Despachamos desde Bella Vista: 24/48 hs a todo el AMBA y por Correo Argentino al resto del país. Te pasamos el seguimiento por WhatsApp.',
    },
    {
      q: '¿Qué medios de pago aceptan?',
      a: `Mercado Pago online (tarjetas, débito y dinero en cuenta con pago seguro), transferencia bancaria al alias ${store.aliasTransferencia} con ${store.transferPercent}% de descuento, o efectivo contra entrega.`,
    },
    {
      q: '¿Tienen local a la calle?',
      a: 'No, somos una tienda 100% online. Así mantenemos mejores precios y te lo enviamos a domicilio.',
    },
    {
      q: '¿El stock de la web está actualizado?',
      a: 'Sí. Si algo se agota, en el producto tenés el botón para que te avisemos cuando ingrese.',
    },
  ];

  return (
    <>
      {!isOpen && (
        <motion.button
          onClick={onToggle}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-gradient-to-b from-[#2B6D5E] to-[#1B4E43] text-white shadow-3d flex items-center justify-center cursor-pointer btn-gloss"
          title="Ayuda y contacto"
          aria-label="Abrir ayuda"
        >
          <MessageCircleQuestion className="w-6 h-6" />
        </motion.button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="fixed bottom-5 right-5 z-50 w-[calc(100vw-2.5rem)] max-w-sm bg-[#FFFDF9] border border-[#E5D7BF] rounded-3xl shadow-3d overflow-hidden"
          >
            <div className="bg-[#1B4E43] text-white p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm font-display">Ayuda y contacto</h3>
                <p className="text-[11px] text-[#D3E5DE] flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {store.hours}
                </p>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 cursor-pointer" title="Cerrar">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-2 max-h-[50vh] overflow-y-auto">
              {faqs.map((f, i) => {
                const open = openFaq === i;
                return (
                  <div key={i} className="border border-[#E8DFC9] rounded-2xl overflow-hidden bg-white">
                    <button
                      onClick={() => setOpenFaq(open ? null : i)}
                      className="w-full text-left p-3 flex items-center justify-between gap-2 text-xs font-bold text-[#1B4E43] cursor-pointer"
                    >
                      <span>{f.q}</span>
                      <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                    </button>
                    {open && <p className="px-3 pb-3 text-xs text-[#6A5949] leading-relaxed">{f.a}</p>}
                  </div>
                );
              })}
            </div>

            <div className="p-4 pt-2">
              <a
                href={waLink(store.whatsapp, '¡Hola La Joaquina! Estoy en la tienda online y tengo una consulta.')}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-3 px-4 rounded-xl text-sm transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                <span>Hablar por WhatsApp</span>
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
