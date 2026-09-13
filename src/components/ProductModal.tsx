import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ShoppingBag, 
  ShieldCheck, 
  Truck, 
  Check, 
  MessageCircle,
  Award,
  Bell,
  PackageX
} from 'lucide-react';
import { Product, ProductVariant, StoreSettings } from '../types';
import { DEFAULT_SETTINGS, waLink } from '../lib/storeSettings';
import { RelatedProducts } from './RelatedProducts';
import { ProductReviews } from './ProductReviews';

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, variant: ProductVariant, quantity: number) => void;
  onOpenStockAlert?: (product: Product, variant: ProductVariant) => void;
  onOpenDetails?: (product: Product) => void;
  products?: Product[];
  customerName?: string;
  settings?: StoreSettings;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  onClose,
  onAddToCart,
  onOpenStockAlert,
  onOpenDetails,
  products,
  customerName,
  settings,
}) => {
  if (!product) return null;

  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [selectedImg, setSelectedImg] = useState(0);

  const gallery = [product.image, ...((product.images || []).filter((u) => u && u !== product.image))].slice(0, 6);

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
    onAddToCart(product, activeVariant, quantity);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      onClose();
    }, 1500);
  };


  const formattedPrice = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format((activeVariant.price || 0) * quantity);

  const store = settings || DEFAULT_SETTINGS;

  const whatsappText = `¡Hola La Joaquina! Quiero consultar sobre el producto: ${product.name} (${activeVariant.weight}). ¿Tienen stock disponible para entrega inmediata?`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative bg-[#FFFDF9] rounded-3xl max-w-2xl w-full border border-[#E5D7BF] shadow-2xl overflow-hidden z-10 my-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-white/90 hover:bg-white text-[#2B231D] p-2 rounded-full shadow-md z-20 transition-transform hover:scale-110 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          
          {/* Image side */}
          <div className="relative bg-[#F4EDE0] flex flex-col items-center justify-center p-6 min-h-[260px] md:min-h-full gap-3">
            <img
              src={gallery[Math.min(selectedImg, gallery.length - 1)]}
              alt={product.name}
              className="max-h-72 w-auto object-contain rounded-xl shadow-sm"
            />
            {gallery.length > 1 && (
              <div className="flex gap-1.5">
                {gallery.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImg(i)}
                    className={`w-12 h-12 rounded-lg overflow-hidden border-2 cursor-pointer bg-white ${i === selectedImg ? 'border-[#1B4E43]' : 'border-transparent opacity-70 hover:opacity-100'}`}
                  >
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            {product.badge && (
              <span className="absolute top-4 left-4 bg-[#DE5D4E] text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                {product.badge}
              </span>
            )}
          </div>

          {/* Details side */}
          <div className="p-6 sm:p-8 flex flex-col max-h-[85vh] overflow-y-auto">
            
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-[#E8F3EF] text-[#1B4E43] font-bold text-xs px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {product.brand}
              </span>
              <span className="text-xs text-[#8A7969] font-medium">
                Categoría: {product.category}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-[#2B231D] font-display mt-1">
              {product.name}
            </h2>

            {/* Description */}
            <p className="text-xs sm:text-sm text-[#5B4E41] mt-3 leading-relaxed">
              {product.description}
            </p>

            {/* Guía de talles (accesorios: correas, pretales, ropa) */}
            {product.category === 'accesorios' && (
              <details className="mt-3 bg-[#FAF5EC] border border-[#E8DFC9] rounded-xl text-xs overflow-hidden">
                <summary className="px-3 py-2 font-bold text-[#1B4E43] cursor-pointer select-none">
                  📏 Guía de talles
                </summary>
                <div className="px-3 pb-3 text-[11px] text-[#5B4E41] leading-relaxed">
                  <p><strong>Pretales y collares:</strong> medí el cuello/contorno con cinta métrica sin ajustar.</p>
                  <ul className="list-disc ml-4 mt-1">
                    <li><strong>Talle S:</strong> hasta 35 cm (gatos y razas mini)</li>
                    <li><strong>Talle M:</strong> 35 a 55 cm (caniches, bulldog francés)</li>
                    <li><strong>Talle L:</strong> 55 a 75 cm (labradores, ovejeros)</li>
                    <li><strong>Talle XL:</strong> más de 75 cm (razas gigantes)</li>
                  </ul>
                  <p className="mt-1"><strong>Ropa:</strong> medí largo del lomo (cuello a cola) y elegí el talle más cercano hacia arriba. Entre dos talles, quedate con el más grande.</p>
                  <p className="mt-1"><strong>Camas:</strong> tu mascota estirada + 15 cm de margen. ¿Dudás? consultanos por WhatsApp con el peso y la raza. 🐾</p>
                </div>
              </details>
            )}

            {/* Nutritional info if exists */}
            {product.nutritionalInfo && (
              <div className="mt-3.5 bg-[#FAF5EC] border border-[#E8DFC9] p-3 rounded-xl text-xs">
                <div className="font-bold text-[#1B4E43] flex items-center gap-1.5 mb-1">
                  <Award className="w-3.5 h-3.5 text-[#EFA332]" />
                  <span>Composición y Garantía Nutricional:</span>
                </div>
                <p className="text-[#685848] text-[11px] leading-relaxed">
                  {product.nutritionalInfo}
                </p>
              </div>
            )}

            {/* Variant / Weight Selector */}
            <div className="mt-4">
              <span className="text-xs font-bold text-[#7A6958] block mb-2 uppercase tracking-wider">
                Seleccionar Tamaño / Presentación:
              </span>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant, idx) => (
                  <motion.button
                    key={idx}
                    whileTap={{ scale: 0.94 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    onClick={() => setSelectedVariantIndex(idx)}
                    className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      selectedVariantIndex === idx
                        ? 'bg-[#1B4E43] text-white shadow-xs'
                        : variant.inStock === false
                        ? 'bg-[#FEE2E2]/60 text-[#991B1B] border border-[#FECACA] line-through decoration-[#DC2626]/60'
                        : 'bg-[#FAF5EC] text-[#5A4D3F] border border-[#E3D6BE] hover:bg-[#F2ECE0]'
                    }`}
                  >
                    <span>{variant.weight}</span>
                    {variant.inStock === false && (
                      <span className="text-[9px] no-underline font-extrabold uppercase text-[#DC2626]">
                        (Sin Stock)
                      </span>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Quantity Selector - Only if in stock */}
            {!isOutOfStock && (
              <div className="mt-4 flex items-center justify-between border-t border-[#EFE8D8] pt-3">
                <span className="text-xs font-bold text-[#7A6958]">Cantidad:</span>
                <div className="flex items-center gap-2 border border-[#E3D6BE] rounded-xl p-1 bg-[#FAF5EC]">
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-7 h-7 rounded-lg bg-white text-[#2B231D] font-bold flex items-center justify-center hover:bg-[#F0EAE0] transition-colors cursor-pointer"
                  >
                    -
                  </motion.button>
                  <span className="text-sm font-bold w-6 text-center">{quantity}</span>
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-7 h-7 rounded-lg bg-white text-[#2B231D] font-bold flex items-center justify-center hover:bg-[#F0EAE0] transition-colors cursor-pointer"
                  >
                    +
                  </motion.button>
                </div>
              </div>
            )}

            {/* Price section */}
            <div className="mt-4 bg-[#F6EFE2] p-3 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[11px] text-[#7A6B5B] block font-semibold">Subtotal:</span>
                <span className="text-2xl font-black text-[#1B4E43] font-display">
                  {formattedPrice}
                </span>
              </div>
              <span className="text-[11px] text-[#256B5C] font-bold bg-[#E8F3EF] px-2 py-1 rounded-lg">
                {store.transferPercent}% OFF pagando con transferencia
              </span>
            </div>

            {/* Action buttons */}
            <div className="mt-4 space-y-2.5">
              {/* Out of stock alert banner and button */}
              {isOutOfStock ? (
                <div className="bg-[#FFF7ED] border border-[#FDBA74] p-3.5 rounded-2xl space-y-2.5">
                  <div className="flex items-center gap-2 text-[#C2410C] font-bold text-xs">
                    <PackageX className="w-4 h-4 text-[#EA580C]" />
                    <span>Presentación ({activeVariant.weight}) sin stock en este momento</span>
                  </div>
                  <p className="text-[11px] text-[#7C2D12] leading-relaxed">
                    Pedí que te avisemos en cuanto ingrese mercadería para no quedarte sin tu producto.
                  </p>
                  <motion.button
                    id="modal-btn-stock-alert"
                    onClick={() => onOpenStockAlert?.(product, activeVariant)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm font-display text-white bg-[#EA580C] hover:bg-[#C2410C] shadow-md transition-all cursor-pointer"
                  >
                    <Bell className="w-4 h-4 fill-white" />
                    <span>Avisarme cuando haya stock</span>
                  </motion.button>
                </div>
              ) : (
                <motion.button
                  id="modal-btn-add-cart"
                  onClick={handleAdd}
                  disabled={added}
                  whileHover={{ scale: 1.02, transition: { duration: 0.15 } }}
                  whileTap={{ scale: 0.94 }}
                  animate={added ? { scale: [1, 1.05, 0.98, 1] } : { scale: 1 }}
                  transition={added ? { duration: 0.35, ease: 'easeInOut' } : { type: 'spring', stiffness: 450, damping: 18 }}
                  className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm font-display transition-colors cursor-pointer shadow-md ${
                    added ? 'bg-[#256B5C] text-white' : 'bg-[#EFA332] hover:bg-[#E39420] text-[#1E170E]'
                  }`}
                >
                  <AnimatePresence mode="wait">
                    {added ? (
                      <motion.span
                        key="added"
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.7, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                        className="flex items-center gap-2"
                      >
                        <motion.span
                          initial={{ rotate: -45, scale: 0.5 }}
                          animate={{ rotate: 0, scale: 1 }}
                          transition={{ type: 'spring', stiffness: 600, damping: 15 }}
                        >
                          <Check className="w-5 h-5" />
                        </motion.span>
                        <span>¡Agregado al carrito de compras!</span>
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
                          <ShoppingBag className="w-5 h-5" />
                        </motion.span>
                        <span>Comprar en la web (Agregar al Carrito)</span>
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              )}


              <a
                href={waLink(store.whatsapp, whatsappText)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs text-[#25D366] hover:bg-[#E8F8EE] rounded-xl font-bold transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Consultar por WhatsApp con un vendedor</span>
              </a>
            </div>

            {/* Guarantee footer note */}
            <div className="mt-4 pt-3 border-t border-[#EFE8D8] flex items-center justify-between text-[11px] text-[#7A6B5B]">
              <span className="flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-[#EFA332]" />
                Envíos en el día
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#256B5C]" />
                Garantía oficial La Joaquina
              </span>
            </div>

            {products && products.length > 0 && (
              <RelatedProducts
                product={product}
                products={products}
                onAddToCart={onAddToCart}
                onOpenDetails={(p) => (onOpenDetails ? onOpenDetails(p) : undefined)}
              />
            )}

            <ProductReviews product={product} customerName={customerName} />

          </div>

        </div>

      </div>

    </div>
  );
};
