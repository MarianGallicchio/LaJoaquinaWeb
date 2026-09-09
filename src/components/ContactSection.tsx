import React, { useState } from 'react';
import { 
  MapPin, 
  Phone, 
  Clock, 
  MessageCircle, 
  Mail, 
  Send, 
  CheckCircle2, 
  Instagram, 
  HelpCircle,
  ChevronDown
} from 'lucide-react';

export const ContactSection: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [petInfo, setPetInfo] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !message) return;
    setSubmitted(true);
    setTimeout(() => {
      setName('');
      setEmail('');
      setPetInfo('');
      setMessage('');
      setSubmitted(false);
    }, 4000);
  };

  const faqs = [
    {
      q: '¿Cómo elijo entre comprar en la web o en Mercado Libre?',
      a: '¡Tenés ambas opciones! Si comprás directamente en nuestra web tenés 10% de descuento abonando por transferencia y atención local con envíos en el día. Si preferís comprar en Mercado Libre, cada producto tiene su botón directo con la garantía de Mercado Envíos y cuotas con tarjeta.',
    },
    {
      q: '¿Qué marcas de alimento comercializan?',
      a: 'Trabajamos marcas reconocidas y garantizadas como Sabrosito, Raza, Dogui, Criadores, Purina Cat Chow, Purina Dog Chow, Gati y más. Todas las bolsas son originales, cerradas de fábrica y con fecha de vencimiento óptima.',
    },
    {
      q: '¿Cómo son los envíos desde Bella Vista?',
      a: 'Despachamos desde Bella Vista a todo AMBA en 24/48 hs y al resto del país por Correo Argentino y Mercado Envíos. Somos una tienda 100% online: coordinás todo por la web o WhatsApp y lo recibís en tu puerta.',
    },
    {
      q: '¿Tienen local a la calle para retirar?',
      a: 'No, somos una tienda exclusivamente online con base en Bella Vista (Buenos Aires). Así mantenemos mejores precios y te lo enviamos a domicilio a todo el país.',
    },
  ];

  return (
    <section id="contacto" className="py-14 sm:py-20 bg-[#FAF7F2]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Left Column: Contact Form & Store Details */}
          <div className="lg:col-span-7 space-y-8">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-[#E8F3EF] text-[#1B4E43] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2">
                <MessageCircle className="w-3.5 h-3.5 text-[#256B5C]" />
                <span>Atención Personalizada</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1B4E43] font-display">
                ¿Tenés dudas antes de comprar? Escribinos
              </h2>
              <p className="text-xs sm:text-sm text-[#6A5949] mt-2">
                Contanos sobre tu perro o gato (raza, edad, tamaño) y te asesoramos sobre el alimento o accesorio justo.
              </p>
            </div>

            {/* Form */}
            <div className="bg-[#FFFDF9] p-6 sm:p-8 rounded-3xl border border-[#E5D7BF] shadow-sm">
              {submitted ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-12 h-12 bg-[#E8F3EF] text-[#256B5C] rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="font-bold text-base text-[#1B4E43]">
                    ¡Mensaje recibido con éxito!
                  </h4>
                  <p className="text-xs text-[#6A5949]">
                    Te responderemos en breve. Si es urgente podés escribirnos directo por WhatsApp.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#5B4E41] mb-1">
                        Tu Nombre *
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ej: Mariano"
                        className="w-full text-xs bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1B4E43]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#5B4E41] mb-1">
                        Email o Teléfono *
                      </label>
                      <input
                        type="text"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="WhatsApp o email de contacto"
                        className="w-full text-xs bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1B4E43]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#5B4E41] mb-1">
                      Mascota (Especie, Raza, Edad)
                    </label>
                    <input
                      type="text"
                      value={petInfo}
                      onChange={(e) => setPetInfo(e.target.value)}
                      placeholder="Ej: Golden retriever cachorro de 4 meses"
                      className="w-full text-xs bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1B4E43]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#5B4E41] mb-1">
                      Consulta o producto de interés *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="¿Qué alimento me recomiendan? ¿Tienen stock de Sabrosito de 15kg?..."
                      className="w-full text-xs bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1B4E43] resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <a
                      href="https://wa.me/5491123456789"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#25D366] hover:underline"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Escribir por WhatsApp</span>
                    </a>

                    <button
                      type="submit"
                      className="bg-[#1B4E43] hover:bg-[#256B5C] text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2 font-display"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Enviar Mensaje</span>
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Quick Contact Info Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-[#FFFDF9] p-4 rounded-2xl border border-[#E5D7BF] flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#DE5D4E] shrink-0 mt-0.5" />
                <div className="text-xs">
                  <strong className="block text-[#1B4E43] font-bold">Ubicación</strong>
                  <span className="text-[#6A5949]">Bella Vista, Buenos Aires · Tienda online</span>
                </div>
              </div>

              <div className="bg-[#FFFDF9] p-4 rounded-2xl border border-[#E5D7BF] flex items-start gap-3">
                <Clock className="w-5 h-5 text-[#EFA332] shrink-0 mt-0.5" />
                <div className="text-xs">
                  <strong className="block text-[#1B4E43] font-bold">Horarios</strong>
                  <span className="text-[#6A5949]">Online Lun a Sáb: 9:00 a 19:30 hs</span>
                </div>
              </div>

              <div className="bg-[#FFFDF9] p-4 rounded-2xl border border-[#E5D7BF] flex items-start gap-3">
                <Instagram className="w-5 h-5 text-[#C13584] shrink-0 mt-0.5" />
                <div className="text-xs">
                  <strong className="block text-[#1B4E43] font-bold">Instagram</strong>
                  <span className="text-[#6A5949]">@lajuaquinapetshop</span>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: FAQ Accordion */}
          <div className="lg:col-span-5 space-y-4">
            <div className="mb-4">
              <div className="inline-flex items-center gap-1.5 bg-[#FAF5EC] text-[#8A7969] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2">
                <HelpCircle className="w-3.5 h-3.5 text-[#EFA332]" />
                <span>Preguntas Frecuentes</span>
              </div>
              <h3 className="text-xl font-extrabold text-[#1B4E43] font-display">
                Todo lo que necesitás saber
              </h3>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <div
                    key={index}
                    className="bg-[#FFFDF9] border border-[#E5D7BF] rounded-2xl overflow-hidden transition-all shadow-2xs"
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                      className="w-full text-left p-4 flex items-center justify-between gap-3 text-xs sm:text-sm font-bold text-[#1B4E43] hover:text-[#256B5C] transition-colors cursor-pointer"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-[#8A7969] shrink-0 transition-transform ${
                          isOpen ? 'rotate-180 text-[#1B4E43]' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 text-xs text-[#6A5949] leading-relaxed border-t border-[#F2ECE0] pt-2">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Mercado Libre Badge Banner */}
            <div className="bg-[#FFF159]/80 border border-[#E5DA4F] p-4 rounded-3xl mt-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-[#2D3277] shrink-0 shadow-xs">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="7" width="18" height="13" rx="2" />
                  <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </div>
              <div className="flex-1 text-xs">
                <span className="font-extrabold text-[#2D3277] block">
                  Comprá seguro en Mercado Libre
                </span>
                <span className="text-[#4E4D3E] text-[11px]">
                  Todos nuestros productos cuentan con publicación y garantía en Mercado Libre.
                </span>
              </div>
              <a
                href="https://listado.mercadolibre.com.ar/la-juaquina"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#2D3277] text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-[#1E2255] transition-colors shrink-0"
              >
                Visitar
              </a>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
