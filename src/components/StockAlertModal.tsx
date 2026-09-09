import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Bell, 
  Check, 
  Mail, 
  Phone, 
  User, 
  MessageSquare, 
  Sparkles,
  PackageX,
  ShieldCheck
} from 'lucide-react';
import { Product, ProductVariant } from '../types';
import { createCloudStockAlert } from '../lib/cloudDb';

interface StockAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  variant: ProductVariant | null;
  defaultEmail?: string;
  defaultName?: string;
  onAlertCreated?: (productName: string, variantWeight: string) => void;
}

export const StockAlertModal: React.FC<StockAlertModalProps> = ({
  isOpen,
  onClose,
  product,
  variant,
  defaultEmail = '',
  defaultName = '',
  onAlertCreated,
}) => {
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState(defaultName);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen || !product) return null;

  const currentVariant = variant || product.variants[0] || { weight: 'Única', price: 0, inStock: false };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Por favor ingresá un correo electrónico válido para avisarte.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createCloudStockAlert({
        productId: product.id,
        productName: product.name,
        productImage: product.image,
        productBrand: product.brand,
        variantWeight: currentVariant.weight,
        customerEmail: email.trim(),
        customerPhone: phone.trim(),
        customerName: name.trim() || 'Cliente interesado',
        notes: notes.trim(),
      });

      setIsSuccess(true);
      if (onAlertCreated) {
        onAlertCreated(product.name, currentVariant.weight);
      }

      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 2600);
    } catch (err) {
      setErrorMessage('No pudimos registrar la alerta en este momento. Intentalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setIsSuccess(false);
      setErrorMessage('');
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div 
        id="stock-alert-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        onClick={handleClose}
      >
        <motion.div
          id="stock-alert-modal-content"
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg bg-[#FAF7F2] rounded-3xl shadow-2xl border border-[#E8DFC9] overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="bg-[#1B4E43] text-white p-5 sm:p-6 relative">
            <button
              id="stock-alert-close-btn"
              onClick={handleClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#EFA332] text-[#1B4E43] flex items-center justify-center font-bold shadow-md">
                <Bell className="w-5 h-5 fill-[#1B4E43]" />
              </div>
              <div>
                <span className="text-[11px] font-bold tracking-wider uppercase text-[#EFA332] block">
                  Aviso Automático de Reposición
                </span>
                <h3 className="text-lg sm:text-xl font-black font-display leading-snug">
                  Avisarme cuando haya stock
                </h3>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
            {/* Product summary card */}
            <div className="flex items-center gap-3.5 bg-white p-3.5 rounded-2xl border border-[#EADFCB] shadow-2xs">
              <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-[#F4EDE0] shrink-0 border border-[#E3D6BE]">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=600&auto=format&fit=crop&q=80';
                  }}
                />
                <span className="absolute top-0 right-0 bg-[#DE5D4E] text-white p-0.5 rounded-bl-lg">
                  <PackageX className="w-3 h-3" />
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#1B4E43] bg-[#E8F3EF] px-2 py-0.5 rounded-md">
                  {product.brand}
                </span>
                <h4 className="font-bold text-xs sm:text-sm text-[#2B231D] truncate mt-0.5">
                  {product.name}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-semibold text-[#8C7B6A] bg-[#FAF5EC] px-2 py-0.5 rounded-md border border-[#EAE0CD]">
                    Presentación: <strong className="text-[#2B231D]">{currentVariant.weight}</strong>
                  </span>
                  <span className="text-[11px] font-bold text-[#DE5D4E] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#DE5D4E] animate-pulse" />
                    Sin stock temporal
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-[#6A5949] leading-relaxed">
              Dejanos tu contacto. Ni bien nuestro equipo en el depósito reciba el cargamento y actualice el stock, 
              <strong> te enviaremos una notificación directa</strong> para que puedas reservarlo antes de que se agote.
            </p>

            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl">
                {errorMessage}
              </div>
            )}

            {isSuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#E8F5E9] border border-[#A5D6A7] p-5 rounded-2xl text-center space-y-2 text-[#1B4E43]"
              >
                <div className="w-12 h-12 mx-auto rounded-full bg-[#256B5C] text-white flex items-center justify-center shadow-md">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="font-black text-base font-display">¡Alerta registrada con éxito!</h4>
                <p className="text-xs text-[#2E7D32]">
                  Hemos enviado la solicitud al panel de administración. Te contactaremos ni bien ingrese nueva partida de <strong>{product.name} ({currentVariant.weight})</strong>.
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* Email (Required) */}
                <div>
                  <label className="block text-xs font-bold text-[#5B4B3D] mb-1">
                    Email de contacto <span className="text-[#DE5D4E]">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#8C7B6A] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="stock-alert-email"
                      type="email"
                      required
                      placeholder="tu.email@ejemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E3D6BE] rounded-xl text-xs sm:text-sm text-[#2B231D] focus:outline-hidden focus:border-[#1B4E43] focus:ring-2 focus:ring-[#1B4E43]/20"
                    />
                  </div>
                </div>

                {/* WhatsApp / Phone */}
                <div>
                  <label className="block text-xs font-bold text-[#5B4B3D] mb-1">
                    WhatsApp o Teléfono <span className="text-[#256B5C] text-[10px] font-semibold">(Aviso más rápido)</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#8C7B6A] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="stock-alert-phone"
                      type="tel"
                      placeholder="Ej: 11 2345 6789"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E3D6BE] rounded-xl text-xs sm:text-sm text-[#2B231D] focus:outline-hidden focus:border-[#1B4E43] focus:ring-2 focus:ring-[#1B4E43]/20"
                    />
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-[#5B4B3D] mb-1">
                    Nombre o Apodo <span className="text-gray-400 font-normal">(Opcional)</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#8C7B6A] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="stock-alert-name"
                      type="text"
                      placeholder="Ej: Laura"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E3D6BE] rounded-xl text-xs sm:text-sm text-[#2B231D] focus:outline-hidden focus:border-[#1B4E43] focus:ring-2 focus:ring-[#1B4E43]/20"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-bold text-[#5B4B3D] mb-1">
                    Observación o cantidad estimada <span className="text-gray-400 font-normal">(Opcional)</span>
                  </label>
                  <div className="relative">
                    <MessageSquare className="w-4 h-4 text-[#8C7B6A] absolute left-3 top-3" />
                    <textarea
                      id="stock-alert-notes"
                      rows={2}
                      placeholder="Ej: Necesito 2 bolsas o si tienen otra marca similar de 15kg..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-[#E3D6BE] rounded-xl text-xs sm:text-sm text-[#2B231D] focus:outline-hidden focus:border-[#1B4E43] focus:ring-2 focus:ring-[#1B4E43]/20 resize-none"
                    />
                  </div>
                </div>

                {/* Submit button */}
                <div className="pt-2">
                  <motion.button
                    id="stock-alert-submit-btn"
                    type="submit"
                    disabled={isSubmitting}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black text-xs sm:text-sm font-display text-white bg-[#1B4E43] hover:bg-[#143B33] shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Bell className="w-4 h-4 fill-white" />
                    <span>{isSubmitting ? 'Registrando...' : 'Confirmar y Avisarme Cuando Haya Stock'}</span>
                  </motion.button>
                </div>
              </form>
            )}

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#8C7B6A] pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#256B5C]" />
              <span>Sin spam. Solo te escribimos una vez que el producto esté físicamente disponible.</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
