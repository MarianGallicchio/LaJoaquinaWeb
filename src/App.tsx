import React, { useState, useEffect, useMemo } from 'react';
import { 
  Header 
} from './components/Header';
import { 
  Hero 
} from './components/Hero';
import { 
  ProductCard 
} from './components/ProductCard';
import { 
  ProductModal 
} from './components/ProductModal';
import { 
  CartDrawer 
} from './components/CartDrawer';
import { 
  CheckoutModal 
} from './components/CheckoutModal';
import { 
  ChatAssistant 
} from './components/ChatAssistant';
import { 
  FoodCalculator 
} from './components/FoodCalculator';
import { 
  TestimonialsSection 
} from './components/TestimonialsSection';
import { 
  ContactSection 
} from './components/ContactSection';
import { 
  Footer 
} from './components/Footer';
import { 
  AdminCatalog 
} from './components/AdminCatalog';
import { 
  AuthModal 
} from './components/AuthModal';
import {
  StockAlertModal
} from './components/StockAlertModal';
import { PRODUCTS } from './data/products';

import { Product, ProductVariant, CartItem, ProductCategory, OrderDetails } from './types';
import { AuthUserProfile, fetchCloudProducts, saveCloudProduct, cloudLogout } from './lib/cloudDb';
import { 
  Filter, 
  ArrowUpDown, 
  ExternalLink, 
  CheckCircle,
  ShieldCheck
} from 'lucide-react';

