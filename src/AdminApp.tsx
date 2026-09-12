// ENTRADA 2 — ADMIN (admin.html -> src/admin-main.tsx -> AdminApp)
// Panel privado: resumen, productos, ventas/pedidos, mayoristas, envíos/comercio y herramientas.
// La tienda vive en otra entrada: index.html -> StoreApp.
import React, { useEffect, useRef, useState } from 'react';
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
  Users,
  RefreshCw,
  CheckCircle2,
  Wifi,
  WifiOff,
  Activity,
  ShieldAlert,
  Server,
  X,
} from 'lucide-react';
import { Product, OrderDetails, StockAlert, StoreSettings } from './types';
import { PRODUCTS } from './data/products';
import {
  AuthUserProfile,
  fetchCloudProducts,
  fetchCloudOrders,
  fetchCloudStockAlerts,
  cloudLogin,
  cloudLogout,
  supaMode,
  getStoredOrders,
  STORAGE_KEY_USER,
  playOrderNotificationSound,
  checkAdminSession,
  SessionCheckResult,
  checkBackendHealth,
  BackendHealthResult,
} from './lib/cloudDb';
import { DEFAULT_SETTINGS, fetchStoreSettings, formatARS } from './lib/storeSettings';
import { goStore as goStorePage } from './lib/nav';
import { supaDiagnostics } from './lib/supabase';
import { AdminCatalog } from './components/AdminCatalog';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminOrders } from './components/admin/AdminOrders';
import { AdminShipping } from './components/admin/AdminShipping';
import { AdminTools } from './components/admin/AdminTools';
import { AdminTeam } from './components/admin/AdminTeam';

type Tab = 'resumen' | 'productos' | 'ventas' | 'envios' | 'herramientas' | 'equipo';

const TAB_META: Record<Tab, { label: string; desc: string }> = {
  resumen: { label: 'Resumen', desc: 'Facturación, estados y alertas de un vistazo' },
  productos: { label: 'Productos y Stock', desc: 'Catálogo, precios, stock y alertas de clientes' },
  ventas: { label: 'Ventas y Pedidos', desc: 'Pedidos, envíos, seguimiento y cobranzas' },
  envios: { label: 'Envíos y Comercio', desc: 'Costos de envío, cupones y datos de la tienda' },
  herramientas: { label: 'Herramientas', desc: 'Aumentos masivos, respaldos e importación' },
  equipo: { label: 'Equipo y Mi Cuenta', desc: 'Tu perfil, tu clave y empleados por puesto' },
};

