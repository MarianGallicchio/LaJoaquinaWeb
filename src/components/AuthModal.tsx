import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  AlertCircle,
  CheckCircle2,
  ShoppingBag,
  Package,
} from 'lucide-react';
import {
  AuthUserProfile,
  customerLogin,
  customerRegister,
  fetchMyOrders,
  supaMode,
} from '../lib/cloudDb';
import { OrderDetails } from '../types';
import { formatARS } from '../lib/storeSettings';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUserProfile | null;
  onLoginSuccess: (user: AuthUserProfile) => void;
  onLogout: () => void;
}

// Cuenta de cliente: registro/login con email + contraseña (nube) o
// perfil simple (sin nube). Guarda el historial de transacciones.
export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  onLogout,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [myOrders, setMyOrders] = useState<OrderDetails[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const cloud = supaMode();

  useEffect(() => {
    if (isOpen && currentUser?.email) {
      setLoadingOrders(true);
      fetchMyOrders(currentUser.email)
        .then(setMyOrders)
        .catch(() => setMyOrders([]))
        .finally(() => setLoadingOrders(false));
    } else if (!isOpen) {
      setErrorMsg(null);
    }
  }, [isOpen, currentUser?.email]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Ingresá tu email para continuar.');
      return;
    }
    if (cloud && (mode === 'register' ? !name.trim() || !password : !password)) {
      setErrorMsg(mode === 'register' ? 'Completá nombre, email y una contraseña.' : 'Ingresá tu contraseña.');
      return;
    }
    if (cloud && password && password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    try {
      const user =
        mode === 'login'
          ? await customerLogin(email.trim(), password)
          : await customerRegister(name.trim(), email.trim(), password);
      onLoginSuccess(user);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo ingresar. Probá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        className="bg-[#FFFDF9] border border-[#E5D7BF] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative max-h-[90vh] overflow-y-auto"
      >
        <div className="bg-[#1B4E43] text-white p-5 sm:p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <h3 className="text-xl font-bold font-display">
            {currentUser ? 'Mi cuenta' : mode === 'login' ? 'Ingresar' : 'Crear mi cuenta'}
          </h3>
          <p className="text-xs text-[#D3E5DE] mt-1">
            {currentUser
              ? 'Tus datos y tu historial de compras.'
              : cloud
              ? 'Guardá tus pedidos y mirá tu historial en cualquier dispositivo.'
              : 'Guardamos tus datos para acelerar tus compras en este dispositivo.'}
          </p>
        </div>

        <div className="p-5 sm:p-6">
          {currentUser ? (
            <div className="space-y-4">
              <div className="bg-[#FAF5EC] p-4 rounded-2xl border border-[#E3D6BE] flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#1B4E43] text-[#FFE194] flex items-center justify-center font-bold text-lg shrink-0">
                  {(currentUser.name || currentUser.email)[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-[#1B4E43] truncate">{currentUser.name || 'Cliente'}</h4>
                  <p className="text-xs text-[#6A5949] truncate">{currentUser.email}</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#8A7969] mb-2 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" /> Historial de transacciones
                </h4>
                {loadingOrders ? (
                  <p className="text-xs text-[#8A7969]">Cargando tus pedidos...</p>
                ) : myOrders.length === 0 ? (
                  <p className="text-xs text-[#8A7969] bg-[#FAF5EC] border border-[#EFE8D8] rounded-xl p-3">
                    Todavía no tenés compras. Cuando compres, aparecen acá con su estado.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {myOrders.map((o) => (
                      <div key={o.orderId} className="bg-[#FAF5EC] border border-[#E8DFC9] rounded-xl px-3 py-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <strong className="text-[#1B4E43]">{o.orderId}</strong>
                          <span className="font-black text-[#1B4E43]">{formatARS(o.total)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5 text-[11px] text-[#6A5949]">
                          <span>{o.createdAt}</span>
                          <span className="font-bold uppercase">{o.status || 'pendiente'}</span>
                        </div>
                        <p className="text-[11px] text-[#8A7969] truncate mt-0.5">
                          {(o.items || []).map((i) => `${i.product.name} x${i.quantity}`).join(' · ')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={onLogout}
                className="w-full bg-[#FAF5EC] hover:bg-[#EFE8D8] text-[#DE5D4E] text-xs font-bold py-2.5 px-4 rounded-xl border border-[#E3D6BE] transition-colors cursor-pointer"
              >
                Cerrar sesión
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 p-1 bg-[#EBE1CF] rounded-2xl gap-1 mb-4">
                {(['login', 'register'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setMode(m);
                      setErrorMsg(null);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      mode === m ? 'bg-[#FFFDF9] text-[#1B4E43] shadow-xs' : 'text-[#6A5949]'
                    }`}
                  >
                    {m === 'login' ? 'Ya tengo cuenta' : 'Crear cuenta'}
                  </button>
                ))}
              </div>

              {errorMsg && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                {mode === 'register' && (
                  <div>
                    <label className="block text-xs font-bold text-[#5B4E41] mb-1">Nombre y apellido</label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-[#8A7969] absolute left-3 top-3" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ej: Mariano González"
                        className="w-full text-xs pl-9 pr-3 py-2.5 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B4E43]"
                      />
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-[#5B4E41] mb-1">Email</label>
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
                {cloud && (
                  <div>
                    <label className="block text-xs font-bold text-[#5B4E41] mb-1">Contraseña</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#8A7969] absolute left-3 top-3" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : 'Tu contraseña'}
                        className="w-full text-xs pl-9 pr-3 py-2.5 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B4E43]"
                      />
                    </div>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1B4E43] hover:bg-[#256B5C] text-white font-bold text-xs py-3 rounded-xl transition-colors font-display cursor-pointer flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{loading ? 'Procesando...' : mode === 'login' ? 'Ingresar' : 'Crear mi cuenta'}</span>
                </button>
              </form>

              <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-[#8A7969]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#256B5C]" />
                {cloud ? 'Tu historial se guarda en la nube, en todos tus dispositivos' : 'Tus pedidos se confirman por WhatsApp'}
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};