export default function App() {
  const [activeCategory, setActiveCategory] = useState<ProductCategory>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('todas');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'rating'>('featured');
  
  // Custom or editable catalog persisted in localStorage & Cloud Database
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('la_juaquina_products');
      return saved ? JSON.parse(saved) : PRODUCTS;
    } catch {
      return PRODUCTS;
    }
  });

  // Sync products from Cloud DB on start
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
  }, []);

  const handleUpdateProducts = (newProducts: Product[]) => {
    setProducts(newProducts);
    try {
      localStorage.setItem('la_juaquina_products', JSON.stringify(newProducts));
    } catch (e) {
      console.warn('Could not save products to localStorage', e);
    }
  };


  // Dedicated Admin Route View (via URL #admin or state)
  const [isAdminView, setIsAdminView] = useState(() => window.location.hash === '#admin');

  useEffect(() => {
    const handleHash = () => {
      setIsAdminView(window.location.hash === '#admin');
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const openAdminView = () => {
    window.location.hash = '#admin';
    setIsAdminView(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeAdminView = () => {
    window.location.hash = '';
    setIsAdminView(false);
  };

  // Supabase Auth & User Session
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


  // Cart state persisted to localStorage
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
  const [checkoutShippingMethod, setCheckoutShippingMethod] = useState<'pickup' | 'express_amba' | 'correo_argentino'>('pickup');
  const [checkoutDiscountCode, setCheckoutDiscountCode] = useState('');
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const [stockAlertTarget, setStockAlertTarget] = useState<{ product: Product; variant: ProductVariant } | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleOpenStockAlert = (product: Product, variant: ProductVariant) => {
    setStockAlertTarget({ product, variant });
  };


  // Save cart to localStorage
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

  // Cart operations
  const handleAddToCart = (product: Product, variant: ProductVariant, quantity: number = 1) => {
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
      prev.filter(
        (item) => !(item.product.id === productId && item.selectedVariant.weight === variantWeight)
      )
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

  const handleOrderCompleted = (order: OrderDetails) => {
    handleClearCart();
    showToast(`¡Pedido ${order.orderId} confirmado!`);
  };

  // Unique brands list for filter
  const brands = useMemo(() => {
    const list = Array.from(new Set(products.map((p) => p.brand)));
    return ['todas', ...list];
  }, [products]);

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    let list = [...products];

    // Category filter
    if (activeCategory !== 'todos') {
      list = list.filter((p) => p.category === activeCategory);
    }

    // Brand filter
    if (selectedBrand !== 'todas') {
      list = list.filter((p) => p.brand === selectedBrand);
    }

    // Search query
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

    // Sorting
    if (sortBy === 'price-asc') {
      list.sort((a, b) => a.variants[0].price - b.variants[0].price);
    } else if (sortBy === 'price-desc') {
      list.sort((a, b) => b.variants[0].price - a.variants[0].price);
    } else if (sortBy === 'rating') {
      list.sort((a, b) => b.rating - a.rating);
    }

    return list;
  }, [products, activeCategory, selectedBrand, searchQuery, sortBy]);

  const totalCartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // If URL has #admin or admin view is active, display the full admin catalog page
  if (isAdminView) {
    return (
      <>
        <AdminCatalog
          products={products}
          onUpdateProducts={handleUpdateProducts}
          onExitAdmin={closeAdminView}
          currentUser={currentUser}
          onOpenAuth={() => setIsAuthOpen(true)}
          onLoginSuccess={handleLoginSuccess}
        />
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          currentUser={currentUser}
          onLoginSuccess={handleLoginSuccess}
          onLogout={handleLogout}
          onOpenAdminPanel={openAdminView}
        />
      </>
    );
  }


  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#2B231D] selection:bg-[#EFA332]/30 selection:text-[#1B4E43]">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-[#1B4E43] text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl border border-[#256B5C] flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <CheckCircle className="w-4 h-4 text-[#EFA332]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <Header
        activeCategory={activeCategory}
        onSelectCategory={(cat) => {
          setActiveCategory(cat);
          const element = document.getElementById('catalogo');
          element?.scrollIntoView({ behavior: 'smooth' });
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        cartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenChat={() => setIsChatOpen(true)}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenAdmin={openAdminView}
      />

      {/* Hero Banner */}
      <Hero 
        onSelectCategory={(cat) => {
          setActiveCategory(cat);
          const element = document.getElementById('catalogo');
          element?.scrollIntoView({ behavior: 'smooth' });
        }} 
      />

      {/* Main Catalog Section */}
      <main id="catalogo" className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        
        {/* Section Heading & Mercado Libre Link */}
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
          </div>

          <div className="flex items-center gap-2">
            {/* Direct Admin Access Link */}
            <button
              onClick={openAdminView}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6A5949] hover:text-[#1B4E43] bg-[#FAF5EC] hover:bg-[#F2ECE0] border border-[#E3D6BE] px-3 py-2 rounded-2xl transition-colors cursor-pointer"
              title="Ir al panel de administración"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#EFA332]" />
              <span>Modificar Catálogo</span>
            </button>

            {/* Mercado Libre Guarantee Pill */}
            <a
              href="https://listado.mercadolibre.com.ar/la-juaquina"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-bold text-[#2D3277] bg-[#FFF159]/80 hover:bg-[#FFF159] border border-[#E5DA4F] px-3.5 py-2 rounded-2xl transition-all shadow-2xs self-start md:self-auto"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="7" width="18" height="13" rx="2" />
                <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
              <span>Tienda oficial en Mercado Libre</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Filter & Sort Controls */}
        <div className="bg-[#FFFDF9] p-3.5 sm:p-4 rounded-2xl border border-[#E5D7BF] shadow-xs mb-8 flex flex-wrap items-center justify-between gap-3">
          
          {/* Brand Filter */}
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

          {/* Search indicator if searching */}
          {searchQuery && (
            <div className="text-xs text-[#1B4E43] font-semibold bg-[#E8F3EF] px-3 py-1 rounded-full flex items-center gap-2">
              <span>Buscando: "{searchQuery}"</span>
              <button
                onClick={() => setSearchQuery('')}
                className="text-[#DE5D4E] hover:underline font-bold cursor-pointer"
              >
                ✕ Limpiar
              </button>
            </div>
          )}

          {/* Sort selector */}
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

        {/* Product Grid or Empty State */}
        {filteredProducts.length > 0 ? (
          <div 
            key={`${activeCategory}-${selectedBrand}-${searchQuery}-${sortBy}`}
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
            <h3 className="font-bold text-lg text-[#1B4E43]">
              No encontramos productos con ese criterio
            </h3>
            <p className="text-xs text-[#7A6A59] mt-1.5">
              Intentá buscando otra palabra clave o limpiá los filtros activos para ver todo el catálogo.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedBrand('todas');
                setActiveCategory('todos');
              }}
              className="mt-5 bg-[#EFA332] text-[#1E170E] font-bold text-xs px-5 py-2.5 rounded-full font-display cursor-pointer"
            >
              Restablecer Filtros
            </button>
          </div>
        )}

      </main>

      {/* Testimonials Section (Replacing Adoption) */}
      <TestimonialsSection />

      {/* Feeding Calculator Section */}
      <FoodCalculator
        products={products}
        onSelectProduct={(product) => setModalProduct(product)}
      />

      {/* Contact, Location & FAQ Section */}
      <ContactSection />

      {/* Footer */}
      <Footer
        onSelectCategory={(cat) => {
          setActiveCategory(cat);
          const element = document.getElementById('catalogo');
          element?.scrollIntoView({ behavior: 'smooth' });
        }}
        onOpenAdmin={openAdminView}
      />

      {/* Modals & Drawers */}
      <ProductModal
        product={modalProduct}
        onClose={() => setModalProduct(null)}
        onAddToCart={handleAddToCart}
        onOpenStockAlert={handleOpenStockAlert}
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
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cartItems}
        shippingMethod={checkoutShippingMethod}
        discountCode={checkoutDiscountCode}
        onOrderCompleted={handleOrderCompleted}
        onBackToCart={() => {
          setIsCheckoutOpen(false);
          setIsCartOpen(true);
        }}
      />

      <ChatAssistant
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(!isChatOpen)}
        onClose={() => setIsChatOpen(false)}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={currentUser}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
        onOpenAdminPanel={openAdminView}
      />

    </div>
  );
}