export default function AdminApp() {
  // La pestaña persiste: si el navegador recarga, volvés donde estabas (no a Resumen)
  const [tab, setTab] = useState<Tab>(() => {
    try {
      const saved = localStorage.getItem('la_joaquina_admin_tab') as Tab | null;
      return saved && TAB_META[saved] ? saved : 'resumen';
    } catch {
      return 'resumen';
    }
  });
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [orders, setOrders] = useState<OrderDetails[]>(() => getStoredOrders());
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [toast, setToast] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // Diagnóstico de sesión y token
  const [sessionCheck, setSessionCheck] = useState<SessionCheckResult | null>(null);

  // Diagnóstico y monitor de conexión en segundo plano (Supabase / Express)
  const [backendHealth, setBackendHealth] = useState<BackendHealthResult | null>(null);
  const [silentFailureDetected, setSilentFailureDetected] = useState(false);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [showDiagModal, setShowDiagModal] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);

  const [currentUser, setCurrentUser] = useState<AuthUserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USER) || localStorage.getItem('la_juaquina_user');
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
  const [diag, setDiag] = useState<{ reachable: boolean; tables: boolean; detail: string } | null>(null);

  // Autodiagnóstico de conexión visible en el login
  useEffect(() => {
    if (currentUser?.role === 'admin') return;
    setDiag(null);
    if (supaMode()) {
      supaDiagnostics()
        .then(setDiag)
        .catch(() => setDiag({ reachable: false, tables: false, detail: 'No se pudo verificar' }));
    } else {
      fetch('/api/health')
        .then((r) => r.json())
        .then((j) => {
          if (j?.status === 'ok') {
            setDiag({ reachable: true, tables: true, detail: `Servidor conectado (${j.productsCount || 20} productos)` });
          } else {
            setDiag({ reachable: false, tables: false, detail: 'Servidor no listo' });
          }
        })
        .catch(() => setDiag({ reachable: false, tables: false, detail: 'Modo local (sin servidor)' }));
    }
  }, [currentUser?.role]);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const loadAll = async (silent = false) => {
    if (!silent) setLoadingData(true);
    let fetchFailed = false;
    let fetchErrorDetail = '';

    try {
      const [prodsRes, ordsRes, alsRes, settRes, healthRes] = await Promise.allSettled([
        fetchCloudProducts(),
        fetchCloudOrders(),
        fetchCloudStockAlerts(),
        fetchStoreSettings(),
        checkBackendHealth(),
      ]);

      if (prodsRes.status === 'fulfilled' && prodsRes.value && prodsRes.value.length > 0) {
        setProducts(prodsRes.value);
        try {
          localStorage.setItem('la_joaquina_products_v2', JSON.stringify(prodsRes.value));
        } catch { /* ignore */ }
      } else if (prodsRes.status === 'rejected') {
        fetchFailed = true;
        fetchErrorDetail = prodsRes.reason?.message || 'Error al obtener productos';
      }

      if (ordsRes.status === 'fulfilled' && ordsRes.value) {
        const ords = ordsRes.value;
        setOrders((prev) => {
          // Detectar si entraron pedidos nuevos para notificar y sonar la alarma
          if (prev.length > 0 && ords.length > prev.length) {
            const prevIds = new Set(prev.map((o) => o.orderId));
            const newOrders = ords.filter((o) => !prevIds.has(o.orderId));
            if (newOrders.length > 0) {
              const newest = newOrders[0];
              playOrderNotificationSound();
              notify(`🔔 ¡Nuevo pedido recibido! ${newest.orderId} (${newest.customerName || 'Cliente'}) · ${formatARS(newest.total)}`);
            }
          }
          return ords;
        });
      } else if (ordsRes.status === 'rejected') {
        fetchFailed = true;
        fetchErrorDetail = fetchErrorDetail || ordsRes.reason?.message || 'Error al obtener pedidos';
      }

      if (alsRes.status === 'fulfilled' && alsRes.value) setAlerts(alsRes.value);
      if (settRes.status === 'fulfilled' && settRes.value) setSettings(settRes.value);

      // Evaluación del monitor de salud del backend
      if (healthRes.status === 'fulfilled') {
        const bh = healthRes.value;
        setBackendHealth(bh);
        if (!bh.connected || fetchFailed) {
          setSilentFailureDetected(true);
          setConsecutiveFailures((prev) => prev + 1);
        } else {
          setSilentFailureDetected(false);
          setConsecutiveFailures(0);
          setLastSyncTime(bh.timestamp);
        }
      } else {
        setSilentFailureDetected(true);
        setConsecutiveFailures((prev) => prev + 1);
      }
    } catch {
      setSilentFailureDetected(true);
      setConsecutiveFailures((prev) => prev + 1);
    } finally {
      if (!silent) setLoadingData(false);
    }
  };

  // 1. Diagnóstico del token y sesión inmediatamente al cargar el Dashboard
  // Verifica si el token ha expirado, si la firma es inválida o si el backend lo rechaza
  const sessionNonce = useRef(0);
  useEffect(() => {
    const started = sessionNonce.current;
    const stillMine = () => sessionNonce.current === started;

    checkAdminSession()
      .then((diag) => {
        if (!stillMine()) return;
        setSessionCheck(diag);

        if (diag.status === 'expired') {
          // Token expirado: bloquear acceso y pedir reingreso con mensaje claro
          setCurrentUser(null);
          setGateError(`⚠️ Tu sesión ha expirado (${diag.detail}). Por favor ingresá tus credenciales nuevamente.`);
        } else if (diag.status === 'invalid') {
          // Token inválido o revocado
          setCurrentUser(null);
          setGateError(`⚠️ El token de acceso guardado es inválido. Por favor iniciá sesión nuevamente.`);
        } else if (diag.status === 'valid' && diag.user) {
          setCurrentUser(diag.user);
        } else if (diag.status === 'server_unreachable') {
          // Servidor inalcanzable temporalmente: permitir continuar con sesión en caché si existía
          const existing = localStorage.getItem(STORAGE_KEY_USER) || localStorage.getItem('la_juaquina_user');
          if (existing) {
            try {
              const parsed = JSON.parse(existing);
              if (parsed && parsed.role !== 'customer') {
                setCurrentUser(parsed);
              }
            } catch { /* ignore */ }
          }
        }
      })
      .catch((err) => {
        if (!stillMine()) return;
        setSessionCheck({
          valid: false,
          status: 'invalid',
          user: null,
          expiresAt: null,
          detail: err?.message || 'Error al validar el token de sesión.',
        });
      })
      .finally(() => {
        if (!stillMine()) return;
        setCheckingSession(false);
      });

    // 2. Diagnóstico de conectividad inicial en segundo plano
    checkBackendHealth().then((bh) => {
      if (!stillMine()) return;
      setBackendHealth(bh);
      if (!bh.connected) {
        setSilentFailureDetected(true);
        setConsecutiveFailures(1);
      } else {
        setSilentFailureDetected(false);
        setConsecutiveFailures(0);
        setLastSyncTime(bh.timestamp);
      }
    });
  }, []);

  // Función para ejecutar diagnóstico manual completo a demanda
  const runFullDiagnostic = async () => {
    setIsDiagnosing(true);
    try {
      const [sessionDiag, healthDiag] = await Promise.all([
        checkAdminSession(),
        checkBackendHealth(),
      ]);
      setSessionCheck(sessionDiag);
      setBackendHealth(healthDiag);

      if (!healthDiag.connected) {
        setSilentFailureDetected(true);
        setConsecutiveFailures((c) => Math.max(c, 1));
        notify(`⚠️ Conexión fallando: ${healthDiag.error || 'No responde el backend'}`);
      } else {
        setSilentFailureDetected(false);
        setConsecutiveFailures(0);
        setLastSyncTime(new Date());
      }

      if (sessionDiag.status === 'expired' || sessionDiag.status === 'invalid') {
        notify(`🔒 Token no válido: ${sessionDiag.detail}`);
      } else if (healthDiag.connected && sessionDiag.valid) {
        notify(`✅ Sistema en línea: Backend (${healthDiag.latencyMs}ms) y sesión validados.`);
      }
    } catch (err: any) {
      notify(`❌ Error en prueba: ${err?.message || 'Fallo de diagnóstico'}`);
    } finally {
      setIsDiagnosing(false);
    }
  };

  const formatTimeAgo = (date: Date | null) => {
    if (!date) return 'Nunca sincronizado';
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 5) return 'Recién';
    if (diffSec < 60) return `Hace ${diffSec}s`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `Hace ${diffMin}m`;
    return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  };

  // Sincronización en tiempo real multidispositivo y multiventana (BroadcastChannel + storage + polling cada 4s)
  useEffect(() => {
    if (currentUser && currentUser.role !== 'customer') {
      loadAll(false);

      // 1. BroadcastChannel (moderno entre pestañas y ventanas del navegador)
      let channel: BroadcastChannel | null = null;
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          channel = new BroadcastChannel('la_joaquina_sync');
          channel.onmessage = (event) => {
            const data = event?.data;
            if (data?.type === 'order_created') {
              loadAll(true);
              const o = data.detail;
              if (o?.orderId) {
                playOrderNotificationSound();
                notify(`🔔 ¡Nuevo pedido recibido! ${o.orderId} (${o.customerName || 'Cliente'}) · ${formatARS(o.total)}`);
              }
            } else if (data?.type === 'order_updated' || data?.type === 'products_updated') {
              loadAll(true);
            }
          };
        }
      } catch { /* ignore */ }

      // 2. Storage event (compatibilidad cruzada entre pestañas)
      const onStorage = (e: StorageEvent) => {
        if (e.key === 'la_joaquina_orders' || e.key === 'la_joaquina_last_sync' || e.key === 'la_joaquina_products_v2') {
          loadAll(true);
        }
      };
      window.addEventListener('storage', onStorage);

      // 3. CustomEvent (misma ventana)
      const onOrder = (e: any) => {
        loadAll(true);
        const o = e?.detail;
        if (o?.orderId) {
          playOrderNotificationSound();
          notify(`🔔 ¡Nuevo pedido recibido! ${o.orderId} (${o.customerName || 'Cliente'}) · ${formatARS(o.total)}`);
        }
      };
      window.addEventListener('joaquina:order_created', onOrder);

      // 4. Vuelta a la pestaña (visibilidad)
      const onFocus = () => {
        if (document.visibilityState === 'visible') {
          loadAll(true);
        }
      };
      window.addEventListener('visibilitychange', onFocus);

      // 5. Polling suave en segundo plano cada 4 segundos (para pedidos desde otros dispositivos/celulares)
      const pollTimer = setInterval(() => {
        loadAll(true);
      }, 4000);

      return () => {
        window.removeEventListener('storage', onStorage);
        window.removeEventListener('joaquina:order_created', onOrder);
        window.removeEventListener('visibilitychange', onFocus);
        clearInterval(pollTimer);
        try {
          channel?.close();
        } catch { /* ignore */ }
      };
    }
  }, [currentUser]);

  const handleUpdateProducts = (list: Product[]) => {
    setProducts(list);
    try {
      localStorage.setItem('la_joaquina_products_v2', JSON.stringify(list));
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
      sessionNonce.current++;
      setCurrentUser(admin);
      setGatePassword('');
      setCheckingSession(false);
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
    sessionNonce.current++;
    await cloudLogout();
    setCurrentUser(null);
    setSessionCheck({
      valid: false,
      status: 'no_token',
      user: null,
      expiresAt: null,
      detail: 'Sesión cerrada por el usuario.',
    });
    setGateError(null);
  };

  const goToStore = () => {
    // Va al index.html explícito: funciona con o sin barra final, en local y en Pages
    goStorePage();
  };

  const goTab = (t: Tab) => {
    setTab(t);
    try {
      localStorage.setItem('la_joaquina_admin_tab', t);
    } catch { /* ignore */ }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Puerta de acceso: personal con rol (dueña, admin, stock, ventas).
  // Los clientes ven el aviso correspondiente en vez del login.
  if (!currentUser || currentUser.role === 'customer') {
    // Sesión válida pero sin rol de dueña: explicarlo en vez de mostrar el login
    if (currentUser) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-[#0C1F1B] via-[#1B4E43] to-[#0C1F1B] flex items-center justify-center p-4">
          <div className="bg-[#FFFDF9] border border-[#E5D7BF] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center">
            <div className="w-16 h-16 bg-[#FEF3C7] border border-[#FDE68A] rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔒</span>
            </div>
            <h2 className="text-xl font-bold font-display text-[#1B4E43] mb-1">Sin acceso de dueña</h2>
            <p className="text-xs text-[#6A5949] mb-1">
              Entraste como <strong>{currentUser.email}</strong>, pero esa cuenta no tiene rol de administradora.
            </p>
            <p className="text-[11px] text-[#8A7969] mb-6">
              En Supabase, corré el SQL del rol para ese email (GUIA-SUPABASE.txt paso 2B) y volvé a entrar.
            </p>
            <div className="space-y-2">
              <button
                onClick={handleLogout}
                className="w-full bg-[#1B4E43] hover:bg-[#256B5C] text-[#FFE194] font-extrabold text-xs py-3 px-4 rounded-xl cursor-pointer"
              >
                Cerrar sesión y probar con otra cuenta
              </button>
              <button onClick={goToStore} className="w-full text-xs text-[#7A6A59] hover:text-[#1B4E43] font-bold py-2 cursor-pointer">
                ← Ir a la tienda pública
              </button>
            </div>
          </div>
        </div>
      );
    }
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

          {/* Indicador de diagnóstico si el token expiró o es inválido */}
          {sessionCheck && (sessionCheck.status === 'expired' || sessionCheck.status === 'invalid') && (
            <div className="mb-4 p-3.5 bg-amber-50 border border-amber-300 text-amber-900 text-xs rounded-2xl flex items-start gap-2.5 text-left">
              <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-950">
                  {sessionCheck.status === 'expired' ? 'Sesión expirada' : 'Token de sesión no válido'}
                </p>
                <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                  {sessionCheck.detail}
                </p>
                {sessionCheck.expiresAt && (
                  <p className="text-[10px] text-amber-700 font-mono mt-1">
                    Venció: {new Date(sessionCheck.expiresAt).toLocaleString('es-AR')}
                  </p>
                )}
              </div>
            </div>
          )}

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
                name="lj-admin-email"
                autoComplete="off"
                value={gateEmail}
                onChange={(e) => setGateEmail(e.target.value)}
                placeholder="Email de administrador"
                className="w-full text-xs pl-9 pr-3 py-2.5 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B4E43]"
              />
            </div>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-[#8A7969] absolute left-3 top-3" />
              <input
                type="password"
                name="lj-admin-pass"
                autoComplete="new-password"
                value={gatePassword}
                onChange={(e) => setGatePassword(e.target.value)}
                placeholder="Contraseña"
                className="w-full text-xs pl-9 pr-3 py-2.5 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B4E43]"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#8A7969] bg-[#FAF5EC] border border-[#E8DFC9] rounded-xl px-3 py-2">
              <div>
                Acceso inicial: <strong>admin@lajoaquina.com</strong> · Clave: <strong>admin1234</strong>
              </div>
              <button
                type="button"
                onClick={() => {
                  setGateEmail('admin@lajoaquina.com');
                  setGatePassword('admin1234');
                }}
                className="ml-2 underline font-bold text-[#1B4E43] hover:text-[#256B5C] cursor-pointer shrink-0"
              >
                Autocompletar
              </button>
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
            <div className={`text-[11px] font-bold rounded-xl px-3 py-2 border ${
              !diag
                ? 'bg-[#FAF5EC] text-[#8A7969] border-[#E8DFC9]'
                : diag.reachable && diag.tables
                ? 'bg-[#E8F3EF] text-[#1B4E43] border-[#BCE0D4]'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              {!diag ? '🟡 Conectando con la nube...' : diag.reachable && diag.tables ? `🟢 ${diag.detail}` : `🔴 ${diag.detail}`}
            </div>
          </form>
          )}
        </motion.div>
      </div>
    );
  }

  const pendingAlerts = alerts.filter((a) => a.status === 'pending').length;
  const pendingOrders = orders.filter((o) => (o.status || 'pendiente') === 'pendiente').length;

  // Permisos por puesto (la dueña ve todo)
  const staffRole = currentUser?.role || 'customer';
  const isOwner = !!currentUser?.isOwner;
  const canProductos = isOwner || staffRole === 'admin' || staffRole === 'stock';
  const canVentas = isOwner || staffRole === 'admin' || staffRole === 'ventas';
  const canComercio = isOwner || staffRole === 'admin';

  const navItems: { id: Tab; icon: React.ReactNode; badge?: number }[] = [
    { id: 'resumen', icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
    ...(canProductos ? [{ id: 'productos' as Tab, icon: <Package className="w-[18px] h-[18px]" />, badge: pendingAlerts }] : []),
    ...(canVentas ? [{ id: 'ventas' as Tab, icon: <ShoppingBag className="w-[18px] h-[18px]" />, badge: pendingOrders }] : []),
    ...(canComercio ? [{ id: 'envios' as Tab, icon: <Truck className="w-[18px] h-[18px]" /> }] : []),
    ...(canComercio ? [{ id: 'herramientas' as Tab, icon: <Wrench className="w-[18px] h-[18px]" /> }] : []),
    ...(isOwner ? [{ id: 'equipo' as Tab, icon: <Users className="w-[18px] h-[18px]" /> }] : []),
  ];

  const allowedTabIds = navItems.map((n) => n.id);
  useEffect(() => {
    if (currentUser && currentUser.role !== 'customer' && !allowedTabIds.includes(tab)) {
      goTab(allowedTabIds[0] || 'resumen');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

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
          {/* Monitor de conexión y estado de sesión en tiempo real */}
          <button
            onClick={() => setShowDiagModal(true)}
            className="w-full text-left bg-black/20 hover:bg-black/30 border border-white/10 rounded-xl p-2.5 transition-colors cursor-pointer"
            title="Clic para ver diagnóstico de sesión y conexión"
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-[#E5D7BF]">
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#EFA332]" />
                Conexión
              </span>
              <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                backendHealth?.connected && !silentFailureDetected
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/50'
                  : 'bg-red-950/80 text-red-300 border border-red-700/50 animate-pulse'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  backendHealth?.connected && !silentFailureDetected ? 'bg-emerald-400' : 'bg-red-400'
                }`} />
                {backendHealth?.connected && !silentFailureDetected
                  ? `${backendHealth?.latencyMs !== undefined ? `${backendHealth.latencyMs}ms` : 'En línea'}`
                  : 'Fallo'}
              </span>
            </div>
            <div className="text-[10px] text-[#8FC0AF] mt-1 truncate">
              {backendHealth?.connected && !silentFailureDetected
                ? `Sync: ${formatTimeAgo(lastSyncTime)}`
                : '⚠️ Backend fallando en 2do plano'}
            </div>
          </button>

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
              <button
                onClick={() => setShowDiagModal(true)}
                className={`p-2 rounded-xl border text-xs cursor-pointer ${
                  backendHealth?.connected && !silentFailureDetected
                    ? 'bg-emerald-950/60 border-emerald-700/50 text-emerald-300'
                    : 'bg-red-950/80 border-red-700/60 text-red-300 animate-pulse'
                }`}
                title="Diagnóstico de conexión"
              >
                {backendHealth?.connected && !silentFailureDetected ? (
                  <Activity className="w-4 h-4 text-emerald-400" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-400" />
                )}
              </button>
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

            {/* Indicador de conexión interactivo */}
            <button
              onClick={() => setShowDiagModal(true)}
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border transition-all cursor-pointer ${
                backendHealth?.connected && !silentFailureDetected
                  ? 'bg-[#E8F3EF] text-[#1B4E43] border-[#BCE0D4] hover:bg-[#D8EDE5]'
                  : 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100 shadow-sm animate-pulse'
              }`}
              title="Clic para ver diagnóstico de sesión y conexión"
            >
              {backendHealth?.connected && !silentFailureDetected ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>
                    {backendHealth?.provider === 'supabase' ? 'Supabase' : 'Backend'}
                    {backendHealth?.latencyMs !== undefined ? ` · ${backendHealth.latencyMs}ms` : ''}
                  </span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  <span>
                    Fallo de conexión{consecutiveFailures > 1 ? ` (${consecutiveFailures})` : ''}
                  </span>
                </>
              )}
            </button>

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

        {/* Alerta visible si la conexión en segundo plano está fallando silenciosamente */}
        {silentFailureDetected && (
          <div className="bg-red-50 border-b border-red-200 px-4 sm:px-6 py-3">
            <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-red-100 rounded-lg shrink-0">
                  <WifiOff className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-red-900">
                    Aviso: La sincronización en segundo plano con el servidor está fallando silenciosamente.
                  </p>
                  <p className="text-[11px] text-red-700">
                    {backendHealth?.error || 'Sin respuesta al actualizar pedidos y productos en vivo.'} · {consecutiveFailures} intento(s) fallido(s).
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <button
                  onClick={() => runFullDiagnostic()}
                  disabled={isDiagnosing}
                  className="text-xs font-bold bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg cursor-pointer transition-colors disabled:opacity-50"
                >
                  {isDiagnosing ? 'Reintentando…' : 'Reintentar ahora'}
                </button>
                <button
                  onClick={() => setShowDiagModal(true)}
                  className="text-xs font-bold text-red-800 underline hover:text-red-950 px-2 py-1.5 cursor-pointer"
                >
                  Ver diagnóstico
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Alerta visible si el token de sesión expiró mientras se navegaba el dashboard */}
        {sessionCheck && (sessionCheck.status === 'expired' || sessionCheck.status === 'invalid') && (
          <div className="bg-amber-50 border-b border-amber-300 px-4 sm:px-6 py-3">
            <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-amber-100 rounded-lg shrink-0">
                  <ShieldAlert className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-950">
                    Tu sesión de administrador ha expirado o el token de acceso es inválido.
                  </p>
                  <p className="text-[11px] text-amber-800">
                    {sessionCheck.detail} · Las modificaciones a productos o pedidos no se guardarán en la base de datos.
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="text-xs font-bold bg-amber-700 hover:bg-amber-800 text-white px-3.5 py-1.5 rounded-lg cursor-pointer transition-colors shrink-0"
              >
                Cerrar e iniciar sesión
              </button>
            </div>
          </div>
        )}

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
              {tab === 'productos' && canProductos && (
                <AdminCatalog
                  products={products}
                  onUpdateProducts={handleUpdateProducts}
                  onExitAdmin={goToStore}
                  currentUser={currentUser}
                  onOpenAuth={() => {}}
                  onLoginSuccess={(u) => setCurrentUser(u)}
                />
              )}
              {tab === 'ventas' && canVentas && (
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
              {tab === 'envios' && canComercio && (
                <AdminShipping settings={settings} onSaved={(s) => { setSettings(s); notify('✅ Comercio y envíos guardados.'); }} />
              )}
              {tab === 'herramientas' && canComercio && (
                <AdminTools products={products} onUpdateProducts={handleUpdateProducts} />
              )}
              {tab === 'equipo' && isOwner && (
                <AdminTeam currentUser={currentUser} notify={notify} />
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

      {/* Modal de Diagnóstico del Sistema, Sesión y Conexión */}
      <AnimatePresence>
        {showDiagModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[#FFFDF9] border border-[#E5D7BF] rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#E8DFC9]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-[#E8F3EF] text-[#1B4E43] rounded-xl">
                    <Activity className="w-5 h-5 text-[#1B4E43]" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-[#1B4E43] font-display">
                      Diagnóstico del Sistema y Conexión
                    </h3>
                    <p className="text-[11px] text-[#8A7969]">
                      Monitoreo del token de sesión y sincronización en segundo plano
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDiagModal(false)}
                  className="p-1.5 rounded-lg hover:bg-black/5 text-[#8A7969] cursor-pointer"
                  title="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 1. Estado del Token de Sesión */}
              <div className="bg-[#FAF5EC] border border-[#E8DFC9] rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#1B4E43]" />
                    <span className="text-xs font-extrabold text-[#2B231D]">Token de Sesión de Administrador</span>
                  </div>
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                    sessionCheck?.status === 'valid'
                      ? 'bg-[#E8F3EF] text-[#1B4E43] border-[#BCE0D4]'
                      : sessionCheck?.status === 'expired' || sessionCheck?.status === 'invalid'
                      ? 'bg-red-100 text-red-800 border-red-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}>
                    {sessionCheck?.status === 'valid'
                      ? '🟢 Válido'
                      : sessionCheck?.status === 'expired'
                      ? '🔴 Expirado'
                      : sessionCheck?.status === 'invalid'
                      ? '🔴 Inválido'
                      : '⚪ Sin verificar'}
                  </span>
                </div>
                <p className="text-[11px] text-[#5A4D3F] leading-relaxed">
                  {sessionCheck?.detail || 'Diagnóstico de sesión verificado al iniciar el dashboard.'}
                </p>
                {sessionCheck?.expiresAt && (
                  <p className="text-[10px] text-[#8A7969] font-mono">
                    Vencimiento del token: {new Date(sessionCheck.expiresAt).toLocaleString('es-AR')}
                  </p>
                )}
                {currentUser && (
                  <div className="text-[11px] text-[#6A5949] pt-1.5 border-t border-[#E8DFC9]/70 flex items-center justify-between">
                    <span>Usuario: <strong>{currentUser.email}</strong></span>
                    <span className="capitalize">Rol: <strong>{currentUser.role}</strong></span>
                  </div>
                )}
                {sessionCheck && (sessionCheck.status === 'expired' || sessionCheck.status === 'invalid') && (
                  <div className="pt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full text-xs font-extrabold bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-xl cursor-pointer transition-colors"
                    >
                      Cerrar sesión e ingresar nuevamente
                    </button>
                  </div>
                )}
              </div>

              {/* 2. Conexión en Segundo Plano (Backend / Supabase) */}
              <div className="bg-[#FAF5EC] border border-[#E8DFC9] rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-[#1B4E43]" />
                    <span className="text-xs font-extrabold text-[#2B231D]">Conexión de Base de Datos / Backend</span>
                  </div>
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                    backendHealth?.connected && !silentFailureDetected
                      ? 'bg-[#E8F3EF] text-[#1B4E43] border-[#BCE0D4]'
                      : 'bg-red-100 text-red-800 border-red-300 animate-pulse'
                  }`}>
                    {backendHealth?.connected && !silentFailureDetected ? '🟢 En línea' : '🔴 Fallo silencioso'}
                  </span>
                </div>
                <p className="text-[11px] text-[#5A4D3F] leading-relaxed">
                  Proveedor: <strong>{backendHealth?.provider === 'supabase' ? 'Supabase (Nube)' : 'Servidor Express'}</strong>
                </p>
                {backendHealth?.latencyMs !== undefined && (
                  <p className="text-[11px] text-[#5A4D3F]">
                    Latencia de respuesta: <strong>{backendHealth.latencyMs} ms</strong>
                  </p>
                )}
                {backendHealth?.error && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-800 font-mono">
                    Detalle del error: {backendHealth.error}
                  </div>
                )}
                <div className="text-[11px] text-[#6A5949] pt-1.5 border-t border-[#E8DFC9]/70 flex items-center justify-between">
                  <span>Última sincronización exitosa:</span>
                  <span className="font-bold text-[#1B4E43]">{formatTimeAgo(lastSyncTime)}</span>
                </div>
                {consecutiveFailures > 0 && (
                  <div className="text-[10px] text-red-700 font-bold">
                    ⚠️ {consecutiveFailures} intento(s) consecutivos sin respuesta del backend.
                  </div>
                )}
              </div>

              {/* 3. Canales de Sincronización en Vivo */}
              <div className="bg-[#FAF5EC] border border-[#E8DFC9] rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-[#1B4E43]" />
                  <span className="text-xs font-extrabold text-[#2B231D]">Canales Activos en Vivo</span>
                </div>
                <ul className="text-[11px] text-[#6A5949] space-y-1.5 pl-1">
                  <li className="flex items-center justify-between">
                    <span>• Sondeo en segundo plano:</span>
                    <strong className="text-emerald-700">Activo (cada 4s)</strong>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>• Sincronización multiventana:</span>
                    <strong className="text-emerald-700">BroadcastChannel ('la_joaquina_sync')</strong>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>• Alarma de nuevos pedidos:</span>
                    <strong className="text-emerald-700">Sonido habilitado</strong>
                  </li>
                </ul>
              </div>

              {/* Acciones */}
              <div className="pt-2 flex items-center justify-between gap-2">
                <button
                  onClick={runFullDiagnostic}
                  disabled={isDiagnosing}
                  className="bg-[#1B4E43] hover:bg-[#256B5C] text-white text-xs font-extrabold px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isDiagnosing ? 'animate-spin' : ''}`} />
                  {isDiagnosing ? 'Comprobando en vivo…' : 'Ejecutar prueba ahora'}
                </button>
                <button
                  onClick={() => setShowDiagModal(false)}
                  className="bg-white hover:bg-black/5 text-[#5A4D3F] border border-[#E8DFC9] text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
