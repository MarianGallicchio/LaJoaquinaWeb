// ENTRADA 2 — ADMIN (admin.html -> src/admin-main.tsx -> AdminApp)
// Panel privado: resumen, productos, ventas/pedidos, mayoristas, envíos/comercio y herramientas.
// La tienda vive en otra entrada: index.html -> StoreApp.
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Truck,
  Wrench,
  Store,
  LogOut,
  ShieldCheck,
  KeyRound,
  Bell,
  AlertCircle,
  AtSign,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { Product, OrderDetails, StockAlert, StoreSettings } from './types';
import { PRODUCTS } from './data/products';
import {
  AuthUserProfile,
  fetchCloudProducts,
  fetchCloudOrders,
  fetchCloudStockAlerts,
  fetchAdminMe,
  cloudLogin,
  cloudLogout,
} from './lib/cloudDb';
import { DEFAULT_SETTINGS, fetchStoreSettings } from './lib/storeSettings';
import { AdminCatalog } from './components/AdminCatalog';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminOrders } from './components/admin/AdminOrders';
import { AdminShipping } from './components/admin/AdminShipping';
import { AdminTools } from './components/admin/AdminTools';

type Tab = 'resumen' | 'productos' | 'ventas' | 'envios' | 'herramientas';

const TAB_META: Record<Tab, { label: string; desc: string }> = {
  resumen: { label: 'Resumen', desc: 'Facturación, estados y alertas de un vistazo' },
  productos: { label: 'Productos y Stock', desc: 'Catálogo, precios, stock y alertas de clientes' },
  ventas: { label: 'Ventas y Pedidos', desc: 'Pedidos, envíos, seguimiento y cobranzas' },
  envios: { label: 'Envíos y Comercio', desc: 'Costos de envío, cupones y datos de la tienda' },
  herramientas: { label: 'Herramientas', desc: 'Aumentos masivos, respaldos e importación' },
};

