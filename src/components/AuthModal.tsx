import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Mail, 
  Lock, 
  User as UserIcon, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Cloud,
  ArrowRight,
  Sparkles,
  KeyRound,
  RefreshCw,
  ShoppingBag
} from 'lucide-react';
import { 
  AuthUserProfile, 
  cloudLogin, 
  cloudRegister, 
  checkCloudDbStatus,
  CloudDbStatus 
} from '../lib/cloudDb';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUserProfile | null;
  onLoginSuccess: (user: AuthUserProfile) => void;
  onLogout: () => void;
  onOpenAdminPanel?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  onLogout,
  onOpenAdminPanel,
}) => {
  // Mode selection: 'customer' or 'admin'
  const [activeTab, setActiveTab] = useState<'customer' | 'admin'>('customer');
  const [customerSubMode, setCustomerSubMode] = useState<'login' | 'register'>('login');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [adminPin, setAdminPin] = useState('admin123');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<CloudDbStatus | null>(null);

  useEffect(() => {
    if (isOpen) {
      checkCloudDbStatus().then(setDbStatus);
      // Pre-select admin tab if user has admin role or was navigating to admin
      if (currentUser?.role === 'admin') {
        setActiveTab('admin');
      }
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  // Handle Customer Form
  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (customerSubMode === 'login') {
        const user = await cloudLogin(email, password, 'customer');
        onLoginSuccess(user);
        onClose();
      } else {
        const user = await cloudRegister(name, email, password);
        setSuccessMsg('¡Cuenta creada y guardada en la base de datos en la nube!');
        onLoginSuccess(user);
        setTimeout(() => onClose(), 800);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al conectar con la base de datos en la nube.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Direct Admin Login / Alternator
  const handleAdminAccess = async (quick: boolean = false) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const pinToUse = quick ? 'admin123' : adminPin;
      const adminUser = await cloudLogin('admin@lajuaquina.com', pinToUse, 'admin');
      onLoginSuccess(adminUser);
      setSuccessMsg('¡Modo Administrador activado con éxito!');
      
      setTimeout(() => {
        onClose();
        if (onOpenAdminPanel) {
          onOpenAdminPanel();
        }
      }, 500);
    } catch (err: any) {
      setErrorMsg('No se pudo validar el acceso de administrador.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle user role between Admin and Customer
  const handleToggleUserRole = async () => {
    if (!currentUser) return;
    const newRole = currentUser.role === 'admin' ? 'customer' : 'admin';
    const updatedUser = await cloudLogin(currentUser.email, undefined, newRole);
    onLoginSuccess(updatedUser);
    setSuccessMsg(`Rol alternado a: ${newRole === 'admin' ? 'Administrador 👑' : 'Cliente 👤'}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        className="bg-[#FFFDF9] border border-[#E5D7BF] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative"
      >
        {/* Header */}
        <div className="bg-[#1B4E43] text-white p-5 sm:p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2 mb-1.5 text-[#FFE194] text-xs font-bold uppercase tracking-wider">
            <Cloud className="w-4 h-4 text-[#FFE194]" />
            <span>Base de Datos en la Nube Gratuita</span>
          </div>

          <h3 className="text-xl font-bold font-display">
            {currentUser ? 'Gestión de Cuenta y Sesión' : 'Ingreso & Alternancia de Acceso'}
          </h3>
          <p className="text-xs text-[#D3E5DE] mt-1">
            {currentUser
              ? `Sesión activa como: ${currentUser.name || currentUser.email}`
              : 'Seleccioná si querés ingresar como Cliente o alternar al Modo Administrador.'}
          </p>
        </div>

        {/* Cloud Database Live Status Banner */}
        <div className="bg-[#FAF5EC] border-b border-[#E8DFC9] px-5 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-[#256B5C]" />
            <span className="text-[#5A4D3F] font-semibold">Cloud DB:</span>
            <span className="text-[#8A7969] text-[11px]">
              {dbStatus?.provider || 'Google Cloud Run Storage'}
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#256B5C] bg-[#E8F3EF] px-2.5 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3 text-[#256B5C]" />
            100% Operativa y Gratuita
          </span>
        </div>

        {/* Tab switcher: Alternador de Modo (Cliente vs Administrador) */}
        {!currentUser && (
          <div className="p-3 bg-[#F4EDE0] border-b border-[#E8DFC9]">
            <div className="grid grid-cols-2 p-1 bg-[#EBE1CF] rounded-2xl gap-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('customer');
                  setErrorMsg(null);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'customer'
                    ? 'bg-[#FFFDF9] text-[#1B4E43] shadow-xs'
                    : 'text-[#6A5949] hover:text-[#1E170E]'
                }`}
              >
                <UserIcon className="w-4 h-4" />
                <span>Acceso Clientes</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('admin');
                  setErrorMsg(null);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-[#1B4E43] text-[#FFE194] shadow-xs'
                    : 'text-[#6A5949] hover:text-[#1E170E]'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-[#EFA332]" />
                <span>👑 Alternar Admin</span>
              </button>
            </div>
          </div>
        )}

        {/* Body Content */}
        <div className="p-5 sm:p-6">
          {currentUser ? (
            /* Logged-In View with Role Alternator */
            <div className="space-y-4">
              <div className="bg-[#FAF5EC] p-4 rounded-2xl border border-[#E3D6BE] flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#1B4E43] text-[#FFE194] flex items-center justify-center font-bold text-lg shadow-xs">
                  {currentUser.role === 'admin' ? '👑' : (currentUser.name || currentUser.email)[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-[#1B4E43] truncate">
                    {currentUser.name || 'Usuario'}
                  </h4>
                  <p className="text-xs text-[#6A5949] truncate">{currentUser.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-block text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                      currentUser.role === 'admin'
                        ? 'bg-[#FFF3D6] text-[#8C5800] border border-[#EFA332]/40'
                        : 'bg-[#E8F3EF] text-[#1B4E43]'
                    }`}>
                      {currentUser.role === 'admin' ? '👑 Modo Administrador' : '👤 Modo Cliente'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botón de alternancia rápida de rol */}
              <div className="bg-[#FFF8E6] p-3 rounded-xl border border-[#EFA332]/50 flex items-center justify-between gap-2">
                <div className="text-xs text-[#8C5800]">
                  <p className="font-bold">Alternar Rol de Sesión</p>
                  <p className="text-[11px] text-[#A66F0C]">
                    Cambiá entre Administrador y Cliente en 1 clic
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleUserRole}
                  className="px-3 py-1.5 bg-[#EFA332] hover:bg-[#E39420] text-[#1E170E] font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Alternar</span>
                </button>
              </div>

              {/* Admin Panel button */}
              {currentUser.role === 'admin' && onOpenAdminPanel && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenAdminPanel();
                  }}
                  className="w-full bg-[#1B4E43] hover:bg-[#256B5C] text-white text-xs font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-display transition-colors cursor-pointer shadow-xs"
                >
                  <ShieldCheck className="w-4 h-4 text-[#EFA332]" />
                  <span>Ir al Panel de Edición de Catálogo</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {/* Logout button */}
              <button
                onClick={onLogout}
                className="w-full bg-[#FAF5EC] hover:bg-[#EFE8D8] text-[#DE5D4E] text-xs font-bold py-2.5 px-4 rounded-xl border border-[#E3D6BE] transition-colors cursor-pointer"
              >
                Cerrar Sesión
              </button>
            </div>
          ) : activeTab === 'admin' ? (
            /* Admin Login / Alternator View */
            <div className="space-y-4">
              <div className="bg-[#FFF8E6] border border-[#EFA332]/50 p-4 rounded-2xl">
                <div className="flex items-center gap-2 text-[#8C5800] font-bold text-xs mb-1">
                  <ShieldCheck className="w-4 h-4 text-[#EFA332]" />
                  <span>Panel de Control & Catálogo</span>
                </div>
                <p className="text-xs text-[#6B4B14] leading-relaxed">
                  Permite modificar precios, stock, pesos, fotos y ver pedidos recibidos directamente en la nube.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Quick 1-Click Instant Admin Entry */}
              <button
                type="button"
                onClick={() => handleAdminAccess(true)}
                disabled={loading}
                className="w-full bg-[#1B4E43] hover:bg-[#256B5C] text-[#FFE194] font-extrabold text-xs py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#EFA332]" />
                <span>⚡ Ingresar como Administrador (1 Clic)</span>
              </button>

              {/* Or using PIN / Password */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-[#E8DFC9]"></div>
                <span className="flex-shrink mx-2 text-[10px] uppercase font-bold text-[#8A7969]">
                  O con Clave de Administrador
                </span>
                <div className="flex-grow border-t border-[#E8DFC9]"></div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5B4E41] mb-1">
                  Clave / PIN de Admin (Predeterminada: admin123)
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#8A7969] absolute left-3 top-3" />
                  <input
                    type="password"
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    placeholder="admin123"
                    className="w-full text-xs pl-9 pr-3 py-2.5 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B4E43]"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleAdminAccess(false)}
                disabled={loading}
                className="w-full bg-[#EFA332] hover:bg-[#E39420] text-[#1E170E] font-bold text-xs py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                Validar y Entrar como Administrador
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('customer')}
                className="w-full text-center text-xs text-[#1B4E43] font-bold hover:underline cursor-pointer"
              >
                ← Volver a acceso de Cliente
              </button>
            </div>
          ) : (
            /* Customer View */
            <>
              {errorMsg && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleCustomerSubmit} className="space-y-3">
                {customerSubMode === 'register' && (
                  <div>
                    <label className="block text-xs font-bold text-[#5B4E41] mb-1">
                      Nombre Completo
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-[#8A7969] absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ej: Mariano Agustín"
                        className="w-full text-xs pl-9 pr-3 py-2.5 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B4E43]"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[#5B4E41] mb-1">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#8A7969] absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      className="w-full text-xs pl-9 pr-3 py-2.5 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B4E43]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5B4E41] mb-1">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#8A7969] absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full text-xs pl-9 pr-3 py-2.5 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B4E43]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1B4E43] hover:bg-[#256B5C] text-white font-bold text-xs py-3 rounded-xl transition-colors font-display shadow-sm cursor-pointer mt-1"
                >
                  {loading
                    ? 'Procesando en la Nube...'
                    : customerSubMode === 'login'
                    ? 'Iniciar Sesión Cliente'
                    : 'Crear mi Cuenta Cliente'}
                </button>
              </form>

              {/* Mode switch */}
              <div className="mt-3 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setSuccessMsg(null);
                    setCustomerSubMode(customerSubMode === 'login' ? 'register' : 'login');
                  }}
                  className="text-xs text-[#1B4E43] hover:underline font-bold cursor-pointer"
                >
                  {customerSubMode === 'login'
                    ? '¿No tenés cuenta? Registrate acá'
                    : '¿Ya tenés cuenta? Iniciá sesión'}
                </button>
              </div>

              {/* Quick access pills */}
              <div className="mt-4 pt-3 border-t border-[#EFE8D8]">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      cloudLogin('mariano@cliente.com', 'cliente123', 'customer').then(u => {
                        onLoginSuccess(u);
                        onClose();
                      });
                    }}
                    className="p-2 text-[11px] font-bold rounded-lg border border-[#E3D6BE] bg-[#FAF5EC] hover:bg-[#F2ECE0] text-[#3D3025] transition-colors cursor-pointer"
                  >
                    👤 Entrar como Cliente Demo
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('admin')}
                    className="p-2 text-[11px] font-bold rounded-lg border border-[#EFA332] bg-[#FFF8E6] hover:bg-[#FFECC2] text-[#8C5800] transition-colors cursor-pointer"
                  >
                    👑 Alternar a Admin
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};
