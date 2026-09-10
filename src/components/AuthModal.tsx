import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Mail,
  User as UserIcon,
  AlertCircle,
  CheckCircle2,
  ShoppingBag,
} from 'lucide-react';
import { AuthUserProfile, cloudRegister } from '../lib/cloudDb';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUserProfile | null;
  onLoginSuccess: (user: AuthUserProfile) => void;
  onLogout: () => void;
}

// Cuenta de cliente simple: nombre + email (sin contraseñas).
// Sirve para autocompletar el checkout. El acceso admin vive solo en admin.html.
export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  onLogout,
}) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !name.trim()) {
      setErrorMsg('Completá tu nombre y email para continuar.');
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    try {
      const user = await cloudRegister(name.trim(), email.trim().toLowerCase());
      onLoginSuccess(user);
      onClose();
    } catch (err: any) {
      // Sin red igual se guarda local para autocompletar el checkout
      onLoginSuccess({
        id: `user-${Date.now()}`,
        email: email.trim().toLowerCase(),
        name: name.trim(),
        role: 'customer',
      });
      onClose();
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
        className="bg-[#FFFDF9] border border-[#E5D7BF] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative"
      >
        <div className="bg-[#1B4E43] text-white p-5 sm:p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <h3 className="text-xl font-bold font-display">
            {currentUser ? 'Mis datos' : 'Identificate para comprar'}
          </h3>
          <p className="text-xs text-[#D3E5DE] mt-1">
            {currentUser
              ? 'Usamos estos datos para autocompletar tus pedidos.'
              : 'Guardamos tu nombre y email para acelerar el checkout. Sin contraseñas.'}
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
              <button
                onClick={onLogout}
                className="w-full bg-[#FAF5EC] hover:bg-[#EFE8D8] text-[#DE5D4E] text-xs font-bold py-2.5 px-4 rounded-xl border border-[#E3D6BE] transition-colors cursor-pointer"
              >
                Borrar mis datos
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-[#5B4E41] mb-1">Nombre y apellido</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-[#8A7969] absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Mariano González"
                    className="w-full text-xs pl-9 pr-3 py-2.5 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B4E43]"
                  />
                </div>
              </div>
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
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1B4E43] hover:bg-[#256B5C] text-white font-bold text-xs py-3 rounded-xl transition-colors font-display cursor-pointer flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{loading ? 'Guardando...' : 'Guardar y seguir comprando'}</span>
              </button>
            </form>
          )}

          <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-[#8A7969]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#256B5C]" />
            Tus pedidos se confirman por WhatsApp
          </p>
        </div>
      </motion.div>
    </div>
  );
};
