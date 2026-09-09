import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  ArrowLeft, 
  Save, 
  X, 
  Search, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle,
  Package,
  ShieldCheck,
  Sparkles,
  Cloud,
  ShoppingBag,
  Clock,
  Phone,
  MapPin,
  RefreshCw,
  KeyRound,
  Bell,
  MessageSquare,
  Check,
  Mail,
  Upload,
  ImagePlus,
  LayoutGrid,
  Link2
} from 'lucide-react';
import { Product, ProductVariant, ProductCategory, OrderDetails, StockAlert } from '../types';
import { PRODUCTS as DEFAULT_PRODUCTS } from '../data/products';
import { 
  AuthUserProfile, 
  saveCloudProduct, 
  deleteCloudProduct, 
  resetCloudProducts, 
  fetchCloudOrders,
  checkCloudDbStatus,
  cloudLogin,
  fetchCloudStockAlerts,
  updateCloudStockAlertStatus,
  deleteCloudStockAlert
} from '../lib/cloudDb';


interface AdminCatalogProps {
  products: Product[];
  onUpdateProducts: (newProducts: Product[]) => void;
  onExitAdmin: () => void;
  currentUser: AuthUserProfile | null;
  onOpenAuth: () => void;
  onLoginSuccess?: (user: AuthUserProfile) => void;
}

// Galería rápida de imágenes para productos (tocá para usar)
const IMAGE_PRESETS = [
  'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1591769225440-811ad7d6eab2?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1545249390-6bdfa286032f?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=600&auto=format&fit=crop&q=80',
];

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=600&auto=format&fit=crop&q=80';

