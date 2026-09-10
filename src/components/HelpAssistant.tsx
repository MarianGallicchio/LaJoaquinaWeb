import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircleQuestion, X, ChevronDown, MessageCircle, Clock, Send, Sparkles, Loader2 } from 'lucide-react';
import { Product, StoreSettings } from '../types';
import { DEFAULT_SETTINGS, formatARS, waLink } from '../lib/storeSettings';

interface HelpAssistantProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  settings?: StoreSettings;
  products?: Product[];
}

interface ChatMsg {
  role: 'user' | 'bot';
  text: string;
}

declare const puter: any;

let puterLoading: Promise<void> | null = null;
function loadPuter(): Promise<void> {
  if (typeof (window as any).puter !== 'undefined') return Promise.resolve();
  if (!puterLoading) {
    puterLoading = new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://js.puter.com/v2/';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('No se pudo cargar la IA'));
      document.head.appendChild(s);
      setTimeout(() => reject(new Error('Tiempo agotado cargando IA')), 15000);
    }).catch((e) => {
      puterLoading = null;
      throw e;
    });
  }
  return puterLoading;
}

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Respaldo local inteligente: responde con datos reales del catálogo
function localAnswer(question: string, products: Product[], store: StoreSettings): string {
  const q = norm(question);
  const has = (...words: string[]) => words.some((w) => q.includes(w));

  if (has('hola', 'buenas', 'buen dia', 'buenas tardes', 'que tal')) {
    return '¡Hola! 🐾 Puedo ayudarte con precios, stock, envíos y pagos. Decime qué buscás: por ejemplo "alimento para cachorro" o "piedras aglomerantes".';
  }
  if (has('envio', 'envia', 'tarda', 'llega', 'zona', 'bella vista', 'domicilio')) {
    return 'Despachamos desde Bella Vista: 24/48 hs a todo el AMBA y por Correo Argentino al resto del país. Te pasamos el seguimiento por WhatsApp.';
  }
  if (has('pago', 'pagar', 'tarjeta', 'transferencia', 'cuota', 'descuento', 'cupon', 'efectivo', 'mercado pago')) {
    return `Aceptamos Mercado Pago online, transferencia al alias ${store.aliasTransferencia} con ${store.transferPercent}% OFF, o efectivo. Y el cupón ${store.couponCode} te da ${store.couponPercent}% extra en el carrito.`;
  }
  if (has('horario', 'atienden', 'abierto', 'direccion', 'donde estan', 'local', 'ubicacion')) {
    return `Somos 100% online (${store.city}). ${store.hours}. Escribinos por WhatsApp y coordinamos.`;
  }
  if (has('cachorro', 'cachorrito', 'gatito', 'bebe')) {
    const pups = products.filter((p) => norm(p.subCategory || '').includes('cachorro') || norm(p.name).includes('cachorro'));
    if (pups.length > 0) {
      const p = pups[0];
      const min = Math.min(...p.variants.map((v) => v.price));
      return `Para cachorros te recomiendo **${p.name}** (${p.brand}) desde ${formatARS(min)}. ¿Querés que te ayude con la cantidad según su edad y peso?`;
    }
    return 'Para cachorros buscá la subcategoría Cachorro en el catálogo: tienen DHA y calcio para crecer fuertes.';
  }
  if (has('castrado', 'castrada', 'esterilizado', 'urinario')) {
    const c = products.find((p) => norm(p.subCategory || '').includes('castrado'));
    if (c) {
      const min = Math.min(...c.variants.map((v) => v.price));
      return `Para castrados: **${c.name}** (${c.brand}) desde ${formatARS(min)}, con control urinario y de peso.`;
    }
  }
  if (has('piedra', 'arena', 'olor', 'aglomerante', 'silice')) {
    return 'Para el olor: piedras aglomerantes (bloque sólido instantáneo) o sílice (dura hasta 30 días). Las tenés en la categoría Piedras con stock actualizado.';
  }
  if (has('oferta', 'promo', 'barato', 'economico', 'descuento')) {
    const offers = products
      .filter((p) => p.variants.some((v) => v.originalPrice && v.originalPrice > v.price))
      .slice(0, 3);
    if (offers.length > 0) {
      return 'En oferta hoy: ' + offers.map((p) => `**${p.name}** desde ${formatARS(Math.min(...p.variants.map((v) => v.price)))}`).join(' · ') + '. Activá el filtro "Solo ofertas" para verlas todas.';
    }
  }
  if (has('stock', 'disponible', 'tienen', 'hay', 'queda')) {
    const tokens = q.split(/[^a-z0-9]+/).filter((t) => t.length > 3);
    const found = products.find((p) => {
      const hay = norm(`${p.name} ${p.brand} ${p.subCategory || ''}`);
      return tokens.some((t) => hay.includes(t));
    });
    if (found) {
      const inStock = found.variants.some((v) => v.inStock !== false);
      const min = Math.min(...found.variants.map((v) => v.price));
      return inStock
        ? `Sí, **${found.name}** (${found.brand}) está disponible desde ${formatARS(min)}. Sumalo al carrito antes de que se agote.`
        : `**${found.name}** está agotado ahora. Abrilo y tocá "Avisarme cuando haya stock" y te contactamos.`;
    }
    return 'Decime el nombre del producto o la marca y te digo precio y stock al instante.';
  }
  // Búsqueda general por marca o nombre
  const tokens = q.split(/[^a-z0-9]+/).filter((t) => t.length > 3);
  const scored = products
    .map((p) => {
      const hay = norm(`${p.name} ${p.brand} ${p.subCategory || ''} ${p.category}`);
      const score = tokens.filter((t) => hay.includes(t)).length;
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  if (scored.length > 0) {
    return 'Encontré esto para vos: ' + scored.map(({ p }) => {
      const min = Math.min(...p.variants.map((v) => v.price));
      const ok = p.variants.some((v) => v.inStock !== false);
      return `**${p.name}** (${p.brand}) desde ${formatARS(min)} ${ok ? '✅ con stock' : '❌ agotado'}`;
    }).join(' · ');
  }
  return 'Puedo ayudarte con precios, stock, envíos y pagos. Probá con una marca (Sabrosito, Raza, Dogui...) o escribinos por WhatsApp y te asesora una persona.';
}

// Asistente con IA real (API pública y gratuita Pollinations, sin claves).
// Funciona en localhost y en GitHub Pages. Si la IA falla, quedan las
// preguntas frecuentes + WhatsApp.
export const HelpAssistant: React.FC<HelpAssistantProps> = ({
  isOpen,
  onToggle,
  onClose,
  settings,
  products = [],
}) => {
  const store = settings || DEFAULT_SETTINGS;
  const [tab, setTab] = useState<'faq' | 'ia'>('faq');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    { role: 'bot', text: '¡Hola! 🐾 Soy el asesor de La Joaquina. Preguntame por alimentos, precios, stock o envíos y te respondo en el momento.' },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, isOpen, tab]);

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

  const catalogContext = () => {
    if (products.length === 0) return 'Catálogo no cargado aún.';
    return products.slice(0, 40).map((p) => {
      const prices = p.variants.map((v) => v.price);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const stock = p.variants.some((v) => v.inStock === false) ? 'algunas presentaciones agotadas' : 'con stock';
      const price = min === max ? formatARS(min) : `${formatARS(min)} a ${formatARS(max)}`;
      return `- ${p.name} (${p.brand}, ${p.category}): ${price}, ${stock}`;
    }).join('\n');
  };

  const askAI = async (question: string) => {
    const userMsg: ChatMsg = { role: 'user', text: question };
    const history = [...msgs.slice(-6), userMsg];
    setMsgs((prev) => [...prev, userMsg]);
    setInput('');
    setThinking(true);

    const system = [
      `Sos el asesor de "La Joaquina Pet Shop", tienda online argentina de mascotas con base en Bella Vista, Buenos Aires (solo online, sin local).`,
      `Vendés SOLO por esta web: Mercado Pago online, transferencia con ${store.transferPercent}% OFF o efectivo. Cupón ${store.couponCode} (${store.couponPercent}% OFF). Envíos AMBA 24/48 hs y al país por Correo Argentino.`,
      `Respondé en español rioplatense, corto (máximo 80 palabras), con datos del catálogo cuando corresponda. Si es algo médico grave, derivá a un veterinario.`,
      `Catálogo actual:\n${catalogContext()}`,
    ].join('\n');

    // 1) IA real (Puter.js, gratis y sin claves). 2) Respaldo local con datos del catálogo.
    try {
      await loadPuter();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);
      // Puter no acepta AbortSignal: carrera manual con timeout
      const timeout = new Promise<never>((_, rej) => {
        const t = setTimeout(() => rej(new Error('timeout')), 30000);
        controller.signal.addEventListener('abort', () => {
          clearTimeout(t);
          rej(new Error('timeout'));
        });
      });
      const call = (window as any).puter.ai.chat(
        [
          { role: 'system', content: system },
          ...history.map((m) => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.text })),
        ],
        { normalize: true }
      );
      const res = (await Promise.race([call, timeout])) as any;
      clearTimeout(timer);
      const text =
        typeof res === 'string' ? res : res?.message?.content || res?.text || '';
      if (!String(text).trim()) throw new Error('Respuesta vacía');
      setMsgs((prev) => [...prev, { role: 'bot', text: String(text).slice(0, 800) }]);
    } catch {
      setMsgs((prev) => [...prev, { role: 'bot', text: localAnswer(question, products, store) }]);
    } finally {
      setThinking(false);
    }
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = input.trim();
    if (!clean || thinking) return;
    askAI(clean);
  };

  return (
    <>
      {!isOpen && (
        <motion.button
          onClick={onToggle}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="fixed bottom-5 right-5 z-[100] w-16 h-16 rounded-full bg-gradient-to-b from-[#2B6D5E] to-[#0F2E27] text-white shadow-3d flex items-center justify-center cursor-pointer border-2 border-[#EFA332]/60"
          title="Ayuda y asesor"
          aria-label="Abrir ayuda y asesor"
        >
          <span className="absolute inline-flex h-full w-full rounded-full bg-[#EFA332] opacity-25 animate-ping pointer-events-none" />
          <MessageCircleQuestion className="w-7 h-7 text-[#FFE194] relative" />
        </motion.button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="fixed bottom-5 right-5 z-[100] w-[calc(100vw-2.5rem)] max-w-sm bg-[#FFFDF9] border border-[#E5D7BF] rounded-3xl shadow-3d overflow-hidden flex flex-col max-h-[82vh]"
          >
            <div className="bg-[#1B4E43] text-white p-4 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-sm font-display">Ayuda y asesor</h3>
                <p className="text-[11px] text-[#D3E5DE] flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {store.hours}
                </p>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 cursor-pointer" title="Cerrar">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-1.5 p-3 pb-0 shrink-0">
              <button
                onClick={() => setTab('faq')}
                className={`flex-1 text-xs font-bold py-2 rounded-xl cursor-pointer transition-colors ${
                  tab === 'faq' ? 'bg-[#1B4E43] text-white' : 'bg-[#FAF5EC] text-[#5A4D3F] border border-[#E3D6BE]'
                }`}
              >
                ❓ Preguntas
              </button>
              <button
                onClick={() => setTab('ia')}
                className={`flex-1 text-xs font-bold py-2 rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1 ${
                  tab === 'ia' ? 'bg-[#1B4E43] text-white' : 'bg-[#FAF5EC] text-[#5A4D3F] border border-[#E3D6BE]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" /> Asesor IA en vivo
              </button>
            </div>

            {tab === 'faq' ? (
              <>
                <div className="p-4 space-y-2 overflow-y-auto">
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
                <div className="p-4 pt-2 shrink-0">
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
              </>
            ) : (
              <>
                <div className="p-4 space-y-2.5 overflow-y-auto flex-1 min-h-[220px]">
                  {msgs.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] text-xs leading-relaxed px-3 py-2 rounded-2xl ${
                          m.role === 'user'
                            ? 'bg-[#1B4E43] text-white rounded-br-md'
                            : 'bg-[#F4EDE0] text-[#2B231D] border border-[#E8DFC9] rounded-bl-md'
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  ))}
                  {thinking && (
                    <div className="flex justify-start">
                      <div className="bg-[#F4EDE0] border border-[#E8DFC9] rounded-2xl rounded-bl-md px-3 py-2 flex items-center gap-1.5 text-xs text-[#6A5949]">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Pensando...
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
                <form onSubmit={handleSend} className="p-3 border-t border-[#E8DFC9] flex gap-1.5 shrink-0">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ej: ¿qué alimento para cachorro?"
                    className="flex-1 text-xs bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1B4E43]"
                  />
                  <button
                    type="submit"
                    disabled={thinking || !input.trim()}
                    className="bg-[#1B4E43] hover:bg-[#256B5C] disabled:opacity-40 text-white p-2.5 rounded-xl cursor-pointer"
                    title="Enviar"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
