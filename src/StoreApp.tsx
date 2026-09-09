// ENTRADA 1 — TIENDA (index.html -> src/main.tsx -> StoreApp)
// Tienda pública de La Joaquina. El panel admin vive en otra entrada: admin.html -> AdminApp.
import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { ProductCard } from './components/ProductCard';
import { ProductModal } from './components/ProductModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { HelpAssistant } from './components/HelpAssistant';
import { CuteBackground, PetMarquee } from './components/CuteBackground';
import { FoodCalculator } from './components/FoodCalculator';
import { TestimonialsSection } from './components/TestimonialsSection';
import { ContactSection } from './components/ContactSection';
import { Footer } from './components/Footer';
import { AuthModal } from './components/AuthModal';
import { StockAlertModal } from './components/StockAlertModal';
import { PRODUCTS } from './data/products';
import { Product, ProductVariant, CartItem, ProductCategory, OrderDetails, StoreSettings } from './types';
import { AuthUserProfile, fetchCloudProducts, saveCloudProduct, cloudLogout, decrementStockForOrder } from './lib/cloudDb';
import { DEFAULT_SETTINGS, fetchStoreSettings, formatARS } from './lib/storeSettings';
import { Filter, ArrowUpDown, CheckCircle, Truck } from 'lucide-react';