export const AdminCatalog: React.FC<AdminCatalogProps> = ({
  products,
  onUpdateProducts,
  onExitAdmin,
  currentUser,
  onOpenAuth,
  onLoginSuccess,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>('todos');
  const [adminSort, setAdminSort] = useState<'recientes' | 'nombre' | 'precio-min' | 'precio-max' | 'stock-bajo'>('recientes');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  
  // Cloud Orders modal
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [cloudOrders, setCloudOrders] = useState<OrderDetails[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Cloud Stock Alerts modal (Avisarme cuando haya stock)
  const [showStockAlertsModal, setShowStockAlertsModal] = useState(false);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  // Safe non-blocking deletion and reset modals (iFrame safe)

  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Fast admin gate state
  const [gatePin, setGatePin] = useState('admin123');
  const [gateError, setGateError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    brand: '',
    category: 'perros',
    subCategory: 'Adulto',
    description: '',
    nutritionalInfo: '',
    image: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=600&auto=format&fit=crop&q=80',
    badge: 'Nuevo',
    rating: 5.0,
    reviewsCount: 1,
    mercadolibreQuery: '',
    variants: [{ weight: '15 kg', price: 19500, originalPrice: 22000, inStock: true, stock: 20 }],
  });

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  // Pestaña del selector de imagen + subida con redimensionado
  const [imageTab, setImageTab] = useState<'url' | 'upload' | 'gallery'>('url');
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showFeedback('❌ El archivo debe ser una imagen (JPG, PNG, WebP).');
      return;
    }
    setUploadingImage(true);
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Redimensionar a máx 900px para no saturar la base de datos
        const maxSide = 900;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        setFormData((prev) => ({ ...prev, image: dataUrl }));
        setUploadingImage(false);
        showFeedback(`✅ Imagen cargada (${w}x${h}). Se guarda junto al producto.`);
      };
      img.onerror = () => {
        setUploadingImage(false);
        showFeedback('❌ No se pudo leer la imagen.');
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const loadOrders = async () => {
    setLoadingOrders(true);
    try {
      const orders = await fetchCloudOrders();
      setCloudOrders(orders);
    } catch (e) {
      console.warn('Could not load orders:', e);
    } finally {
      setLoadingOrders(false);
    }
  };

  const loadStockAlerts = async () => {
    setLoadingAlerts(true);
    try {
      const alerts = await fetchCloudStockAlerts();
      setStockAlerts(alerts);
    } catch (e) {
      console.warn('Could not load stock alerts:', e);
    } finally {
      setLoadingAlerts(false);
    }
  };

  useEffect(() => {
    loadStockAlerts();
  }, []);

  const handleOpenOrders = () => {
    setShowOrdersModal(true);
    loadOrders();
  };

  const handleOpenStockAlerts = () => {
    setShowStockAlertsModal(true);
    loadStockAlerts();
  };

  const handleUpdateAlertStatus = async (id: string, status: 'pending' | 'notified' | 'resolved') => {
    await updateCloudStockAlertStatus(id, status);
    setStockAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    showFeedback(`Alerta actualizada a "${status === 'notified' ? 'Cliente Contactado' : status === 'resolved' ? 'Stock Repuesto' : 'Pendiente'}".`);
  };

  const handleDeleteAlert = async (id: string) => {
    await deleteCloudStockAlert(id);
    setStockAlerts((prev) => prev.filter((a) => a.id !== id));
    showFeedback('Alerta de stock eliminada.');
  };

  const pendingAlertsCount = stockAlerts.filter((a) => a.status === 'pending').length;


  const handleStartCreate = () => {
    setFormData({
      id: `prod-${Date.now()}`,
      name: '',
      brand: '',
      category: 'perros',
      subCategory: 'Adulto',
      description: '',
      nutritionalInfo: '',
      image: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=600&auto=format&fit=crop&q=80',
      badge: 'Nuevo',
      rating: 5.0,
      reviewsCount: 1,
      mercadolibreQuery: '',
      variants: [{ weight: '15 kg', price: 19500, originalPrice: 22000, inStock: true, stock: 20 }],
    });
    setIsCreating(true);
    setEditingProduct(null);
    setImageTab('url');
  };

  const handleStartEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData(JSON.parse(JSON.stringify(product)));
    setIsCreating(false);
    setImageTab(product.image?.startsWith('data:') ? 'upload' : 'url');
  };

  const handleDuplicateProduct = async (product: Product) => {
    const copy: Product = {
      ...JSON.parse(JSON.stringify(product)),
      id: `prod-${Date.now()}`,
      name: `${product.name} (copia)`,
    };
    const updated = [copy, ...products];
    onUpdateProducts(updated);
    await saveCloudProduct(copy);
    showFeedback(`✅ Producto duplicado como "${copy.name}". Editá la copia.`);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.brand) return;

    // Normalizar stock: si hay unidades, inStock acompaña (0 = agotado)
    const normVariants = (formData.variants && formData.variants.length > 0
      ? formData.variants
      : [{ weight: '15 kg', price: 15000, inStock: true }]
    ).map((v) => ({
      ...v,
      inStock: typeof v.stock === 'number' ? v.stock > 0 : v.inStock !== false,
    }));

    if (isCreating) {
      const newProduct: Product = {
        id: formData.id || `prod-${Date.now()}`,
        name: formData.name || 'Producto sin nombre',
        brand: formData.brand || 'Marca',
        category: (formData.category as any) || 'perros',
        subCategory: formData.subCategory,
        description: formData.description || '',
        nutritionalInfo: formData.nutritionalInfo,
        image: formData.image || 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=600&auto=format&fit=crop&q=80',
        badge: formData.badge,
        rating: formData.rating || 5.0,
        reviewsCount: formData.reviewsCount || 1,
        variants: normVariants,
        mercadolibreQuery: formData.mercadolibreQuery || `${formData.brand} ${formData.name}`,
      };

      const updated = [newProduct, ...products];
      onUpdateProducts(updated);
      saveCloudProduct(newProduct);
      showFeedback(`¡Producto "${newProduct.name}" guardado en la Base de Datos en la Nube!`);
    } else if (editingProduct) {
      const updatedProduct: Product = { ...editingProduct, ...formData, variants: normVariants } as Product;
      const updated = products.map((p) =>
        p.id === editingProduct.id ? updatedProduct : p
      );
      onUpdateProducts(updated);
      saveCloudProduct(updatedProduct);
      showFeedback(`¡Producto "${formData.name}" actualizado en la Base de Datos en la Nube!`);
    }

    setEditingProduct(null);
    setIsCreating(false);
  };

  const confirmDeleteProduct = async () => {
    if (!itemToDelete) return;
    const { id, name } = itemToDelete;
    const updated = products.filter((p) => p.id !== id);
    onUpdateProducts(updated);
    await deleteCloudProduct(id);
    setItemToDelete(null);
    showFeedback(`Producto "${name}" eliminado de la nube.`);
  };

  const confirmResetCatalog = async () => {
    const defaultList = await resetCloudProducts();
    onUpdateProducts(defaultList);
    setShowResetConfirm(false);
    showFeedback('Catálogo restablecido a valores originales de fábrica en la nube.');
  };

  // Alternar sesión a Admin rápidamente si está bloqueado
  const handleQuickAdminUnlock = async (quick: boolean = true) => {
    setGateError(null);
    try {
      const admin = await cloudLogin('admin@lajuaquina.com', quick ? 'admin123' : gatePin, 'admin');
      if (onLoginSuccess) {
        onLoginSuccess(admin);
      }
      showFeedback('¡Sesión alternada a Administrador con éxito!');
    } catch {
      setGateError('Error al validar credenciales de administrador.');
    }
  };

  // Variants editing helpers
  const handleAddVariant = () => {
    const currentVariants = formData.variants || [];
    setFormData({
      ...formData,
      variants: [...currentVariants, { weight: '10 kg', price: 12000, inStock: true, stock: 20 }],
    });
  };

  const handleUpdateVariant = (index: number, field: keyof ProductVariant, val: any) => {
    const currentVariants = [...(formData.variants || [])];
    currentVariants[index] = { ...currentVariants[index], [field]: val };
    setFormData({ ...formData, variants: currentVariants });
  };

  const handleRemoveVariant = (index: number) => {
    const currentVariants = (formData.variants || []).filter((_, i) => i !== index);
    setFormData({ ...formData, variants: currentVariants });
  };

  // Stock rápido inline (lista): suma/resta unidades y guarda en la nube
  const handleQuickStock = async (productId: string, variantWeight: string, delta: number) => {
    const updated = products.map((p) => {
      if (p.id !== productId) return p;
      return {
        ...p,
        variants: p.variants.map((v) => {
          if (v.weight !== variantWeight) return v;
          const current = typeof v.stock === 'number' ? v.stock : 0;
          const next = Math.max(0, current + delta);
          return { ...v, stock: next, inStock: next > 0 };
        }),
      };
    });
    onUpdateProducts(updated);
    const changed = updated.find((p) => p.id === productId);
    if (changed) {
      saveCloudProduct(changed);
      const v = changed.variants.find((x) => x.weight === variantWeight);
      showFeedback(`📦 Stock de "${changed.name}" (${variantWeight}): ${v?.stock ?? 0} u.`);
    }
  };

  // Filter + sort products for admin search
  const minPrice = (p: Product) => Math.min(...p.variants.map((v) => v.price));
  const totalStock = (p: Product) =>
    p.variants.reduce((s, v) => s + (typeof v.stock === 'number' ? v.stock : 999), 0);

  const filtered = products
    .filter((p) => {
      const matchesCat = selectedCategory === 'todos' || p.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery = !q || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    })
    .sort((a, b) => {
      if (adminSort === 'nombre') return a.name.localeCompare(b.name, 'es');
      if (adminSort === 'precio-min') return minPrice(a) - minPrice(b);
      if (adminSort === 'precio-max') return minPrice(b) - minPrice(a);
      if (adminSort === 'stock-bajo') return totalStock(a) - totalStock(b);
      return 0; // recientes: orden actual del catálogo
    });

  // ================= ADMIN ACCESS GATE (ALTERNADOR) =================
  // If currentUser is not admin, show clear switcher so they can enter in 1 click
  if (currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-4">
        <div className="bg-[#FFFDF9] border border-[#E5D7BF] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center">
          <div className="w-16 h-16 bg-[#FFF8E6] border border-[#EFA332] rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-[#EFA332]" />
          </div>

          <h2 className="text-xl font-bold font-display text-[#1B4E43] mb-1">
            Alternador de Acceso Administrador
          </h2>
          <p className="text-xs text-[#6A5949] mb-6">
            Esta sección permite modificar precios, stock, pesos y ver pedidos de la nube.
          </p>

          {gateError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{gateError}</span>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => handleQuickAdminUnlock(true)}
              className="w-full bg-[#1B4E43] hover:bg-[#256B5C] text-[#FFE194] font-extrabold text-xs py-3.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#EFA332]" />
              <span>⚡ Alternar e Ingresar como Admin (1 Clic)</span>
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-[#E8DFC9]"></div>
              <span className="flex-shrink mx-2 text-[10px] uppercase font-bold text-[#8A7969]">
                O ingresá tu clave
              </span>
              <div className="flex-grow border-t border-[#E8DFC9]"></div>
            </div>

            <div className="relative text-left">
              <KeyRound className="w-4 h-4 text-[#8A7969] absolute left-3 top-3" />
              <input
                type="password"
                value={gatePin}
                onChange={(e) => setGatePin(e.target.value)}
                placeholder="Clave (admin123)"
                className="w-full text-xs pl-9 pr-3 py-2.5 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B4E43]"
              />
            </div>

            <button
              onClick={() => handleQuickAdminUnlock(false)}
              className="w-full bg-[#EFA332] hover:bg-[#E39420] text-[#1E170E] font-bold text-xs py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              Validar y Entrar
            </button>

            <button
              onClick={onExitAdmin}
              className="w-full text-xs text-[#7A6A59] hover:text-[#1B4E43] font-bold py-2 transition-colors cursor-pointer"
            >
              ← Volver a la Tienda (Modo Cliente)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#2B231D] flex flex-col">
      
      {/* Top Admin Header */}
      <header className="bg-[#1B4E43] text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            {/* Alternar a Tienda button */}
            <button
              onClick={onExitAdmin}
              className="inline-flex items-center gap-1.5 bg-[#FFE194] hover:bg-[#FFD66B] text-[#1E170E] text-xs font-extrabold px-3 py-1.5 rounded-xl transition-all shadow-xs cursor-pointer"
              title="Alternar a vista de cliente en la tienda"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>🛍️ Alternar a Tienda</span>
            </button>

            <div className="h-5 w-px bg-white/20 hidden sm:block" />

            <div className="flex items-center gap-2">
              <span className="text-xl">🐾</span>
              <div>
                <h1 className="text-base font-bold font-display leading-tight flex items-center gap-2">
                  <span>Panel de Administración</span>
                  <span className="text-[10px] bg-[#EFA332] text-[#1E170E] font-extrabold px-2 py-0.5 rounded-full uppercase">
                    Admin Nube
                  </span>
                </h1>
                <p className="text-[11px] text-[#D3E5DE]">
                  La Juaquina Pet Shop · Base de datos en la nube activa
                </p>
              </div>
            </div>
          </div>

          {/* User & Actions */}
          <div className="flex items-center gap-2.5">
            {/* Alertas de Stock */}
            <button
              id="admin-btn-stock-alerts"
              onClick={handleOpenStockAlerts}
              className="relative inline-flex items-center gap-1.5 bg-[#DE5D4E]/25 hover:bg-[#DE5D4E]/40 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors cursor-pointer border border-[#DE5D4E]/40"
              title="Ver solicitudes de aviso por productos agotados"
            >
              <Bell className="w-3.5 h-3.5 text-[#FCA5A5]" />
              <span className="hidden sm:inline">Alertas de Stock</span>
              <span className="sm:hidden">Alertas</span>
              {pendingAlertsCount > 0 && (
                <span className="bg-[#EF4444] text-white text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none animate-pulse">
                  {pendingAlertsCount}
                </span>
              )}
            </button>

            {/* Ver Pedidos en la Nube */}
            <button
              onClick={handleOpenOrders}
              className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
              title="Ver pedidos registrados en la nube"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-[#FFE194]" />
              <span className="hidden sm:inline">📦 Pedidos Nube</span>
            </button>


            <button
              onClick={handleStartCreate}
              className="inline-flex items-center gap-1.5 bg-gradient-to-b from-[#F5B44A] to-[#E39420] text-[#1E170E] font-extrabold text-xs px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer btn-gloss"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Producto</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        
        {/* Feedback Alert */}
        {feedbackMsg && (
          <div className="mb-5 p-3.5 rounded-2xl bg-[#E8F3EF] border border-[#256B5C]/30 text-[#1B4E43] font-bold text-xs flex items-center gap-2 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-[#256B5C] shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Cloud Status & Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-[#FFFDF9] p-4 rounded-2xl border border-[#E5D7BF] shadow-xs">
            <span className="text-[11px] font-bold text-[#7A6A59] block uppercase">Total Catálogo</span>
            <strong className="text-2xl font-extrabold text-[#1B4E43] font-display">{products.length}</strong>
          </div>
          <div className="bg-[#FFFDF9] p-4 rounded-2xl border border-[#E5D7BF] shadow-xs">
            <span className="text-[11px] font-bold text-[#7A6A59] block uppercase">🐶 Perros</span>
            <strong className="text-2xl font-extrabold text-[#1B4E43] font-display">
              {products.filter((p) => p.category === 'perros').length}
            </strong>
          </div>
          <div className="bg-[#FFFDF9] p-4 rounded-2xl border border-[#E5D7BF] shadow-xs">
            <span className="text-[11px] font-bold text-[#7A6A59] block uppercase">🐱 Gatos</span>
            <strong className="text-2xl font-extrabold text-[#1B4E43] font-display">
              {products.filter((p) => p.category === 'gatos').length}
            </strong>
          </div>
          <div className="bg-[#FFFDF9] p-4 rounded-2xl border border-[#E5D7BF] shadow-xs">
            <span className="text-[11px] font-bold text-[#7A6A59] block uppercase">🧼 Piedras & Otros</span>
            <strong className="text-2xl font-extrabold text-[#1B4E43] font-display">
              {products.filter((p) => p.category === 'piedras' || p.category === 'accesorios').length}
            </strong>
          </div>
        </div>

        {/* Controls Bar: Search & Category Filter */}
        <div className="bg-[#FFFDF9] p-4 rounded-2xl border border-[#E5D7BF] shadow-xs mb-6 flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex-1 min-w-[240px] relative">
            <Search className="w-4 h-4 text-[#8A7969] absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar en el catálogo (nombre o marca)..."
              className="w-full text-xs pl-9 pr-3 py-2 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B4E43]"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#7A6A59]">Categoría:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="text-xs bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl px-3 py-2 font-semibold text-[#2B231D] focus:outline-none focus:ring-1 focus:ring-[#1B4E43]"
            >
              <option value="todos">Todas las categorías</option>
              <option value="perros">Perros</option>
              <option value="gatos">Gatos</option>
              <option value="piedras">Piedras Sanitarias</option>
              <option value="accesorios">Accesorios</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#7A6A59]">Orden:</span>
            <select
              value={adminSort}
              onChange={(e) => setAdminSort(e.target.value as any)}
              className="text-xs bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl px-3 py-2 font-semibold text-[#2B231D] focus:outline-none focus:ring-1 focus:ring-[#1B4E43] cursor-pointer"
            >
              <option value="recientes">Recientes</option>
              <option value="nombre">Nombre A-Z</option>
              <option value="precio-min">Menor precio</option>
              <option value="precio-max">Mayor precio</option>
              <option value="stock-bajo">⚠️ Stock bajo primero</option>
            </select>
          </div>

          <span className="text-[11px] font-bold text-[#1B4E43] bg-[#E8F3EF] px-2.5 py-1.5 rounded-xl">
            {filtered.length}/{products.length}
          </span>

          <button
            onClick={() => setShowResetConfirm(true)}
            className="inline-flex items-center gap-1.5 text-xs text-[#8A7969] hover:text-[#DE5D4E] font-bold px-3 py-2 rounded-xl hover:bg-[#FAF5EC] transition-colors cursor-pointer"
            title="Volver a los productos originales de prueba"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer Originales</span>
          </button>

        </div>

        {/* Product List Table (desktop) + Cards (móvil) */}
        <div className="hidden md:block bg-[#FFFDF9] border border-[#E5D7BF] rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAF5EC] border-b border-[#E8DFC9] text-[#7A6A59] font-bold uppercase tracking-wider">
                  <th className="p-3.5">Producto</th>
                  <th className="p-3.5">Marca / Cat.</th>
                  <th className="p-3.5">Presentaciones & Precios</th>
                  <th className="p-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE8D8]">
                {filtered.map((product) => (
                  <tr key={product.id} className="hover:bg-[#FAF5EC]/60 transition-colors">
                    
                    {/* Image & Title */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-12 h-12 rounded-xl object-cover bg-[#F0EAE0] shrink-0"
                          onError={(e) => {
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=600&auto=format&fit=crop&q=80';
                          }}
                        />
                        <div>
                          <strong className="font-bold text-[#1B4E43] block text-xs">
                            {product.name}
                          </strong>
                          {product.badge && (
                            <span className="inline-block text-[10px] font-bold text-[#EFA332] bg-[#FFF8E6] px-2 py-0.5 rounded-md mt-0.5">
                              {product.badge}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Brand & Category */}
                    <td className="p-3.5">
                      <span className="font-bold text-[#3D3025] block">{product.brand}</span>
                      <span className="text-[11px] text-[#7A6A59] capitalize">
                        {product.category} {product.subCategory ? `· ${product.subCategory}` : ''}
                      </span>
                    </td>

                    {/* Variants con stock rápido */}
                    <td className="p-3.5">
                      <div className="space-y-1.5 min-w-[230px]">
                        {product.variants.map((v, i) => (
                          <div
                            key={i}
                            className={`flex items-center gap-1.5 border rounded-lg px-2 py-1 ${
                              v.inStock === false ? 'bg-red-50/60 border-red-200' : 'bg-[#FAF5EC] border-[#EFE8D8]'
                            }`}
                          >
                            <span className="text-[11px] font-bold text-[#3D3025] flex-1 truncate" title={`${v.weight} · $${v.price.toLocaleString('es-AR')}`}>
                              {v.weight} · ${v.price.toLocaleString('es-AR')}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleQuickStock(product.id, v.weight, -1)}
                                className="w-5 h-5 rounded-md bg-white border border-[#E3D6BE] text-xs font-black text-[#8C5800] hover:bg-[#FFECC2] cursor-pointer leading-none"
                                title="Quitar 1 unidad"
                              >
                                −
                              </button>
                              <span
                                className={`text-[11px] font-black min-w-[32px] text-center ${
                                  v.inStock === false
                                    ? 'text-red-600'
                                    : typeof v.stock === 'number' && v.stock <= 5
                                    ? 'text-[#8C5800]'
                                    : 'text-[#1B4E43]'
                                }`}
                                title={typeof v.stock === 'number' ? `${v.stock} unidades en stock` : 'Sin control de unidades'}
                              >
                                {typeof v.stock === 'number' ? `${v.stock}u` : '∞'}
                              </span>
                              <button
                                onClick={() => handleQuickStock(product.id, v.weight, 1)}
                                className="w-5 h-5 rounded-md bg-[#1B4E43] text-white text-xs font-black hover:bg-[#256B5C] cursor-pointer leading-none"
                                title="Agregar 1 unidad"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleStartEdit(product)}
                          className="p-1.5 rounded-lg bg-[#FAF5EC] hover:bg-[#EFE8D8] text-[#1B4E43] transition-colors cursor-pointer"
                          title="Editar producto"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDuplicateProduct(product)}
                          className="p-1.5 rounded-lg bg-[#E8F3EF] hover:bg-[#D8EAE3] text-[#1B4E43] transition-colors cursor-pointer"
                          title="Duplicar producto (crear copia editable)"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setItemToDelete({ id: product.id, name: product.name })}
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
                          title="Eliminar producto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Product Cards (móvil): misma gestión sin tabla */}
        <div className="md:hidden space-y-3">
          {filtered.map((product) => (
            <div key={product.id} className="bg-[#FFFDF9] border border-[#E5D7BF] rounded-2xl p-3.5 shadow-xs">
              <div className="flex items-center gap-3">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-14 h-14 rounded-xl object-cover bg-[#F0EAE0] shrink-0"
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=600&auto=format&fit=crop&q=80';
                  }}
                />
                <div className="flex-1 min-w-0">
                  <strong className="font-bold text-[#1B4E43] block text-xs truncate">{product.name}</strong>
                  <span className="text-[11px] text-[#7A6A59]">{product.brand} · {product.category}</span>
                  {product.badge && (
                    <span className="block text-[10px] font-bold text-[#EFA332] mt-0.5">{product.badge}</span>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => handleStartEdit(product)}
                    className="p-2 rounded-xl bg-[#FAF5EC] text-[#1B4E43] cursor-pointer"
                    title="Editar producto"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDuplicateProduct(product)}
                    className="p-2 rounded-xl bg-[#E8F3EF] text-[#1B4E43] cursor-pointer"
                    title="Duplicar"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setItemToDelete({ id: product.id, name: product.name })}
                    className="p-2 rounded-xl bg-red-50 text-red-600 cursor-pointer"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="mt-2.5 space-y-1.5">
                {product.variants.map((v, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 border text-xs ${
                      v.inStock === false ? 'bg-red-50/60 border-red-200' : 'bg-[#FAF5EC] border-[#EFE8D8]'
                    }`}
                  >
                    <span className="font-bold text-[#3D3025] flex-1 truncate">
                      {v.weight} · ${v.price.toLocaleString('es-AR')}
                    </span>
                    <button
                      onClick={() => handleQuickStock(product.id, v.weight, -1)}
                      className="w-7 h-7 rounded-lg bg-white border border-[#E3D6BE] font-black text-[#8C5800] cursor-pointer"
                    >
                      −
                    </button>
                    <span className={`font-black min-w-[40px] text-center ${v.inStock === false ? 'text-red-600' : 'text-[#1B4E43]'}`}>
                      {typeof v.stock === 'number' ? `${v.stock}u` : '∞'}
                    </span>
                    <button
                      onClick={() => handleQuickStock(product.id, v.weight, 1)}
                      className="w-7 h-7 rounded-lg bg-[#1B4E43] text-white font-black cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-10 text-xs text-[#8A7969] bg-[#FFFDF9] border border-[#E5D7BF] rounded-2xl">
              Sin productos con ese filtro.
            </div>
          )}
        </div>

      </main>

      {/* Cloud Orders Viewer Modal */}
      {showOrdersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#FFFDF9] rounded-3xl max-w-2xl w-full border border-[#E5D7BF] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="p-4 sm:p-5 bg-[#1B4E43] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#FFE194]" />
                <h3 className="font-bold text-base font-display">Pedidos Registrados en la Nube</h3>
              </div>
              <button
                onClick={() => setShowOrdersModal(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 divide-y divide-[#EFE8D8]">
              {loadingOrders ? (
                <div className="text-center py-10 text-xs text-[#7A6A59]">
                  Cargando pedidos de la base de datos...
                </div>
              ) : cloudOrders.length === 0 ? (
                <div className="text-center py-12 text-xs text-[#7A6A59]">
                  <ShoppingBag className="w-10 h-10 text-[#CBB99C] mx-auto mb-2 opacity-50" />
                  <p className="font-bold text-sm text-[#3D3025]">Aún no hay pedidos registrados</p>
                  <p className="mt-1">Cuando los clientes completen compras en la tienda aparecerán acá automáticamente.</p>
                </div>
              ) : (
                cloudOrders.map((order, idx) => (
                  <div key={order.orderId || idx} className="py-4 first:pt-0 last:pb-0 space-y-2">
                    <div className="flex items-center justify-between">
                      <strong className="text-sm font-bold text-[#1B4E43] font-display">
                        {order.orderId}
                      </strong>
                      <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#E8F3EF] text-[#1B4E43]">
                        {order.status || 'Confirmado'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-[#4A3D31]">
                      <div>
                        <span className="text-[#8A7969] block text-[10px]">Cliente:</span>
                        <strong>{order.customerName}</strong> ({order.customerPhone})
                      </div>
                      <div>
                        <span className="text-[#8A7969] block text-[10px]">Total:</span>
                        <strong className="text-[#1B4E43]">
                          ${order.total?.toLocaleString('es-AR')}
                        </strong>{' '}
                        via {order.paymentMethod}
                      </div>
                    </div>
                    {order.address && (
                      <p className="text-[11px] text-[#6A5949] flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#DE5D4E] shrink-0" />
                        <span>{order.address}</span>
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-[#FAF5EC] border-t border-[#E8DFC9] flex justify-between items-center">
              <button
                onClick={loadOrders}
                className="text-xs font-bold text-[#1B4E43] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Actualizar</span>
              </button>
              <button
                onClick={() => setShowOrdersModal(false)}
                className="px-4 py-2 bg-[#1B4E43] text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cloud Stock Alerts Viewer Modal */}
      {showStockAlertsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#FFFDF9] rounded-3xl max-w-3xl w-full border border-[#E5D7BF] shadow-2xl overflow-hidden max-h-[88vh] flex flex-col">
            {/* Header */}
            <div className="p-4 sm:p-5 bg-[#C2410C] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/15 rounded-xl">
                  <Bell className="w-5 h-5 text-white fill-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base font-display leading-tight">
                    Alertas de Stock Solicitadas por Clientes
                  </h3>
                  <p className="text-xs text-[#FFEDD5]">
                    Personas que pidieron ser notificadas cuando ingrese stock
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowStockAlertsModal(false)}
                className="p-1.5 rounded-full hover:bg-white/15 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick status bar */}
            <div className="px-5 py-2.5 bg-[#FFF7ED] border-b border-[#FDBA74]/40 flex items-center justify-between text-xs text-[#9A3412]">
              <div className="flex items-center gap-3">
                <span className="font-bold">
                  Total: {stockAlerts.length}
                </span>
                <span className="text-[#C2410C] font-semibold">
                  • Pendientes: {stockAlerts.filter((a) => a.status === 'pending').length}
                </span>
                <span className="text-[#0369A1] font-semibold">
                  • Contactados: {stockAlerts.filter((a) => a.status === 'notified').length}
                </span>
              </div>
              <button
                onClick={loadStockAlerts}
                className="text-xs font-bold text-[#C2410C] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingAlerts ? 'animate-spin' : ''}`} />
                <span>Refrescar</span>
              </button>
            </div>

            {/* Content List */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3">
              {loadingAlerts ? (
                <div className="text-center py-12 text-xs text-[#7A6A59]">
                  Cargando alertas de stock...
                </div>
              ) : stockAlerts.length === 0 ? (
                <div className="text-center py-14 text-xs text-[#7A6A59]">
                  <Bell className="w-12 h-12 text-[#FDBA74] mx-auto mb-3 opacity-60" />
                  <p className="font-bold text-sm text-[#3D3025]">No hay alertas de stock registradas</p>
                  <p className="mt-1 max-w-sm mx-auto text-[#8A7969]">
                    Cuando un cliente presione "Avisarme cuando haya stock" en un producto agotado, aparecerá en esta bandeja para contactarlo.
                  </p>
                </div>
              ) : (
                stockAlerts.map((alert) => {
                  const cleanPhone = (alert.customerPhone || '').replace(/\D/g, '');
                  const waText = encodeURIComponent(
                    `¡Hola ${alert.customerName || 'Cliente'}! Te escribimos de La Juaquina Pet Shop para avisarte que ya tenemos stock disponible de "${alert.productName}" (Presentación ${alert.variantWeight}). ¿Te gustaría que te lo reservemos para entrega o retiro?`
                  );
                  const waLink = cleanPhone ? `https://wa.me/${cleanPhone.startsWith('54') ? cleanPhone : '54' + cleanPhone}?text=${waText}` : null;

                  return (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        alert.status === 'pending'
                          ? 'bg-[#FFFDF7] border-[#FCD34D] shadow-xs'
                          : alert.status === 'notified'
                          ? 'bg-[#F0F9FF] border-[#BAE6FD]'
                          : 'bg-[#F4FBF7] border-[#BBF7D0] opacity-80'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        {/* Product Info */}
                        <div className="flex items-start gap-3">
                          {alert.productImage ? (
                            <img
                              src={alert.productImage}
                              alt={alert.productName}
                              className="w-12 h-12 rounded-xl object-cover border border-[#E5D7BF] shrink-0 bg-white"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-[#FAF5EC] border border-[#E5D7BF] flex items-center justify-center shrink-0 text-[#8A7969]">
                              <Package className="w-6 h-6" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-[#1B4E43] font-display">
                                {alert.productName}
                              </h4>
                              <span className="text-[11px] font-bold bg-[#EFE8D8] text-[#5A4D3F] px-2 py-0.5 rounded-md">
                                {alert.variantWeight}
                              </span>
                            </div>
                            <div className="text-xs text-[#5A4D3F] mt-1 space-y-0.5">
                              <p className="flex items-center gap-1">
                                <span className="text-[#8A7969] font-medium">Cliente:</span>
                                <strong className="text-[#2B231D]">{alert.customerName || 'No especificado'}</strong>
                              </p>
                              <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#6A5949]">
                                {alert.customerEmail && (
                                  <a
                                    href={`mailto:${alert.customerEmail}`}
                                    className="flex items-center gap-1 hover:text-[#1B4E43] hover:underline"
                                  >
                                    <Mail className="w-3 h-3 text-[#8A7969]" />
                                    <span>{alert.customerEmail}</span>
                                  </a>
                                )}
                                {alert.customerPhone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3 text-[#8A7969]" />
                                    <span>{alert.customerPhone}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Status Badge & Date */}
                        <div className="text-right">
                          <span
                            className={`inline-block text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                              alert.status === 'pending'
                                ? 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                                : alert.status === 'notified'
                                ? 'bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD]'
                                : 'bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]'
                            }`}
                          >
                            {alert.status === 'pending'
                              ? '⏳ Pendiente'
                              : alert.status === 'notified'
                              ? '💬 Contactado'
                              : '✅ Stock Repuesto'}
                          </span>
                          <span className="block text-[10px] text-[#A08E7D] mt-1">
                            {new Date(alert.createdAt).toLocaleDateString('es-AR', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Customer Note */}
                      {alert.notes && (
                        <p className="mt-2.5 text-xs text-[#7A6A59] bg-[#FAF5EC] p-2 rounded-xl border border-[#EFE8D8] italic">
                          "{alert.notes}"
                        </p>
                      )}

                      {/* Action buttons */}
                      <div className="mt-3 pt-2.5 border-t border-[#EFE8D8] flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {waLink && (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-bold bg-[#25D366] hover:bg-[#20bd5a] text-white px-3 py-1.5 rounded-xl shadow-2xs transition-colors"
                            >
                              <Phone className="w-3 h-3 fill-white" />
                              <span>Avisar por WhatsApp</span>
                            </a>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-[#8A7969]">Estado:</span>
                          <select
                            value={alert.status}
                            onChange={(e) =>
                              handleUpdateAlertStatus(alert.id, e.target.value as any)
                            }
                            className="text-xs bg-white border border-[#E3D6BE] rounded-lg px-2 py-1 font-semibold text-[#2B231D] outline-none cursor-pointer"
                          >
                            <option value="pending">⏳ Pendiente</option>
                            <option value="notified">💬 Contactado</option>
                            <option value="resolved">✅ Stock Repuesto</option>
                          </select>

                          <button
                            onClick={() => handleDeleteAlert(alert.id)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar alerta"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#FAF5EC] border-t border-[#E8DFC9] flex justify-between items-center">
              <span className="text-xs text-[#8A7969]">
                💡 Tip: Al reponer stock, usá el botón de WhatsApp para concretar la venta de inmediato.
              </span>
              <button
                onClick={() => setShowStockAlertsModal(false)}
                className="px-5 py-2 bg-[#1B4E43] hover:bg-[#256B5C] text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (iFrame safe) */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#FFFDF9] rounded-2xl max-w-sm w-full p-6 border border-[#E5D7BF] shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-[#2B231D] mb-1 font-display">
              ¿Eliminar producto?
            </h3>
            <p className="text-xs text-[#7A6A59] mb-5">
              Se eliminará <strong>"{itemToDelete.name}"</strong> del catálogo y de la base de datos.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setItemToDelete(null)}
                className="px-3 py-2 text-xs font-bold rounded-xl border border-[#E3D6BE] text-[#5A4D3F] hover:bg-[#FAF5EC] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteProduct}
                className="px-3 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal (iFrame safe) */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#FFFDF9] rounded-2xl max-w-sm w-full p-6 border border-[#E5D7BF] shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-[#FFF3D6] text-[#8C5800] flex items-center justify-center mx-auto mb-3">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-[#2B231D] mb-1 font-display">
              ¿Restablecer Catálogo de Fábrica?
            </h3>
            <p className="text-xs text-[#7A6A59] mb-5">
              Esta acción reiniciará los productos a la lista original de La Juaquina.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-2 text-xs font-bold rounded-xl border border-[#E3D6BE] text-[#5A4D3F] hover:bg-[#FAF5EC] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={confirmResetCatalog}
                className="px-3 py-2 text-xs font-bold rounded-xl bg-[#1B4E43] hover:bg-[#256B5C] text-white cursor-pointer"
              >
                Restablecer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Create Product Modal Form */}
      {(isCreating || editingProduct) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-[#FFFDF9] rounded-3xl max-w-2xl w-full border border-[#E5D7BF] shadow-2xl overflow-hidden my-6">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-[#1B4E43] text-white flex items-center justify-between">
              <h3 className="font-bold text-base font-display">
                {isCreating ? 'Agregar Nuevo Producto al Catálogo' : `Editar: ${formData.name}`}
              </h3>
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setIsCreating(false);
                }}
                className="p-1 rounded-full hover:bg-white/10 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveProduct} className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#5B4E41] mb-1">Nombre del Alimento / Producto *</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Sabrosito Mix Carne y Pollo"
                    className="w-full p-2.5 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl focus:ring-2 focus:ring-[#1B4E43] outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#5B4E41] mb-1">Marca *</label>
                  <input
                    type="text"
                    required
                    value={formData.brand || ''}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="Ej: Sabrosito, Raza, Dogui..."
                    className="w-full p-2.5 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl focus:ring-2 focus:ring-[#1B4E43] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-[#5B4E41] mb-1">Categoría</label>
                  <select
                    value={formData.category || 'perros'}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full p-2.5 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl outline-none"
                  >
                    <option value="perros">Perros</option>
                    <option value="gatos">Gatos</option>
                    <option value="piedras">Piedras Sanitarias</option>
                    <option value="accesorios">Accesorios</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#5B4E41] mb-1">Subcategoría / Etapa</label>
                  <input
                    type="text"
                    value={formData.subCategory || ''}
                    onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
                    placeholder="Ej: Adulto, Cachorro, Senior..."
                    className="w-full p-2.5 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#5B4E41] mb-1">Insignia (Badge)</label>
                  <input
                    type="text"
                    value={formData.badge || ''}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                    placeholder="Ej: 15% OFF, Más Vendido..."
                    className="w-full p-2.5 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl outline-none"
                  />
                </div>
              </div>

              {/* Imagen del producto: vista previa + URL / Subir / Galería */}
              <div className="bg-[#FAF5EC] border border-[#E3D6BE] rounded-2xl p-3">
                <div className="flex items-center gap-3">
                  <img
                    src={formData.image || FALLBACK_IMG}
                    alt="Vista previa"
                    className="w-20 h-20 rounded-xl object-cover bg-white border border-[#E3D6BE] shrink-0 shadow-xs"
                    onError={(e) => {
                      e.currentTarget.src = FALLBACK_IMG;
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <label className="block font-bold text-[#5B4E41] mb-1.5">Imagen del Producto</label>
                    <div className="flex gap-1.5">
                      {(
                        [
                          { id: 'url', label: 'Enlace', icon: <Link2 className="w-3.5 h-3.5" /> },
                          { id: 'upload', label: 'Subir foto', icon: <Upload className="w-3.5 h-3.5" /> },
                          { id: 'gallery', label: 'Galería', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
                        ] as const
                      ).map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setImageTab(t.id)}
                          className={`flex-1 inline-flex items-center justify-center gap-1 text-[11px] font-bold px-2 py-1.5 rounded-xl cursor-pointer transition-colors ${
                            imageTab === t.id
                              ? 'bg-[#1B4E43] text-white'
                              : 'bg-white border border-[#E3D6BE] text-[#5B4E41] hover:bg-[#F2ECE0]'
                          }`}
                        >
                          {t.icon}
                          <span>{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {imageTab === 'url' && (
                  <input
                    type="url"
                    value={formData.image?.startsWith('data:') ? '' : formData.image || ''}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="https://... pegá el enlace de la foto"
                    className="mt-2.5 w-full p-2.5 bg-white border border-[#E3D6BE] rounded-xl outline-none"
                  />
                )}

                {imageTab === 'upload' && (
                  <label className="mt-2.5 flex flex-col items-center justify-center gap-1.5 w-full p-4 rounded-xl border-2 border-dashed border-[#CBB99C] bg-white cursor-pointer hover:border-[#1B4E43] hover:bg-[#E8F3EF]/50 transition-colors text-center">
                    <ImagePlus className="w-6 h-6 text-[#1B4E43]" />
                    {uploadingImage ? (
                      <span className="font-bold text-[#1B4E43]">Procesando imagen...</span>
                    ) : (
                      <>
                        <span className="font-bold text-[#1B4E43]">Tocá para subir una foto</span>
                        <span className="text-[11px] text-[#8A7969]">JPG, PNG o WebP · se achica sola a 900px y queda guardada en el producto</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleImageUpload(f);
                        e.target.value = '';
                      }}
                    />
                  </label>
                )}

                {imageTab === 'gallery' && (
                  <div className="mt-2.5 grid grid-cols-4 gap-1.5">
                    {IMAGE_PRESETS.map((src) => (
                      <button
                        key={src}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, image: src });
                          showFeedback('✅ Imagen de galería seleccionada.');
                        }}
                        className={`rounded-xl overflow-hidden border-2 cursor-pointer transition-all hover:scale-105 ${
                          formData.image === src ? 'border-[#1B4E43] ring-2 ring-[#1B4E43]/30' : 'border-transparent'
                        }`}
                      >
                        <img src={src} alt="Opción de galería" className="w-full h-14 object-cover" loading="lazy" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-[#5B4E41] mb-1">Descripción Comercial</label>
                <textarea
                  rows={2}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detalles sobre ingredientes, beneficios y formulación..."
                  className="w-full p-2.5 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl outline-none"
                />
              </div>

              {/* Presentaciones y Precios */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold text-[#5B4E41]">Presentaciones (Kilos / Pesos) y Precios</label>
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="text-xs font-bold text-[#1B4E43] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Peso</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.variants?.map((variant, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-[#FAF5EC] rounded-xl border border-[#E3D6BE]">
                      <input
                        type="text"
                        placeholder="Ej: 15 kg"
                        value={variant.weight}
                        onChange={(e) => handleUpdateVariant(idx, 'weight', e.target.value)}
                        className="w-24 p-1.5 bg-white border border-[#E3D6BE] rounded-lg"
                      />
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-2 text-[#8A7969]">$</span>
                        <input
                          type="number"
                          placeholder="Precio ARS"
                          value={variant.price}
                          onChange={(e) => handleUpdateVariant(idx, 'price', Number(e.target.value))}
                          className="w-full pl-6 p-1.5 bg-white border border-[#E3D6BE] rounded-lg"
                        />
                      </div>
                      <div className="w-20" title="Unidades disponibles. La tienda descuenta sola con cada venta.">
                        <input
                          type="number"
                          min={0}
                          placeholder="Stock"
                          value={typeof variant.stock === 'number' ? variant.stock : ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? undefined : Number(e.target.value);
                            handleUpdateVariant(idx, 'stock' as any, val);
                            if (typeof val === 'number') handleUpdateVariant(idx, 'inStock', val > 0);
                          }}
                          className="w-full p-1.5 bg-white border border-[#E3D6BE] rounded-lg text-center font-bold"
                        />
                        <span className="block text-center text-[9px] text-[#8A7969] font-bold">STOCK U.</span>
                      </div>
                      <label
                        className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg cursor-pointer transition-colors select-none ${
                          variant.inStock !== false
                            ? 'bg-[#E8F3EF] text-[#1B4E43] border border-[#256B5C]/30'
                            : 'bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]'
                        }`}
                        title="Tildar si hay stock disponible para los clientes"
                      >
                        <input
                          type="checkbox"
                          checked={variant.inStock !== false}
                          onChange={(e) => handleUpdateVariant(idx, 'inStock', e.target.checked)}
                          className="rounded text-[#1B4E43] cursor-pointer"
                        />
                        <span>{variant.inStock !== false ? 'En Stock' : 'Agotado'}</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(idx)}
                        className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-[#EFE8D8] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(null);
                    setIsCreating(false);
                  }}
                  className="px-4 py-2 rounded-xl text-[#7A6A59] hover:bg-[#FAF5EC] font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#1B4E43] hover:bg-[#256B5C] text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 font-display transition-colors cursor-pointer shadow-xs"
                >
                  <Save className="w-4 h-4 text-[#EFA332]" />
                  <span>Guardar en la Nube</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
