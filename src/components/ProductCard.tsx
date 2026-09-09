import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  Star, 
  ExternalLink, 
  Info, 
  Check, 
  ShieldCheck,
  Zap,
  Bell,
  PackageX
} from 'lucide-react';
import { Product, ProductVariant } from '../types';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, variant: ProductVariant) => void;
  onOpenDetails: (product: Product) => void;
  onOpenStockAlert?: (product: Product, variant: ProductVariant) => void;
  index?: number;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  onOpenDetails,
  onOpenStockAlert,
  index,
}) => {
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [justAdded, setJustAdded] = useState(false);

  const fallbackVariant: ProductVariant = { weight: 'Estándar', price: 0, inStock: true };
  const activeVariant = (product.variants && product.variants.length > 0)
    ? (product.variants[selectedVariantIndex] || product.variants[0])
    : fallbackVariant;

  const isOutOfStock = activeVariant.inStock === false;

  const handleAdd = () => {
    if (isOutOfStock) {
      onOpenStockAlert?.(product, activeVariant);
      return;
    }
    onAddToCart(product, activeVariant);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1800);
  };


  const formattedPrice = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(activeVariant.price || 0);

  const formattedOriginalPrice = activeVariant.originalPrice
    ? new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        maximumFractionDigits: 0,
      }).format(activeVariant.originalPrice)
    : null;

  // Generate direct Mercado Libre URL with precise search
  const mlUrl = product.mercadolibreUrl || 
    `https://listado.mercadolibre.com.ar/${encodeURIComponent((product.mercadolibreQuery || product.name) + ' ' + (activeVariant.weight || ''))}`;


  const delayMs = index !== undefined ? Math.min(index * 45, 360) : 0;

  return (
    <div 
      style={{ 
        animationDelay: `${delayMs}ms`,
        animationFillMode: 'both' 
      }}
      className="animate-fade-slide-up lift-3d bg-gradient-to-b from-[#FFFDF9] to-[#FDF8EE] rounded-2xl border border-[#E8DFC9] shadow-xs flex flex-col overflow-hidden group"
    >
      
      {/* Image container */}
      <div className="relative aspect-[4/3] bg-[#F4EDE0] overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=600&auto=format&fit=crop&q=80';
          }}
        />


        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
          {isOutOfStock && (
            <span className="bg-[#B91C1C] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
              <PackageX className="w-3 h-3" />
              Agotado
            </span>
          )}
          {product.badge && !isOutOfStock && (
            <span className="bg-[#DE5D4E] text-white text-[11px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
              {product.badge}
            </span>
          )}
          {product.isBestSeller && !isOutOfStock && (
            <span className="bg-[#EFA332] text-[#1E170E] text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
              Top Ventas
            </span>
          )}
          {!isOutOfStock && typeof activeVariant.stock === 'number' && activeVariant.stock <= 5 && (
            <span className="bg-[#7C3AED] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
              ¡Últimas {activeVariant.stock} u.!
            </span>
          )}
        </div>


        {/* Quick info button */}
        <button
          onClick={() => onOpenDetails(product)}
          className="absolute top-2.5 right-2.5 bg-white/90 hover:bg-white text-[#2B231D] p-1.5 rounded-full shadow-xs backdrop-blur-xs transition-transform hover:scale-110 cursor-pointer"
          title="Ver detalles e información nutricional"
        >
          <Info className="w-4 h-4 text-[#1B4E43]" />
        </button>

        {/* Bottom ML guarantee tag */}
        <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded-md flex items-center justify-between">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-[#EFA332]" />
            Garantía de fábrica
          </span>
          <span className="text-[#FFE600] font-bold">Disponible en ML</span>
        </div>
      </div>

      {/* Body content */}
      <div className="p-4 flex-1 flex flex-col">
        
        {/* Brand & Subcategory */}
        <div className="flex items-center justify-between gap-2 text-xs mb-1">
          <span className="font-bold text-[#1B4E43] uppercase tracking-wide bg-[#E8F3EF] px-2 py-0.5 rounded-md">
            {product.brand}
          </span>
          {product.subCategory && (
            <span className="text-[#8C7B6A] text-[11px] font-medium">
              {product.subCategory}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 
          onClick={() => onOpenDetails(product)}
          className="font-bold text-[#2B231D] text-sm sm:text-base leading-snug line-clamp-2 mt-1 cursor-pointer hover:text-[#1B4E43] transition-colors"
        >
          {product.name}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-[#8C7B6A]">
          <div className="flex text-[#EFA332]">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-3.5 h-3.5 ${
                  i < Math.floor(product.rating) ? 'fill-[#EFA332]' : 'text-[#D5C6B0]'
                }`}
              />
            ))}
          </div>
          <span className="font-bold text-[#2B231D]">{product.rating}</span>
          <span>({product.reviewsCount})</span>
        </div>

        {/* Description snippet */}
        <p className="text-xs text-[#6B5B4C] mt-2 line-clamp-2 leading-relaxed">
          {product.description}
        </p>

        {/* Presentation / Weight Selector */}
        {product.variants.length > 1 && (
          <div className="mt-3 pt-2.5 border-t border-[#EFE8D8]">
            <span className="text-[11px] font-bold text-[#8A7866] block mb-1.5 uppercase tracking-wider">
              Presentación:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {product.variants.map((variant, idx) => (
                <motion.button
                  key={idx}
                  whileTap={{ scale: 0.94 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                  onClick={() => setSelectedVariantIndex(idx)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                    selectedVariantIndex === idx
                      ? 'bg-[#1B4E43] text-white shadow-2xs'
                      : variant.inStock === false
                      ? 'bg-[#FEE2E2]/60 text-[#991B1B] border border-[#FECACA] line-through decoration-[#DC2626]/60'
                      : 'bg-[#FAF5EC] text-[#5A4D3F] border border-[#E3D6BE] hover:bg-[#F2ECE0]'
                  }`}
                  title={variant.inStock === false ? 'Agotado temporalmente' : undefined}
                >
                  <span>{variant.weight}</span>
                  {variant.inStock === false && (
                    <span className="text-[9px] no-underline font-extrabold uppercase text-[#DC2626]">
                      (Agotado)
                    </span>
                  )}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Pricing area */}
        <div className="mt-auto pt-3 border-t border-[#EFE8D8]">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-extrabold text-[#1B4E43] font-display">
              {formattedPrice}
            </span>
            {formattedOriginalPrice && (
              <span className="text-xs text-[#A08E7D] line-through">
                {formattedOriginalPrice}
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#256B5C] font-semibold flex items-center gap-1 mt-0.5">
            <Zap className="w-3 h-3 text-[#EFA332]" />
            10% OFF pagando con transferencia ($
            {Math.round(activeVariant.price * 0.9).toLocaleString('es-AR')})
          </p>
        </div>

        {/* Action Buttons: Integrated Cart vs Mercado Libre vs Stock Alert */}
        <div className="mt-3 space-y-2">
          {/* 1. If Out of Stock: Avisarme cuando haya stock Button */}
          {isOutOfStock ? (
            <motion.button
              id={`btn-stock-alert-${product.id}`}
              onClick={() => onOpenStockAlert?.(product, activeVariant)}
              whileHover={{ scale: 1.02, transition: { duration: 0.15 } }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 450, damping: 17 }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm font-display bg-[#FFF7ED] hover:bg-[#FFEDD5] text-[#C2410C] border-2 border-[#FDBA74] shadow-xs cursor-pointer transition-all group"
            >
              <Bell className="w-4 h-4 fill-[#EA580C] text-[#EA580C] group-hover:scale-110 transition-transform" />
              <span>Avisarme cuando haya stock</span>
            </motion.button>
          ) : (
            /* Add to Integrated Store Cart */
            <motion.button
              id={`btn-add-cart-${product.id}`}
              onClick={handleAdd}
              disabled={justAdded}
              whileHover={{ scale: 1.02, transition: { duration: 0.15 } }}
              whileTap={{ scale: 0.93 }}
              animate={justAdded ? { scale: [1, 1.06, 0.98, 1] } : {}}
              transition={{ type: 'spring', stiffness: 450, damping: 17 }}
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm font-display transition-colors cursor-pointer ${
                justAdded
                  ? 'bg-[#256B5C] text-white'
                  : 'bg-gradient-to-b from-[#F5B44A] to-[#E39420] text-[#1E170E] btn-gloss'
              }`}
            >
              <AnimatePresence mode="wait">
                {justAdded ? (
                  <motion.span
                    key="added"
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.7, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    className="flex items-center gap-1.5"
                  >
                    <motion.span
                      initial={{ rotate: -45, scale: 0.5 }}
                      animate={{ rotate: 0, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 600, damping: 15 }}
                    >
                      <Check className="w-4 h-4" />
                    </motion.span>
                    <span>¡Agregado al carrito!</span>
                  </motion.span>
                ) : (
                  <motion.span
                    key="default"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <motion.span
                      whileHover={{ rotate: [-5, 5, -3, 0], transition: { duration: 0.3 } }}
                    >
                      <ShoppingBag className="w-4 h-4" />
                    </motion.span>
                    <span>Agregar al Carrito</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          )}

          {/* 2. Buy on Mercado Libre */}

          <a
            href={mlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-bold text-xs text-[#2D3277] bg-[#FFF159]/90 hover:bg-[#FFF159] border border-[#E5DA4F] transition-all hover:shadow-xs group"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="7" width="18" height="13" rx="2" />
              <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
            <span>Comprar en Mercado Libre</span>
            <ExternalLink className="w-3 h-3 text-[#2D3277]/70 group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>

      </div>

    </div>
  );
};
