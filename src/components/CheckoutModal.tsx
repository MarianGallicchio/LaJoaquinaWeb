import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  CheckCircle2, 
  CreditCard, 
  Banknote, 
  Wallet, 
  Truck, 
  ShieldCheck, 
  Copy, 
  Check, 
  MessageCircle,
  ShoppingBag,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  MapPin,
  Store
} from 'lucide-react';
import { CartItem, OrderDetails, StoreSettings } from '../types';
import { saveCloudOrder, createMpPayment } from '../lib/cloudDb';
import { DEFAULT_SETTINGS, getShippingCost, getEnabledShipping, getMethodLabel } from '../lib/storeSettings';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  shippingMethod: 'pickup' | 'express_amba' | 'correo_argentino';
  discountCode: string;
  onOrderCompleted: (order: OrderDetails) => void;
  onBackToCart?: () => void;
  settings?: StoreSettings;
}

export type CheckoutStep = 'shipping' | 'payment' | 'success';

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  shippingMethod: initialShippingMethod,
  discountCode,
  onOrderCompleted,
  onBackToCart,
  settings,
}) => {
  const store = settings || DEFAULT_SETTINGS;
  const enabledMethods = getEnabledShipping(store);
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('shipping');
  const [selectedShipping, setSelectedShipping] = useState<'pickup' | 'express_amba' | 'correo_argentino'>(initialShippingMethod);

  // Si el método inicial está desactivado (tienda solo online), usar el primero habilitado
  useEffect(() => {
    if (!enabledMethods.some((m) => m.id === selectedShipping) && enabledMethods.length > 0) {
      setSelectedShipping(enabledMethods[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  // Customer form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState(store.city);
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'mercadopago' | 'transferencia' | 'efectivo'>('transferencia');
  
  const [loading, setLoading] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<OrderDetails | null>(null);
  const [mpInitPoint, setMpInitPoint] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Sync shipping method when prop changes
  useEffect(() => {
    setSelectedShipping(initialShippingMethod);
  }, [initialShippingMethod]);

  // Reset to shipping step when reopened
  useEffect(() => {
    if (isOpen && currentStep !== 'success') {
      setCurrentStep('shipping');
      setFormError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const subtotal = items.reduce(
    (sum, item) => sum + item.selectedVariant.price * item.quantity,
    0
  );

  const couponDiscount = discountCode.trim().toUpperCase() === store.couponCode.toUpperCase() ? subtotal * (store.couponPercent / 100) : 0;
  // Descuento extra configurable si paga con transferencia
  const transferDiscount = paymentMethod === 'transferencia' ? (subtotal - couponDiscount) * (store.transferPercent / 100) : 0;
  const totalDiscount = couponDiscount + transferDiscount;

  const shippingCosts = {
    pickup: getShippingCost(store, 'pickup'),
    express_amba: getShippingCost(store, 'express_amba'),
    correo_argentino: getShippingCost(store, 'correo_argentino'),
  };
  const shippingCost = shippingCosts[selectedShipping];
  const total = Math.max(0, subtotal - totalDiscount + shippingCost);

  const formatARS = (val: number) =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(val);

  // Validate Step 2 (Shipping) before moving to Step 3 (Payment)
  const validateShippingForm = () => {
    setFormError(null);
    if (!name.trim()) {
      setFormError('Por favor ingresá tu nombre y apellido para continuar.');
      return false;
    }
    if (!phone.trim()) {
      setFormError('Por favor ingresá tu teléfono o WhatsApp de contacto.');
      return false;
    }
    if (selectedShipping !== 'pickup' && !address.trim()) {
      setFormError('Por favor ingresá la dirección de entrega (calle, altura y piso/depto).');
      return false;
    }
    return true;
  };

  const handleGoToPayment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (validateShippingForm()) {
      setFormError(null);
      setCurrentStep('payment');
    }
  };

  const handleStepClick = (stepId: 'cart' | 'shipping' | 'payment') => {
    if (stepId === 'cart') {
      if (onBackToCart) {
        onBackToCart();
      } else {
        onClose();
      }
      return;
    }

    if (stepId === 'shipping') {
      if (currentStep === 'payment') {
        setFormError(null);
        setCurrentStep('shipping');
      }
      return;
    }

    if (stepId === 'payment') {
      if (currentStep === 'shipping') {
        handleGoToPayment();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateShippingForm()) {
      setCurrentStep('shipping');
      return;
    }

    setLoading(true);
    setFormError(null);

    const newOrder: OrderDetails = {
      orderId: `JQ-${Math.floor(100000 + Math.random() * 900000)}`,
      customerName: name.trim(),
      customerPhone: phone.trim(),
      customerEmail: email.trim(),
      deliveryMethod: selectedShipping,
      address: selectedShipping === 'pickup' ? `Entrega a coordinar (${store.address})` : `${address}, ${city}`,
      notes,
      paymentMethod,
      items,
      subtotal,
      discount: totalDiscount,
      shippingCost,
      total,
      status: paymentMethod === 'mercadopago' ? 'pago_pendiente' : 'pendiente',
      createdAt: new Date().toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    // Mercado Pago: pago online real con link de Checkout Pro
    if (paymentMethod === 'mercadopago') {
      try {
        const mp = await createMpPayment(newOrder);
        setMpInitPoint(mp.initPoint);
        setConfirmedOrder(mp.order);
        setCurrentStep('success');
        onOrderCompleted(mp.order);
        window.open(mp.initPoint, '_blank', 'noopener,noreferrer');
      } catch (err: any) {
        setFormError(
          err.message || 'No se pudo generar el link de pago. Probá con transferencia o escribinos por WhatsApp.'
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      // Save directly to cloud DB and backend
      await saveCloudOrder(newOrder);
      try {
        const res = await fetch('/api/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newOrder),
        });
        if (res.ok) {
          const data = await res.json();
          setConfirmedOrder(data.order || newOrder);
        } else {
          setConfirmedOrder(newOrder);
        }
      } catch {
        setConfirmedOrder(newOrder);
      }
    } catch {
      setConfirmedOrder(newOrder);
    } finally {
      setLoading(false);
      setCurrentStep('success');
      onOrderCompleted(newOrder);
    }
  };

  const copyOrderDetails = () => {
    if (!confirmedOrder) return;
    const text = `Pedido: ${confirmedOrder.orderId}\nCliente: ${confirmedOrder.customerName}\nTotal: ${formatARS(confirmedOrder.total)}\nMétodo de Pago: ${confirmedOrder.paymentMethod}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getWhatsAppOrderUrl = () => {
    if (!confirmedOrder) return '';
    const itemsList = confirmedOrder.items
      .map(i => `• ${i.product.name} (${i.selectedVariant.weight}) x${i.quantity}`)
      .join('\n');
    
    const message = `¡Hola La Joaquina Pet Shop! Acabo de realizar el pedido *${confirmedOrder.orderId}* en la tienda online.\n\n*Detalles del pedido:*\n${itemsList}\n\n*Total:* ${formatARS(confirmedOrder.total)}\n*Pago:* ${confirmedOrder.paymentMethod.toUpperCase()}\n*Entrega:* ${confirmedOrder.deliveryMethod}\n*Dirección:* ${confirmedOrder.address}\n\n¡Aguardo su confirmación! Muchas gracias.`;

    return `https://wa.me/${store.whatsapp}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative bg-[#FFFDF9] rounded-3xl max-w-xl w-full border border-[#E5D7BF] shadow-2xl overflow-hidden z-10 my-6 flex flex-col">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-[#FAF7F2] border-b border-[#E8DFC9] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#1B4E43]" />
            <div>
              <h2 className="font-bold text-base sm:text-lg text-[#1B4E43] font-display leading-tight">
                {currentStep === 'success'
                  ? confirmedOrder?.paymentMethod === 'mercadopago'
                    ? '¡Pedido creado! 💳'
                    : '¡Pedido Confirmado! 🎉'
                  : currentStep === 'payment'
                  ? 'Finalizar Compra • Paso 3: Pago'
                  : 'Finalizar Compra • Paso 2: Envío'}
              </h2>
              <p className="text-[11px] text-[#7A6A59]">
                {currentStep === 'success'
                  ? confirmedOrder?.paymentMethod === 'mercadopago'
                    ? 'Completá el pago online para confirmarlo'
                    : 'Tu compra fue recibida con éxito'
                  : currentStep === 'payment'
                  ? 'Elegí cómo abonar y revisá el resumen'
                  : 'Ingresá tus datos de contacto y entrega'}
              </p>
            </div>
          </div>
          <button
            id="checkout-modal-close"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#7A6A59] hover:text-[#2B231D] hover:bg-[#EFE7D7] transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Steps Progress Bar: Carrito -> Envío -> Pago */}
        <div id="checkout-progress-bar-container" className="px-5 sm:px-8 py-3.5 bg-[#FAF5EC] border-b border-[#E8DFC9]">
          <div className="relative flex items-center justify-between max-w-md mx-auto">
            {/* Background connecting track */}
            <div className="absolute top-4 left-6 right-6 h-1 bg-[#E2D4BC] rounded-full z-0" />
            
            {/* Active filled connecting track */}
            <div 
              className="absolute top-4 left-6 h-1 bg-[#1B4E43] rounded-full z-0 transition-all duration-300"
              style={{
                width: currentStep === 'shipping' 
                  ? '50%' 
                  : 'calc(100% - 3rem)'
              }}
            />

            {/* Step 1: Carrito */}
            <button
              type="button"
              id="checkout-step-cart"
              onClick={() => handleStepClick('cart')}
              className="relative z-10 flex flex-col items-center group cursor-pointer focus:outline-none"
              title="Paso 1: Carrito (Click para volver y revisar productos)"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#1B4E43] text-white flex items-center justify-center font-bold text-xs shadow-xs transition-transform group-hover:scale-110">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <span className="text-[11px] sm:text-xs font-bold text-[#1B4E43] mt-1.5 group-hover:underline">
                Carrito
              </span>
              <span className="text-[9px] text-[#256B5C] font-semibold hidden sm:inline">
                Listo ✓
              </span>
            </button>

            {/* Step 2: Envío */}
            <button
              type="button"
              id="checkout-step-shipping"
              onClick={() => handleStepClick('shipping')}
              className={`relative z-10 flex flex-col items-center focus:outline-none ${
                currentStep === 'payment' ? 'cursor-pointer group' : 'cursor-default'
              }`}
              title="Paso 2: Envío"
            >
              <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-xs ${
                currentStep === 'shipping'
                  ? 'bg-[#EFA332] text-[#1E170E] ring-4 ring-[#EFA332]/30 scale-105 font-black'
                  : currentStep === 'payment' || currentStep === 'success'
                  ? 'bg-[#1B4E43] text-white group-hover:scale-110'
                  : 'bg-[#FAF5EC] border-2 border-[#E3D6BE] text-[#8A7969]'
              }`}>
                {currentStep === 'payment' || currentStep === 'success' ? (
                  <Check className="w-4 h-4 stroke-[3]" />
                ) : (
                  <Truck className="w-4 h-4" />
                )}
              </div>
              <span className={`text-[11px] sm:text-xs font-bold mt-1.5 ${
                currentStep === 'shipping'
                  ? 'text-[#1E170E] font-black'
                  : currentStep === 'payment' || currentStep === 'success'
                  ? 'text-[#1B4E43] group-hover:underline'
                  : 'text-[#8A7969]'
              }`}>
                Envío
              </span>
              <span className="text-[9px] text-[#7A6A59] font-medium hidden sm:inline">
                {currentStep === 'shipping' ? 'En curso' : 'Listo ✓'}
              </span>
            </button>

            {/* Step 3: Pago */}
            <button
              type="button"
              id="checkout-step-payment"
              onClick={() => handleStepClick('payment')}
              className={`relative z-10 flex flex-col items-center focus:outline-none ${
                currentStep === 'shipping' ? 'cursor-pointer group' : 'cursor-default'
              }`}
              title="Paso 3: Pago"
            >
              <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-xs ${
                currentStep === 'success'
                  ? 'bg-[#1B4E43] text-white'
                  : currentStep === 'payment'
                  ? 'bg-[#EFA332] text-[#1E170E] ring-4 ring-[#EFA332]/30 scale-105 font-black'
                  : 'bg-[#FAF5EC] border-2 border-[#E3D6BE] text-[#8A7969] group-hover:border-[#1B4E43]'
              }`}>
                {currentStep === 'success' ? (
                  <Check className="w-4 h-4 stroke-[3]" />
                ) : (
                  <CreditCard className="w-4 h-4" />
                )}
              </div>
              <span className={`text-[11px] sm:text-xs font-bold mt-1.5 ${
                currentStep === 'payment'
                  ? 'text-[#1E170E] font-black'
                  : currentStep === 'success'
                  ? 'text-[#1B4E43]'
                  : 'text-[#8A7969]'
              }`}>
                Pago
              </span>
              <span className="text-[9px] text-[#7A6A59] font-medium hidden sm:inline">
                {currentStep === 'success' ? 'Confirmado ✓' : currentStep === 'payment' ? 'En curso' : 'Paso final'}
              </span>
            </button>
          </div>
        </div>

        {/* Step Content */}
        <div className="p-4 sm:p-6 max-h-[75vh] overflow-y-auto">
          {formError && (
            <div className="mb-4 p-3 bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#EF4444]" />
              <span className="font-semibold">{formError}</span>
            </div>
          )}

          {/* ========================================================
              STEP 2: ENVÍO (Contact + Delivery Selection + Address)
             ======================================================== */}
          {currentStep === 'shipping' && (
            <motion.div
              key="step-shipping"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Contact Data */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[#8A7969] uppercase tracking-wider flex items-center gap-1.5">
                  <span>1. Datos de Contacto</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#5B4E41] mb-1">
                      Nombre y Apellido *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ej: Mariano González"
                      className="w-full text-xs bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1B4E43]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#5B4E41] mb-1">
                      Teléfono / WhatsApp *
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Ej: 11 2345 6789"
                      className="w-full text-xs bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1B4E43]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5B4E41] mb-1">
                    Email para comprobante (opcional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@correo.com"
                    className="w-full text-xs bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1B4E43]"
                  />
                </div>
              </div>

              {/* Delivery Method Selection */}
              <div className="space-y-3 pt-3 border-t border-[#EFE8D8]">
                <h3 className="text-xs font-bold text-[#8A7969] uppercase tracking-wider flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-[#1B4E43]" />
                  <span>2. Método de Entrega</span>
                </h3>

                <div className={`grid grid-cols-1 gap-2.5 ${enabledMethods.length > 2 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
                  {enabledMethods.map((m) => {
                    const active = selectedShipping === m.id;
                    const Icon = m.id === 'pickup' ? Store : m.id === 'correo_argentino' ? MapPin : Truck;
                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedShipping(m.id)}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                          active
                            ? 'border-[#1B4E43] bg-[#E8F3EF] shadow-2xs ring-1 ring-[#1B4E43]'
                            : 'border-[#E5D7BF] bg-[#FAF5EC] hover:bg-[#F2ECE0]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${active ? 'text-[#1B4E43]' : 'text-[#8A7969]'}`} />
                          <span className="font-bold text-xs text-[#2B231D]">{m.label}</span>
                        </div>
                        <span className={`inline-block mt-1 text-[11px] font-black ${m.cost === 0 ? 'text-[#256B5C]' : 'text-[#1B4E43]'}`}>
                          {m.cost === 0 ? 'GRATIS' : formatARS(m.cost)}
                        </span>
                        {m.detail && (
                          <p className="text-[10px] text-[#6A5949] mt-0.5">{m.detail}</p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Conditional address fields */}
                {selectedShipping === 'pickup' ? (
                  <div className="p-3 bg-[#E8F3EF] rounded-xl text-xs text-[#1B4E43] border border-[#C8DFD7] flex items-start gap-2">
                    <Store className="w-4 h-4 shrink-0 text-[#256B5C] mt-0.5" />
                    <div>
                      <p className="font-bold">Entrega a coordinar:</p>
                      <p className="text-[#3A5D54]">{getMethodLabel(store, 'pickup')} · {store.address}. {store.hours}.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-[#5B4E41] mb-1">
                          Calle, Altura y Piso/Dpto *
                        </label>
                        <input
                          type="text"
                          required
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="Ej: Av. Mitre 452, 2° B"
                          className="w-full text-xs bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1B4E43]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#5B4E41] mb-1">
                          Localidad / Zona
                        </label>
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Bella Vista, San Miguel..."
                          className="w-full text-xs bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1B4E43]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#5B4E41] mb-1">
                        Aclaraciones para el repartidor (opcional)
                      </label>
                      <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Timbre no anda, dejar en portería, etc."
                        className="w-full text-xs bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1B4E43]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2 Actions */}
              <div className="pt-3 border-t border-[#EFE8D8] flex items-center justify-between gap-3">
                <button
                  type="button"
                  id="btn-back-to-cart"
                  onClick={() => {
                    if (onBackToCart) onBackToCart();
                    else onClose();
                  }}
                  className="px-4 py-3 bg-[#FAF5EC] hover:bg-[#F2ECE0] text-[#5A4D3F] border border-[#E3D6BE] font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Volver al Carrito</span>
                </button>

                <button
                  type="button"
                  id="btn-continue-to-payment"
                  onClick={() => handleGoToPayment()}
                  className="flex-1 px-5 py-3 bg-[#EFA332] hover:bg-[#E39420] text-[#1E170E] font-black rounded-xl text-xs sm:text-sm font-display shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Continuar a Forma de Pago</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ========================================================
              STEP 3: PAGO (Payment Method + Cost Breakdown + Confirm)
             ======================================================== */}
          {currentStep === 'payment' && (
            <motion.form
              key="step-payment"
              onSubmit={handleSubmit}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Quick Shipping Review Card */}
              <div className="bg-[#FAF5EC] border border-[#E8DFC9] p-3 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#E8F3EF] text-[#1B4E43] flex items-center justify-center shrink-0">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-[#2B231D] leading-tight">
                      {selectedShipping === 'pickup'
                        ? `Entrega a coordinar (${getMethodLabel(store, 'pickup')})`
                        : `Envío a domicilio: ${address}, ${city}`}
                    </p>
                    <p className="text-[11px] text-[#7A6A59]">
                      Destinatario: {name} • {phone}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep('shipping')}
                  className="text-xs font-bold text-[#1B4E43] hover:underline cursor-pointer shrink-0 ml-2"
                >
                  Modificar
                </button>
              </div>

              {/* Payment Methods */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[#8A7969] uppercase tracking-wider">
                  Seleccioná tu Forma de Pago
                </h3>
                
                <div className="space-y-2">
                  {/* Transferencia */}
                  <label className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    paymentMethod === 'transferencia' 
                      ? 'border-[#1B4E43] bg-[#E8F3EF] ring-1 ring-[#1B4E43] shadow-xs' 
                      : 'border-[#E3D6BE] bg-[#FAF5EC] hover:bg-[#F5EDE0]'
                  }`}>
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'transferencia'}
                      onChange={() => setPaymentMethod('transferencia')}
                      className="mt-1 accent-[#1B4E43] cursor-pointer"
                    />
                    <div className="flex-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#1B4E43] flex items-center gap-1.5 text-sm">
                          <Banknote className="w-4 h-4 text-[#256B5C]" />
                          Transferencia Bancaria Directa
                        </span>
                        <span className="bg-[#EFA332] text-[#1E170E] font-black text-[10px] px-2 py-0.5 rounded-full shadow-2xs">
                          {store.transferPercent}% OFF EXTRA
                        </span>
                      </div>
                      <p className="text-[#6A5949] mt-1 text-[11px]">
                        Te mostramos el Alias (<strong>{store.aliasTransferencia}</strong>) al confirmar para transferir desde cualquier app bancaria.
                      </p>
                    </div>
                  </label>

                  {/* Mercado Pago */}
                  <label className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    paymentMethod === 'mercadopago' 
                      ? 'border-[#1B4E43] bg-[#E8F3EF] ring-1 ring-[#1B4E43] shadow-xs' 
                      : 'border-[#E3D6BE] bg-[#FAF5EC] hover:bg-[#F5EDE0]'
                  }`}>
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'mercadopago'}
                      onChange={() => setPaymentMethod('mercadopago')}
                      className="mt-1 accent-[#1B4E43] cursor-pointer"
                    />
                    <div className="flex-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#2B231D] flex items-center gap-1.5 text-sm">
                          <Wallet className="w-4 h-4 text-[#009EE3]" />
                          Mercado Pago online
                        </span>
                        <span className="bg-[#009EE3] text-white font-black text-[10px] px-2 py-0.5 rounded-full shadow-2xs">
                          PAGO REAL
                        </span>
                      </div>
                      <p className="text-[#6A5949] mt-0.5 text-[11px]">
                        Tarjetas de crédito, débito y dinero en cuenta. Al confirmar se abre el pago seguro de Mercado Pago en una pestaña nueva.
                      </p>
                    </div>
                  </label>

                  {/* Efectivo */}
                  <label className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    paymentMethod === 'efectivo' 
                      ? 'border-[#1B4E43] bg-[#E8F3EF] ring-1 ring-[#1B4E43] shadow-xs' 
                      : 'border-[#E3D6BE] bg-[#FAF5EC] hover:bg-[#F5EDE0]'
                  }`}>
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'efectivo'}
                      onChange={() => setPaymentMethod('efectivo')}
                      className="mt-1 accent-[#1B4E43] cursor-pointer"
                    />
                    <div className="flex-1 text-xs">
                      <span className="font-bold text-[#2B231D] flex items-center gap-1.5 text-sm">
                        <CreditCard className="w-4 h-4 text-[#7A6A59]" />
                        Efectivo contra entrega
                      </span>
                      <p className="text-[#6A5949] mt-0.5 text-[11px]">
                        Abonás al repartidor en tu domicilio o al recibir tu pedido.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Order Total Breakdown */}
              <div className="bg-[#F6EFE2] p-4 rounded-2xl space-y-2 text-xs border border-[#E8DFC9]">
                <div className="flex justify-between text-[#7A6A59]">
                  <span>Subtotal productos ({items.length}):</span>
                  <span className="font-semibold text-[#2B231D]">{formatARS(subtotal)}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-[#256B5C] font-bold">
                    <span>Cupón (JOAQUINA10):</span>
                    <span>-{formatARS(couponDiscount)}</span>
                  </div>
                )}
                {transferDiscount > 0 && (
                  <div className="flex justify-between text-[#256B5C] font-bold">
                    <span>{store.transferPercent}% OFF Pago por Transferencia:</span>
                    <span>-{formatARS(transferDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#7A6A59]">
                  <span>Envío ({getMethodLabel(store, selectedShipping)}):</span>
                  <span className="font-semibold text-[#2B231D]">{shippingCost === 0 ? 'Gratis' : formatARS(shippingCost)}</span>
                </div>
                <div className="flex justify-between text-base font-black text-[#1B4E43] pt-2 border-t border-[#E0D5BE]">
                  <span>Total a Pagar:</span>
                  <span className="font-display text-xl">{formatARS(total)}</span>
                </div>
              </div>

              {/* Submit / Back actions */}
              <div className="space-y-2 pt-1">
                <button
                  type="submit"
                  id="btn-confirm-order"
                  disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-b from-[#F5B44A] to-[#E39420] text-[#1E170E] font-black rounded-xl text-sm font-display transition-all flex items-center justify-center gap-2 cursor-pointer btn-gloss"
                >
                  {loading ? (
                    <span>Procesando pedido...</span>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5 text-[#1B4E43]" />
                      <span>Confirmar Pedido ({formatARS(total)})</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  id="btn-back-to-shipping"
                  onClick={() => setCurrentStep('shipping')}
                  className="w-full py-2 text-xs font-bold text-[#7A6A59] hover:text-[#1B4E43] text-center cursor-pointer hover:underline"
                >
                  ← Volver al paso de Envío
                </button>
              </div>
            </motion.form>
          )}

          {/* ========================================================
              STEP 4: SUCCESS / CONFIRMATION SCREEN
             ======================================================== */}
          {currentStep === 'success' && (
            <motion.div
              key="step-success"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              className="text-center space-y-5 py-2"
            >
              <div className="w-16 h-16 bg-[#E8F3EF] text-[#256B5C] rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#EFA332] bg-[#FAF5EC] px-3.5 py-1 rounded-full border border-[#E8DFC9]">
                  Código de Pedido: {confirmedOrder?.orderId}
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-[#1B4E43] font-display mt-2.5">
                  ¡Gracias por tu compra, {confirmedOrder?.customerName}!
                </h3>
                <p className="text-xs sm:text-sm text-[#6A5949] mt-1 max-w-md mx-auto leading-relaxed">
                  Tu pedido fue registrado exitosamente. Te mostramos el resumen y ya estamos preparando todo con mucho cariño para tu mascota.
                </p>
              </div>

              {/* Mercado Pago: completar el pago online */}
              {confirmedOrder?.paymentMethod === 'mercadopago' && (
                <div className="bg-[#E8F4FD] border border-[#7CC4EA] p-4 rounded-2xl text-left text-xs space-y-2 text-[#0C4A6E]">
                  <p className="font-bold text-sm flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-[#009EE3]" />
                    Completá tu pago online:
                  </p>
                  <p>
                    Tu pedido quedó reservado como <strong>pago pendiente</strong>. Abrilo con el botón y pagá con tarjeta, débito o dinero en cuenta.
                  </p>
                  {mpInitPoint && (
                    <a
                      href={mpInitPoint}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 bg-[#009EE3] hover:bg-[#0083C0] text-white font-bold py-3 px-4 rounded-xl text-sm transition-all"
                    >
                      <Wallet className="w-5 h-5" />
                      <span>Pagar {formatARS(confirmedOrder.total)} con Mercado Pago</span>
                    </a>
                  )}
                  <p className="text-[11px]">
                    Cuando se acredite el pago preparamos tu envío. Si ya pagaste, avisanos por WhatsApp con tu código {confirmedOrder.orderId}.
                  </p>
                </div>
              )}

              {/* Bank details if transfer */}
              {confirmedOrder?.paymentMethod === 'transferencia' && (
                <div className="bg-[#FAF5EC] border border-[#E8DFC9] p-4 rounded-2xl text-left text-xs space-y-1.5 text-[#423427]">
                  <p className="font-bold text-[#1B4E43] text-sm mb-1 flex items-center gap-1.5">
                    <Banknote className="w-4 h-4 text-[#256B5C]" />
                    Datos para Transferencia Bancaria ({store.transferPercent}% OFF aplicado):
                  </p>
                  <p>• <strong>Banco:</strong> Banco Galicia / Mercado Pago</p>
                  <p>• <strong>Titular:</strong> La Joaquina Pet Shop</p>
                   <p>• <strong>Alias:</strong> <span className="bg-[#E8F3EF] px-2 py-0.5 rounded font-mono font-bold text-[#1B4E43]">{store.aliasTransferencia}</span></p>
                  <p>• <strong>Importe a transferir:</strong> <span className="font-bold text-[#1B4E43] text-sm">{formatARS(confirmedOrder.total)}</span></p>
                </div>
              )}

              {/* Action buttons */}
              <div className="space-y-2 pt-2">
                <a
                  href={getWhatsAppOrderUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  id="btn-whatsapp-order-confirm"
                  className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20BA5A] text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-all shadow-sm"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>Enviar Comprobante por WhatsApp</span>
                </a>

                <div className="flex gap-2">
                  <button
                    onClick={copyOrderDetails}
                    id="btn-copy-order-details"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#FAF5EC] hover:bg-[#F2ECE0] text-[#5A4D3F] border border-[#E3D6BE] text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-4 h-4 text-[#256B5C]" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copiado al portapapeles' : 'Copiar datos del pedido'}</span>
                  </button>

                  <button
                    onClick={onClose}
                    id="btn-close-and-return"
                    className="flex-1 py-2.5 px-3 bg-[#1B4E43] hover:bg-[#256B5C] text-white text-xs font-bold rounded-xl transition-colors font-display cursor-pointer"
                  >
                    Volver a la tienda
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>

      </div>
    </div>
  );
};