export default function StoreApp() {
  const [activeCategory, setActiveCategory] = useState<ProductCategory>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('todas');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'rating'>('featured');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [onlyOffers, setOnlyOffers] = useState(false);

  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('la_juaquina_products');
      return saved ? JSON.parse(saved) : PRODUCTS;
    } catch {
      return PRODUCTS;
    }
  });

  // Config del comercio (costos de envío, cupones, WhatsApp): la edita el admin, la usa la tienda
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    fetchCloudProducts().then((cloudProds) => {
      if (cloudProds && cloudProds.length > 0) {
        setProducts(cloudProds);
        try {
          localStorage.setItem('la_juaquina_products', JSON.stringify(cloudProds));
        } catch (e) {
          console.warn('Could not save to localStorage', e);
        }
      }
    });
    fetchStoreSettings().then((s) => setSettings(s));
    // Vuelta desde Mercado Pago: avisar el resultado del pago
    try {
      const params = new URLSearchParams(window.location.search);
      const pago = params.get('pago');
      const pedido = params.get('pedido');
      if (pago && pedido) {
        if (pago === 'exito') showToast(`¡Pago acreditado! Pedido ${pedido} confirmado. 🎉`);
        else if (pago === 'pendiente') showToast(`Pedido ${pedido}: el pago está pendiente de acreditación.`);
        else showToast(`Pedido ${pedido}: el pago no se completó. Podés reintentarlo por WhatsApp.`);
        params.delete('pago');
        params.delete('pedido');
        const clean = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
        window.history.replaceState(null, '', clean);
      }
    } catch { /* ignore */ }
  }, []);

  const [currentUser, setCurrentUser] = useState<AuthUserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('la_juaquina_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const handleLoginSuccess = (user: AuthUserProfile) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('la_juaquina_user', JSON.stringify(user));
    } catch (e) {
      console.warn(e);
    }
    showToast(`¡Bienvenido, ${user.name || user.email}!`);
  };

  const handleLogout = async () => {
    await cloudLogout();
    setCurrentUser(null);
    try {
      localStorage.removeItem('la_juaquina_user');
    } catch (e) {
      console.warn(e);
    }
    showToast('Sesión cerrada.');
  };

  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('la_juaquina_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutShippingMethod, setCheckoutShippingMethod] = useState<'pickup' | 'express_amba' | 'correo_argentino'>('express_amba');
  const [checkoutDiscountCode, setCheckoutDiscountCode] = useState('');
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const [stockAlertTarget, setStockAlertTarget] = useState<{ product: Product; variant: ProductVariant } | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleOpenStockAlert = (product: Product, variant: ProductVariant) => {
    setStockAlertTarget({ product, variant });
  };

  useEffect(() => {
    try {
      localStorage.setItem('la_juaquina_cart', JSON.stringify(cartItems));
    } catch (e) {
      console.warn('Could not save cart to localStorage', e);
    }
  }, [cartItems]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const handleAddToCart = (product: Product, variant: ProductVariant, quantity: number = 1) => {
    // Validar stock disponible (si la variante tiene control de unidades)
    if (typeof variant.stock === 'number') {
      const inCart = cartItems
        .filter((i) => i.product.id === product.id && i.selectedVariant.weight === variant.weight)
        .reduce((s, i) => s + i.quantity, 0);
      if (inCart + quantity > variant.stock) {
        showToast(`Solo quedan ${variant.stock} u. de ${product.name} (${variant.weight})`);
        return;
      }
    }
    setCartItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.product.id === product.id && item.selectedVariant.weight === variant.weight
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += quantity;
        return updated;
      } else {
        return [...prev, { product, selectedVariant: variant, quantity }];
      }
    });
    showToast(`¡Agregaste ${product.name} (${variant.weight})!`);
  };

  const handleUpdateQuantity = (productId: string, variantWeight: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId && item.selectedVariant.weight === variantWeight) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveItem = (productId: string, variantWeight: string) => {
    setCartItems((prev) =>
      prev.filter((item) => !(item.product.id === productId && item.selectedVariant.weight === variantWeight))
    );
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const handleProceedToCheckout = (
    shippingMethod: 'pickup' | 'express_amba' | 'correo_argentino',
    discountCode: string
  ) => {
    setCheckoutShippingMethod(shippingMethod);
    setCheckoutDiscountCode(discountCode);
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  // Al confirmar la compra: vaciar carrito + descontar stock (se refleja en el admin)
  const handleOrderCompleted = async (order: OrderDetails) => {
    handleClearCart();
    try {
      const updated = await decrementStockForOrder(order, products);
      setProducts(updated);
    } catch (e) {
      console.warn('No se pudo descontar stock', e);
    }
    if (order.status === 'pago_pendiente') {
      showToast(`¡Pedido ${order.orderId} creado! Completá el pago en Mercado Pago.`);
    } else {
      showToast(`¡Pedido ${order.orderId} confirmado!`);
    }
  };

  const brands = useMemo(() => {
    const list = Array.from(new Set(products.map((p) => p.brand)));
    return ['todas', ...list];
  }, [products]);

  const filteredProducts = useMemo(() => {
    let list = [...products];
    if (activeCategory !== 'todos') {
      list = list.filter((p) => p.category === activeCategory);
    }
    if (selectedBrand !== 'todas') {
      list = list.filter((p) => p.brand === selectedBrand);
    }
    if (onlyInStock) {
      list = list.filter((p) => p.variants.some((v) => v.inStock !== false));
    }
    if (onlyOffers) {
      list = list.filter((p) => p.variants.some((v) => v.originalPrice && v.originalPrice > v.price));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          (p.subCategory && p.subCategory.toLowerCase().includes(q))
      );
    }
    if (sortBy === 'price-asc') {
      list.sort((a, b) => a.variants[0].price - b.variants[0].price);
    } else if (sortBy === 'price-desc') {
      list.sort((a, b) => b.variants[0].price - a.variants[0].price);
    } else if (sortBy === 'rating') {
      list.sort((a, b) => b.rating - a.rating);
    }
    return list;
  }, [products, activeCategory, selectedBrand, searchQuery, sortBy, onlyInStock, onlyOffers]);

  const totalCartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cartItems.reduce((s, i) => s + i.selectedVariant.price * i.quantity, 0);

  const scrollToCatalog = () => {
    const element = document.getElementById('catalogo');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-decor text-[#2B231D] selection:bg-[#EFA332]/30 selection:text-[#1B4E43] relative">
      <CuteBackground />
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-[#1B4E43] text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl border border-[#256B5C] flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <CheckCircle className="w-4 h-4 text-[#EFA332]" />
          <span>{toastMessage}</span>
        </div>
      )}

      <Header
        activeCategory={activeCategory}
        onSelectCategory={(cat) => {
          setActiveCategory(cat);
          scrollToCatalog();
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        cartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenAdmin={() => {
          window.location.href = './admin.html';
        }}
      />

      {/* Barra promo configurable desde el admin */}
      <div className="bg-[#1B4E43] text-[#FFE9B8] text-[11px] sm:text-xs font-semibold text-center px-4 py-2 flex items-center justify-center gap-2">
        <Truck className="w-3.5 h-3.5 text-[#EFA332] shrink-0" />
        {settings.announcement ? (
          <span>{settings.announcement}</span>
        ) : (
          <span>
            Cupón <strong className="text-white">{settings.couponCode}</strong> = {settings.couponPercent}% OFF
            <span className="mx-1.5 opacity-40">·</span>
            Transferencia = {settings.transferPercent}% OFF extra
            <span className="mx-1.5 opacity-40 hidden sm:inline">·</span>
            <span className="hidden sm:inline">Tienda online · Envíos desde Bella Vista a todo el país</span>
          </span>
        )}
      </div>

      <Hero
        onSelectCategory={(cat) => {
          setActiveCategory(cat);
          scrollToCatalog();
        }}
      />

      <main id="catalogo" className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-4 border-b border-[#E8DFC9] gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1B4E43] mb-1">
              <span className="w-2 h-2 rounded-full bg-[#EFA332]" />
              <span>Nuestras Variedades Disponibles</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1B4E43] font-display">
              {activeCategory === 'todos' && 'Catálogo Completo de Alimentos & Piedras'}
              {activeCategory === 'perros' && 'Alimentos y Cuidados para Perros 🐶'}
              {activeCategory === 'gatos' && 'Alimentos y Nutrición para Gatos 🐱'}
              {activeCategory === 'piedras' && 'Piedras Sanitarias y Control de Olor 🧼'}
              {activeCategory === 'accesorios' && 'Camas, Arnés y Accesorios 🎾'}
            </h2>
            <p className="text-xs text-[#7A6A59] mt-1">
              {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''} · Precios en ARS · Stock actualizado
            </p>
          </div>
        </div>

        <div className="bg-[#FFFDF9] p-3.5 sm:p-4 rounded-2xl border border-[#E5D7BF] shadow-xs mb-8 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#7A6A59]" />
            <span className="text-xs font-bold text-[#7A6A59]">Marca:</span>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="text-xs bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl px-2.5 py-1.5 font-semibold text-[#2B231D] focus:outline-none focus:ring-1 focus:ring-[#1B4E43] cursor-pointer"
            >
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b === 'todas' ? 'Todas las marcas' : b}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-1.5 text-xs font-bold text-[#5A4D3F] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyInStock}
              onChange={(e) => setOnlyInStock(e.target.checked)}
              className="rounded accent-[#1B4E43] w-3.5 h-3.5 cursor-pointer"
            />
            Solo con stock
          </label>

          <label className="flex items-center gap-1.5 text-xs font-bold text-[#5A4D3F] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyOffers}
              onChange={(e) => setOnlyOffers(e.target.checked)}
              className="rounded accent-[#DE5D4E] w-3.5 h-3.5 cursor-pointer"
            />
            🏷️ Solo ofertas
          </label>

          {searchQuery && (
            <div className="text-xs text-[#1B4E43] font-semibold bg-[#E8F3EF] px-3 py-1 rounded-full flex items-center gap-2">
              <span>Buscando: "{searchQuery}"</span>
              <button onClick={() => setSearchQuery('')} className="text-[#DE5D4E] hover:underline font-bold cursor-pointer">
                ✕ Limpiar
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <ArrowUpDown className="w-4 h-4 text-[#7A6A59]" />
            <span className="text-xs font-bold text-[#7A6A59]">Ordenar por:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl px-2.5 py-1.5 font-semibold text-[#2B231D] focus:outline-none focus:ring-1 focus:ring-[#1B4E43] cursor-pointer"
            >
              <option value="featured">Destacados</option>
              <option value="price-asc">Menor precio</option>
              <option value="price-desc">Mayor precio</option>
              <option value="rating">Mejor valorados</option>
            </select>
          </div>
        </div>

        {/* Pills de categoría (móvil): acceso rápido sin abrir el menú */}
        <div className="md:hidden flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-5 -mx-4 px-4">
          {(
            [
              { id: 'todos', label: 'Todo 📦' },
              { id: 'perros', label: 'Perros 🐶' },
              { id: 'gatos', label: 'Gatos 🐱' },
              { id: 'piedras', label: 'Piedras 🧼' },
              { id: 'accesorios', label: 'Accesorios 🎾' },
            ] as { id: ProductCategory; label: string }[]
          ).map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`shrink-0 text-xs font-bold px-3.5 py-2 rounded-full border cursor-pointer transition-colors ${
                activeCategory === c.id
                  ? 'bg-[#1B4E43] text-white border-[#1B4E43]'
                  : 'bg-[#FFFDF9] text-[#5A4D3F] border-[#E3D6BE]'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {filteredProducts.length > 0 ? (
          <div
            key={`${activeCategory}-${selectedBrand}-${searchQuery}-${sortBy}-${onlyInStock}-${onlyOffers}`}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {filteredProducts.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                index={index}
                onAddToCart={handleAddToCart}
                onOpenDetails={(p) => setModalProduct(p)}
                onOpenStockAlert={handleOpenStockAlert}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-[#FFFDF9] rounded-3xl border border-[#E5D7BF] p-8 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-full bg-[#FAF5EC] text-3xl flex items-center justify-center mx-auto mb-3">
              🔍
            </div>
            <h3 className="font-bold text-lg text-[#1B4E43]">No encontramos productos con ese criterio</h3>
            <p className="text-xs text-[#7A6A59] mt-1.5">
              Intentá buscando otra palabra clave o limpiá los filtros activos para ver todo el catálogo.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedBrand('todas');
                setActiveCategory('todos');
                setOnlyInStock(false);
                setOnlyOffers(false);
              }}
              className="mt-5 bg-[#EFA332] text-[#1E170E] font-bold text-xs px-5 py-2.5 rounded-full font-display cursor-pointer"
            >
              Restablecer Filtros
            </button>
          </div>
        )}
      </main>

      <PetMarquee />
      <TestimonialsSection settings={settings} />
      <FoodCalculator products={products} onSelectProduct={(product) => setModalProduct(product)} />
      <ContactSection settings={settings} />
      <Footer
        settings={settings}
        onSelectCategory={(cat) => {
          setActiveCategory(cat);
          scrollToCatalog();
        }}
        onOpenAdmin={() => {
          window.location.href = './admin.html';
        }}
      />

      <ProductModal
        product={modalProduct}
        onClose={() => setModalProduct(null)}
        onAddToCart={handleAddToCart}
        onOpenStockAlert={handleOpenStockAlert}
        settings={settings}
      />

      <StockAlertModal
        isOpen={!!stockAlertTarget}
        onClose={() => setStockAlertTarget(null)}
        product={stockAlertTarget?.product || null}
        variant={stockAlertTarget?.variant || null}
        onAlertSaved={() => showToast('¡Alerta registrada! Te avisaremos cuando haya stock.')}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        onProceedToCheckout={handleProceedToCheckout}
        settings={settings}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cartItems}
        shippingMethod={checkoutShippingMethod}
        discountCode={checkoutDiscountCode}
        onOrderCompleted={handleOrderCompleted}
        settings={settings}
        onBackToCart={() => {
          setIsCheckoutOpen(false);
          setIsCartOpen(true);
        }}
      />

      <HelpAssistant
        isOpen={isHelpOpen}
        onToggle={() => setIsHelpOpen(!isHelpOpen)}
        onClose={() => setIsHelpOpen(false)}
        settings={settings}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={currentUser}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
        onOpenAdminPanel={() => {
          window.location.href = './admin.html';
        }}
      />
    </div>
  );
}