export default function AdminApp() {
  const [tab, setTab] = useState<Tab>('resumen');
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [orders, setOrders] = useState<OrderDetails[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [toast, setToast] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  const [currentUser, setCurrentUser] = useState<AuthUserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('la_juaquina_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [gateEmail, setGateEmail] = useState('admin@lajoaquina.com');
  const [gatePassword, setGatePassword] = useState('');
  const [gateError, setGateError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const loadAll = async () => {
    setLoadingData(true);
    try {
      const [prods, ords, als, sett] = await Promise.all([
        fetchCloudProducts().catch(() => null),
        fetchCloudOrders().catch(() => null),
        fetchCloudStockAlerts().catch(() => null),
        fetchStoreSettings().catch(() => null),
      ]);
      if (prods && prods.length > 0) {
        setProducts(prods);
        try {
          localStorage.setItem('la_juaquina_products', JSON.stringify(prods));
        } catch { /* ignore */ }
      }
      if (ords) setOrders(ords);
      if (als) setAlerts(als);
      if (sett) setSettings(sett);
    } finally {
      setLoadingData(false);
    }
  };

  // Restaurar sesión validándola contra el backend (sin sesión válida no hay acceso)
  useEffect(() => {
    fetchAdminMe()
      .then((u) => {
        if (u) setCurrentUser(u);
        else {
          setCurrentUser(null);
          try {
            localStorage.removeItem('la_juaquina_user');
          } catch { /* ignore */ }
        }
      })
      .catch(() => setCurrentUser(null))
      .finally(() => setCheckingSession(false));
  }, []);

  useEffect(() => {
    if (currentUser?.role === 'admin') loadAll();
  }, [currentUser]);

  const handleUpdateProducts = (list: Product[]) => {
    setProducts(list);
    try {
      localStorage.setItem('la_juaquina_products', JSON.stringify(list));
    } catch { /* ignore */ }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!gateEmail.trim() || !gatePassword) {
      setGateError('Ingresá tu email y contraseña de administrador.');
      return;
    }
    setGateError(null);
    setLoginLoading(true);
    try {
      const admin = await cloudLogin(gateEmail.trim(), gatePassword);
      setCurrentUser(admin);
      setGatePassword('');
      notify('✅ Sesión iniciada.');
    } catch (err: any) {
      const msg = String(err.message || '');
      setGateError(
        msg.includes('Failed to fetch') || msg.includes('fetch')
          ? 'Sin conexión con el servidor. Abrí el panel donde corre el backend (local con npm run dev, o tu URL de Vercel).'
          : msg || 'Credenciales inválidas.'
      );
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await cloudLogout();
    setCurrentUser(null);
  };

  const goToStore = () => {
    // Ruta relativa: funciona en localhost (/) y en GitHub Pages (/LaJoaquinaWeb/)
    window.location.href = './';
  };

  const goTab = (t: Tab) => {
    setTab(t);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Puerta de acceso: solo admin
  if (currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0C1F1B] via-[#1B4E43] to-[#0C1F1B] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#FFFDF9] border border-[#E5D7BF] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-[#EFA332] to-[#E39420] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md rotate-3">
            <ShieldCheck className="w-8 h-8 text-[#1E170E]" />
          </div>
          <h2 className="text-xl font-bold font-display text-[#1B4E43] mb-1">Panel Administrador</h2>
          <p className="text-xs text-[#6A5949] mb-1">La Joaquina Pet Shop · Bella Vista · Solo online</p>
          <p className="text-[11px] text-[#8A7969] mb-6">
            Entrada privada <strong>admin.html</strong>. La tienda pública está en <strong>index.html</strong>.
          </p>
          {gateError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{gateError}</span>
            </div>
          )}
          {checkingSession ? (
            <div className="py-6 text-xs text-[#6A5949] font-bold">Verificando sesión...</div>
          ) : (
          <form onSubmit={handleLogin} className="space-y-3 text-left">
            <div className="relative">
              <AtSign className="w-4 h-4 text-[#8A7969] absolute left-3 top-3" />
              <input
                type="email"
                value={gateEmail}
                onChange={(e) => setGateEmail(e.target.value)}
                placeholder="Email de administrador"
                autoComplete="username"
                className="w-full text-xs pl-9 pr-3 py-2.5 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B4E43]"
              />
            </div>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-[#8A7969] absolute left-3 top-3" />
              <input
                type="password"
                value={gatePassword}
                onChange={(e) => setGatePassword(e.target.value)}
                placeholder="Contraseña"
                autoComplete="current-password"
                className="w-full text-xs pl-9 pr-3 py-2.5 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B4E43]"
              />
            </div>
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-[#1B4E43] hover:bg-[#256B5C] text-[#FFE194] font-extrabold text-xs py-3 px-4 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-60"
            >
              {loginLoading ? 'Verificando...' : 'Ingresar al panel'}
            </button>
            <button type="button" onClick={goToStore} className="w-full text-xs text-[#7A6A59] hover:text-[#1B4E43] font-bold py-2 cursor-pointer text-center">
              ← Ir a la tienda pública
            </button>
          </form>
          )}
        </motion.div>
      </div>
    );
  }

  const pendingAlerts = alerts.filter((a) => a.status === 'pending').length;
  const pendingOrders = orders.filter((o) => (o.status || 'pendiente') === 'pendiente').length;

  const navItems: { id: Tab; icon: React.ReactNode; badge?: number }[] = [
    { id: 'resumen', icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
    { id: 'productos', icon: <Package className="w-[18px] h-[18px]" />, badge: pendingAlerts },
    { id: 'ventas', icon: <ShoppingBag className="w-[18px] h-[18px]" />, badge: pendingOrders },
    { id: 'envios', icon: <Truck className="w-[18px] h-[18px]" /> },
    { id: 'herramientas', icon: <Wrench className="w-[18px] h-[18px]" /> },
  ];

  const navButton = (t: Tab, icon: React.ReactNode, badge?: number, vertical = false) => (
    <button
      key={t}
      onClick={() => goTab(t)}
      className={`group flex items-center gap-3 rounded-xl font-bold cursor-pointer transition-all ${
        vertical ? 'w-full px-3.5 py-2.5 text-[13px]' : 'px-3.5 py-2 text-xs whitespace-nowrap'
      } ${
        tab === t
          ? 'bg-[#EFA332] text-[#1E170E] shadow-md'
          : 'text-[#C9E2D8] hover:bg-white/10 hover:text-white'
      }`}
    >
      <span className={tab === t ? '' : 'opacity-70 group-hover:opacity-100'}>{icon}</span>
      <span className={vertical ? '' : 'hidden sm:inline'}>{TAB_META[t].label}</span>
      {!!badge && badge > 0 && (
        <span className={`ml-auto text-[10px] font-black px-1.5 py-0.5 rounded-full ${tab === t ? 'bg-[#B91C1C] text-white' : 'bg-[#B91C1C] text-white animate-pulse'}`}>
          {badge}
        </span>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#F4EFE5] text-[#2B231D] flex">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-gradient-to-b from-[#0C1F1B] via-[#143D34] to-[#0C1F1B] text-white sticky top-0 h-screen p-4">
        <div className="flex items-center gap-2.5 px-2 py-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#EFA332] to-[#E39420] flex items-center justify-center text-xl shadow-md -rotate-3">
            🐾
          </div>
          <div>
            <p className="font-bold font-display leading-tight">La Joaquina</p>
            <p className="text-[10px] uppercase tracking-widest text-[#8FC0AF] font-bold">Admin · Bella Vista</p>
          </div>
        </div>

        <div className="mt-4 space-y-1">
          {navItems.map((n) => navButton(n.id, n.icon, n.badge, true))}
        </div>

        <div className="mt-auto space-y-2">
          {(pendingOrders > 0 || pendingAlerts > 0) && (
            <div className="bg-white/10 border border-white/15 rounded-xl px-3 py-2.5 text-[11px] font-semibold text-[#FFE9B8] flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#EFA332] shrink-0" />
              <span>
                {pendingOrders > 0 && `${pendingOrders} pedidos pendientes`}
                {pendingOrders > 0 && pendingAlerts > 0 && ' · '}
                {pendingAlerts > 0 && `${pendingAlerts} alertas`}
              </span>
            </div>
          )}
          <button
            onClick={goToStore}
            className="w-full flex items-center gap-2.5 bg-[#FFE194] hover:bg-[#FFD66B] text-[#1E170E] text-[13px] font-extrabold px-3.5 py-2.5 rounded-xl cursor-pointer transition-colors"
          >
            <Store className="w-[18px] h-[18px]" /> Ver tienda
          </button>
          <div className="flex items-center gap-2.5 px-1 pt-1">
            <div className="w-8 h-8 rounded-full bg-[#EFA332] text-[#1E170E] font-black flex items-center justify-center text-xs">
              {(currentUser.name || currentUser.email || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate">{currentUser.name || 'Administrador'}</p>
              <p className="text-[10px] text-[#8FC0AF] truncate">{currentUser.email}</p>
            </div>
            <button onClick={handleLogout} title="Cerrar sesión" className="p-2 rounded-lg hover:bg-white/10 cursor-pointer">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Columna principal */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar móvil */}
        <header className="lg:hidden bg-[#0C1F1B] text-white sticky top-0 z-30 shadow-md">
          <div className="px-4 py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🐾</span>
              <div>
                <p className="text-sm font-bold font-display leading-tight">Panel Admin</p>
                <p className="text-[10px] text-[#8FC0AF]">{products.length} prod · {orders.length} pedidos</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={goToStore} className="p-2 rounded-xl bg-[#FFE194] text-[#1E170E] cursor-pointer" title="Ver tienda">
                <Store className="w-4 h-4" />
              </button>
              <button onClick={handleLogout} className="p-2 rounded-xl bg-white/10 cursor-pointer" title="Salir">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
          <nav className="px-3 pb-2.5 flex gap-1.5 overflow-x-auto">
            {navItems.map((n) => navButton(n.id, n.icon, n.badge))}
          </nav>
        </header>

        {/* Barra de sección */}
        <div className="bg-[#FFFDF9]/80 backdrop-blur border-b border-[#E5D7BF] sticky top-0 lg:top-0 z-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <h1 className="text-lg sm:text-xl font-extrabold text-[#1B4E43] font-display leading-tight">
                {TAB_META[tab].label}
              </h1>
              <p className="text-[11px] text-[#8A7969]">{TAB_META[tab].desc}</p>
            </div>
            <span className="hidden md:inline-flex text-[11px] font-bold text-[#5A4D3F] bg-[#FAF5EC] border border-[#E8DFC9] px-3 py-1.5 rounded-xl">
              {products.length} productos · {orders.length} pedidos
            </span>
            <button
              onClick={() => {
                loadAll();
                notify('🔄 Datos actualizados.');
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#1B4E43] hover:bg-[#256B5C] text-white px-3.5 py-2 rounded-xl cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
              {loadingData ? 'Cargando…' : 'Actualizar'}
            </button>
          </div>
        </div>

        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {tab === 'resumen' && (
                <AdminDashboard products={products} orders={orders} alerts={alerts} onGoTo={(t) => goTab(t as Tab)} />
              )}
              {tab === 'productos' && (
                <AdminCatalog
                  products={products}
                  onUpdateProducts={handleUpdateProducts}
                  onExitAdmin={goToStore}
                  currentUser={currentUser}
                  onOpenAuth={() => {}}
                  onLoginSuccess={(u) => setCurrentUser(u)}
                />
              )}
              {tab === 'ventas' && (
                <AdminOrders
                  orders={orders}
                  products={products}
                  settings={settings}
                  onReload={loadAll}
                  onOrdersChange={setOrders}
                  onProductsChange={handleUpdateProducts}
                  notify={notify}
                />
              )}
              {tab === 'envios' && (
                <AdminShipping settings={settings} onSaved={(s) => { setSettings(s); notify('✅ Comercio y envíos guardados.'); }} />
              )}
              {tab === 'herramientas' && (
                <AdminTools products={products} onUpdateProducts={handleUpdateProducts} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="text-center text-[11px] text-[#8A7969] pb-6 px-4">
          Entrada admin (<strong>admin.html</strong>) · Tienda pública (<strong>index.html</strong>) · Bella Vista · Solo online
        </footer>
      </div>

      {/* Toast global */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-5 right-4 z-50 bg-[#1B4E43] text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl border border-[#256B5C] flex items-center gap-2 max-w-xs"
          >
            <CheckCircle2 className="w-4 h-4 text-[#EFA332] shrink-0" />
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
