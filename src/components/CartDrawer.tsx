import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Trash2,
  ShoppingBag,
  ArrowRight,
  ExternalLink,
  Tag,
  Truck,
  ShieldCheck,
  CheckCircle2,
  Store,
  MapPin
} from 'lucide-react';
import { CartItem, StoreSettings } from '../types';
import { DEFAULT_SETTINGS, getEnabledShipping, getShippingCost } from '../lib/storeSettings';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: string, weight: string, delta: number) => void;
  onRemoveItem: (productId: string, weight: string) => void;
  onClearCart: () => void;
  onProceedToCheckout: (shippingMethod: 'pickup' | 'express_amba' | 'correo_argentino', discountCode: string) => void;
  settings?: StoreSettings;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  settings,
}) => {
  const store = settings || DEFAULT_SETTINGS;
  const enabledMethods = getEnabledShipping(store);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [shippingMethod, setShippingMethod] = useState<'pickup' | 'express_amba' | 'correo_argentino'>('express_amba');

  useEffect(() => {
    if (!enabledMethods.some((m) => m.id === shippingMethod) && enabledMethods.length > 0) {
      setShippingMethod(enabledMethods[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  if (!isOpen) return null;

  const subtotal = items.reduce(
    (sum, item) => sum + item.selectedVariant.price * item.quantity,
    0
  );

  const discountPercentage = appliedCoupon && appliedCoupon === store.couponCode.toUpperCase() ? store.couponPercent / 100 : 0;
  const discountAmount = subtotal * discountPercentage;

  const shippingCost = getShippingCost(store, shippingMethod);
  const total = Math.max(0, subtotal - discountAmount + shippingCost);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = couponCode.trim().toUpperCase();
    if (clean === store.couponCode.toUpperCase()) {
      setAppliedCoupon(store.couponCode.toUpperCase());
      setCouponError(null);
    } else {
      setCouponError(`Cupón inválido. Probá con: ${store.couponCode}`);
    }
  };

  const formatARS = (amount: number) =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Dark overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#FFFDF9] border-l border-[#E5D7BF] shadow-2xl flex flex-col">
          
          {/* Header */}
          <div className="p-4 sm:p-5 bg-[#FAF7F2] border-b border-[#E8DFC9] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#1B4E43]" />
              <h2 className="font-bold text-lg text-[#1B4E43] font-display">
                Carrito de Compras
              </h2>
              <span className="text-xs bg-[#EFA332] text-[#1E170E] font-extrabold px-2 py-0.5 rounded-full">
                {items.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-[#7A6A59] hover:text-[#2B231D] hover:bg-[#EFE7D7] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Checkout Steps Progress Bar in Cart (Step 1: Carrito) */}
          <div id="cart-drawer-progress-bar" className="px-5 py-2.5 bg-[#FAF5EC] border-b border-[#E8DFC9]">
            <div className="relative flex items-center justify-between max-w-xs mx-auto">
              <div className="absolute top-3 left-4 right-4 h-0.5 bg-[#E3D6BE] z-0" />
              
              {/* Step 1: Carrito (Active) */}
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-[#EFA332] text-[#1E170E] font-black text-[11px] flex items-center justify-center ring-3 ring-[#EFA332]/30 shadow-xs">
                  1
                </div>
                <span className="text-[10px] font-black text-[#1E170E] mt-1">
                  Carrito
                </span>
              </div>

              {/* Step 2: Envío */}
              <div className="relative z-10 flex flex-col items-center opacity-65">
                <div className="w-6 h-6 rounded-full bg-[#F5EBD9] border border-[#D8C7AD] text-[#8A7969] font-bold text-[11px] flex items-center justify-center">
                  2
                </div>
                <span className="text-[10px] font-semibold text-[#8A7969] mt-1">
                  Envío
                </span>
              </div>

              {/* Step 3: Pago */}
              <div className="relative z-10 flex flex-col items-center opacity-65">
                <div className="w-6 h-6 rounded-full bg-[#F5EBD9] border border-[#D8C7AD] text-[#8A7969] font-bold text-[11px] flex items-center justify-center">
                  3
                </div>
                <span className="text-[10px] font-semibold text-[#8A7969] mt-1">
                  Pago
                </span>
              </div>
            </div>
          </div>

          {/* Cart items scrollable body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {items.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-[#FAF5EC] flex items-center justify-center text-4xl mb-4 text-[#D5C2A5]">
                  🐾
                </div>
                <h3 className="font-bold text-base text-[#1B4E43]">
                  Tu carrito está vacío
                </h3>
                <p className="text-xs text-[#7A6A59] mt-1.5 max-w-xs mx-auto">
                  Agregá alimentos, piedras o accesorios para iniciar tu compra integrada o en Mercado Libre.
                </p>
                <button
                  onClick={onClose}
                  className="mt-6 inline-flex items-center gap-2 bg-[#EFA332] hover:bg-[#E39420] text-[#1E170E] font-bold text-xs px-5 py-2.5 rounded-full font-display"
                >
                  Explorar catálogo
                </button>
              </div>
            ) : (
              items.map((item, index) => (
                <div 
                  key={`${item.product.id}-${item.selectedVariant.weight}-${index}`}
                  className="flex gap-3 bg-white p-3 rounded-2xl border border-[#E8DFC9] shadow-2xs"
                >
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="w-16 h-16 rounded-xl object-cover bg-[#F6EFE2] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="text-xs font-bold text-[#2B231D] truncate">
                        {item.product.name}
                      </h4>
                      <button
                        onClick={() => onRemoveItem(item.product.id, item.selectedVariant.weight)}
                        className="text-[#9C8B7A] hover:text-[#DE5D4E] transition-colors p-0.5"
                        title="Eliminar producto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-[11px] text-[#7A6A59] mt-0.5">
                      Presentación: <span className="font-semibold text-[#1B4E43]">{item.selectedVariant.weight}</span>
                    </p>

                    <div className="flex items-center justify-between mt-2.5">
                      <div className="flex items-center gap-2 border border-[#E3D6BE] rounded-lg p-0.5 bg-[#FAF5EC]">
                        <motion.button
                          whileTap={{ scale: 0.82 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                          onClick={() => onUpdateQuantity(item.product.id, item.selectedVariant.weight, -1)}
                          className="w-5 h-5 rounded bg-white text-xs font-bold text-[#2B231D] hover:bg-[#E8DFC9] flex items-center justify-center cursor-pointer"
                        >
                          -
                        </motion.button>
                        <span className="text-xs font-bold w-4 text-center">
                          {item.quantity}
                        </span>
                        <motion.button
                          whileTap={{ scale: 0.82 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                          onClick={() => onUpdateQuantity(item.product.id, item.selectedVariant.weight, 1)}
                          className="w-5 h-5 rounded bg-white text-xs font-bold text-[#2B231D] hover:bg-[#E8DFC9] flex items-center justify-center cursor-pointer"
                        >
                          +
                        </motion.button>
                      </div>

                      <span className="font-bold text-xs text-[#1B4E43]">
                        {formatARS(item.selectedVariant.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Shipping selection if items exist */}
            {items.length > 0 && (
              <div className="pt-2 border-t border-[#E8DFC9] space-y-2">
                <span className="text-xs font-bold text-[#6A5949] flex items-center gap-1.5 uppercase tracking-wider">
                  <Truck className="w-3.5 h-3.5 text-[#1B4E43]" />
                  Método de entrega:
                </span>
                <div className="space-y-1.5 text-xs">
                  {enabledMethods.map((m) => {
                    const Icon = m.id === 'pickup' ? Store : m.id === 'correo_argentino' ? MapPin : Truck;
                    const active = shippingMethod === m.id;
                    return (
                      <label
                        key={m.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                          active
                            ? 'border-[#1B4E43] bg-[#E8F3EF] font-semibold text-[#1B4E43]'
                            : 'border-[#E3D6BE] bg-[#FAF5EC] text-[#5B4D3F]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="shipping"
                            checked={active}
                            onChange={() => setShippingMethod(m.id)}
                            className="accent-[#1B4E43]"
                          />
                          <Icon className="w-3.5 h-3.5 opacity-70" />
                          <span>{m.label}{m.detail ? ` (${m.detail})` : ''}</span>
                        </div>
                        <span className={`font-bold ${m.cost === 0 ? 'text-[#256B5C]' : ''}`}>
                          {m.cost === 0 ? '¡GRATIS!' : formatARS(m.cost)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Promo coupon if items exist */}
            {items.length > 0 && (
              <div className="pt-2">
                <form onSubmit={handleApplyCoupon} className="flex gap-1.5">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder={`Cupón de descuento (ej: ${store.couponCode})`}
                      className="w-full text-xs bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl px-3 py-2 pl-7 uppercase focus:outline-none focus:ring-1 focus:ring-[#1B4E43]"
                    />
                    <Tag className="w-3.5 h-3.5 text-[#8A7969] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                  <button
                    type="submit"
                    className="bg-[#1B4E43] hover:bg-[#256B5C] text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors shrink-0"
                  >
                    Aplicar
                  </button>
                </form>
                {appliedCoupon && (
                  <p className="text-[11px] text-[#256B5C] font-bold mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    ¡Cupón {store.couponCode} aplicado! {store.couponPercent}% de descuento
                  </p>
                )}
                {couponError && (
                  <p className="text-[11px] text-[#DE5D4E] font-medium mt-1">
                    {couponError}
                  </p>
                )}
              </div>
            )}

          </div>

          {/* Footer with totals and action buttons */}
          {items.length > 0 && (
            <div className="p-4 sm:p-5 bg-[#FAF7F2] border-t border-[#E8DFC9] space-y-3">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-[#7A6A59]">
                  <span>Subtotal productos:</span>
                  <span>{formatARS(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-[#256B5C] font-semibold">
                    <span>Descuento cupón:</span>
                    <span>-{formatARS(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#7A6A59]">
                  <span>Costo de envío:</span>
                  <span>{shippingCost === 0 ? 'Gratis' : formatARS(shippingCost)}</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-[#1B4E43] pt-1.5 border-t border-[#E8DFC9]">
                  <span>Total final:</span>
                  <span className="font-display text-lg">{formatARS(total)}</span>
                </div>
              </div>

              <div className="space-y-2">
                {/* 1. Integrated store checkout */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 18 }}
                  onClick={() => onProceedToCheckout(shippingMethod, appliedCoupon || '')}
                  className="w-full flex items-center justify-center gap-2 bg-[#EFA332] hover:bg-[#E39420] text-[#1E170E] font-extrabold py-3 px-4 rounded-xl text-sm font-display shadow-md transition-colors cursor-pointer"
                >
                  <span>Iniciar Compra Integrada</span>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>

                {/* 2. Mercado Libre Option */}
                <a
                  href="https://listado.mercadolibre.com.ar/la-juaquina"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-[#FFF159] hover:bg-[#FFE926] text-[#2D3277] font-bold py-2.5 px-4 rounded-xl text-xs border border-[#E5DA4F] transition-all"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="7" width="18" height="13" rx="2" />
                    <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                  <span>Comprar también en Mercado Libre</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <p className="text-[10px] text-center text-[#7A6A59] flex items-center justify-center gap-1">
                <ShieldCheck className="w-3 h-3 text-[#256B5C]" />
                Pago seguro vía Mercado Pago, Transferencia o Efectivo
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
