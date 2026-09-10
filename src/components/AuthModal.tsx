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
  MapPin,
  CreditCard,
  Heart,
  Phone,
  PawPrint,
  Plus,
  Trash2,
  Star,
  RotateCcw,
} from 'lucide-react';
import {
  AuthUserProfile,
  customerLogin,
  customerRegister,
  fetchMyOrders,
  supaMode,
} from '../lib/cloudDb';
import { OrderDetails, Product, CustomerProfileData, CustomerAddress, PaymentMethodId } from '../types';
import { formatARS } from '../lib/storeSettings';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUserProfile | null;
  onLoginSuccess: (user: AuthUserProfile) => void;
  onLogout: () => void;
  profile: CustomerProfileData | null;
  onSaveProfile: (p: CustomerProfileData, silent?: boolean) => void;
  products: Product[];
  onReorder: (o: OrderDetails) => void;
  onQuickAdd: (p: Product) => void;
}

type PanelTab = 'datos' | 'direcciones' | 'pagos' | 'pedidos' | 'favoritos';

// Panel de cuenta del cliente: datos, direcciones, pago favorito,
// historial con volver a pedir y favoritos.
export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  onLogout,
  profile,
  onSaveProfile,
  products,
  onReorder,
  onQuickAdd,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [myOrders, setMyOrders] = useState<OrderDetails[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [tab, setTab] = useState<PanelTab>('pedidos');

  // Form datos
  const [fName, setFName] = useState('');
  const [fPhone, setFPhone] = useState('');
  const [fPetName, setFPetName] = useState('');
  const [fPetInfo, setFPetInfo] = useState('');
  // Form dirección
  const [editingAddr, setEditingAddr] = useState<string | null>(null);
  const [aLabel, setALabel] = useState('Casa');
  const [aStreet, setAStreet] = useState('');
  const [aCity, setACity] = useState('');
  const [aNotes, setANotes] = useState('');
  const [showAddrForm, setShowAddrForm] = useState(false);

  const cloud = supaMode();

  useEffect(() => {
    if (isOpen && currentUser?.email) {
      setLoadingOrders(true);
      fetchMyOrders(currentUser.email)
        .then(setMyOrders)
        .catch(() => setMyOrders([]))
        .finally(() => setLoadingOrders(false));
    }
    if (isOpen) {
      setErrorMsg(null);
      if (profile) {
        setFName(profile.name || '');
        setFPhone(profile.phone || '');
        setFPetName(profile.petName || '');
        setFPetInfo(profile.petInfo || '');
      }
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
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo ingresar. Probá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const saveDatos = () => {
    if (!profile) return;
    onSaveProfile({ ...profile, name: fName.trim(), phone: fPhone.trim(), petName: fPetName.trim(), petInfo: fPetInfo.trim() });
  };

  const resetAddrForm = () => {
    setEditingAddr(null);
    setALabel('Casa');
    setAStreet('');
    setACity('');
    setANotes('');
    setShowAddrForm(false);
  };

  const saveAddress = () => {
    if (!profile || !aStreet.trim()) return;
    const addr: CustomerAddress = {
      id: editingAddr || `addr-${Date.now()}`,
      label: aLabel.trim() || 'Casa',
      street: aStreet.trim(),
      city: aCity.trim(),
      notes: aNotes.trim(),
      isDefault: editingAddr
        ? profile.addresses.find((a) => a.id === editingAddr)?.isDefault
        : profile.addresses.length === 0,
    };
    const addresses = editingAddr
      ? profile.addresses.map((a) => (a.id === editingAddr ? addr : a))
      : [...profile.addresses, addr];
    onSaveProfile({ ...profile, addresses });
    resetAddrForm();
  };

  const removeAddress = (id: string) => {
    if (!profile) return;
    const addresses = profile.addresses.filter((a) => a.id !== id);
    if (addresses.length > 0 && !addresses.some((a) => a.isDefault)) addresses[0].isDefault = true;
    onSaveProfile({ ...profile, addresses });
  };

  const setDefaultAddr = (id: string) => {
    if (!profile) return;
    onSaveProfile({ ...profile, addresses: profile.addresses.map((a) => ({ ...a, isDefault: a.id === id })) });
  };

  const startEditAddr = (a: CustomerAddress) => {
    setEditingAddr(a.id);
    setALabel(a.label);
    setAStreet(a.street);
    setACity(a.city);
    setANotes(a.notes || '');
    setShowAddrForm(true);
  };

  const favProducts = profile ? products.filter((p) => profile.favorites.includes(p.id)) : [];

  const removeFav = (id: string) => {
    if (!profile) return;
    onSaveProfile({ ...profile, favorites: profile.favorites.filter((f) => f !== id) });
  };

  const tabs: { id: PanelTab; label: string; icon: React.ReactNode }[] = [
    { id: 'pedidos', label: 'Pedidos', icon: <Package className="w-3.5 h-3.5" /> },
    { id: 'datos', label: 'Datos', icon: <UserIcon className="w-3.5 h-3.5" /> },
    { id: 'direcciones', label: 'Direcciones', icon: <MapPin className="w-3.5 h-3.5" /> },
    { id: 'pagos', label: 'Pagos', icon: <CreditCard className="w-3.5 h-3.5" /> },
    { id: 'favoritos', label: `Favoritos${profile && profile.favorites.length > 0 ? ` (${profile.favorites.length})` : ''}`, icon: <Heart className="w-3.5 h-3.5" /> },
  ];

  const PAY_METHODS: { id: PaymentMethodId; label: string; desc: string }[] = [
    { id: 'mercadopago', label: 'Mercado Pago online', desc: 'Tarjetas, débito y dinero en cuenta' },
    { id: 'transferencia', label: 'Transferencia', desc: 'Con descuento extra' },
    { id: 'efectivo', label: 'Efectivo', desc: 'Contra entrega' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        className="bg-[#FFFDF9] border border-[#E5D7BF] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative max-h-[92vh] flex flex-col"
      >
        <div className="bg-[#1B4E43] text-white p-5 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <h3 className="text-xl font-bold font-display">
            {currentUser ? `Hola, ${(currentUser.name || 'cliente').split(' ')[0]} 👋` : mode === 'login' ? 'Ingresar' : 'Crear mi cuenta'}
          </h3>
          <p className="text-xs text-[#D3E5DE] mt-1">
            {currentUser
              ? currentUser.email
              : cloud
              ? 'Tu cuenta, tus direcciones y tu historial en todos tus dispositivos.'
              : 'Tus datos para comprar más rápido en este dispositivo.'}
          </p>
        </div>

        {!currentUser ? (
          <div className="p-5 sm:p-6 overflow-y-auto">
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
          </div>
        ) : (
          <>
            <div className="flex gap-1.5 px-4 pt-3 overflow-x-auto no-scrollbar shrink-0">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-2 rounded-xl whitespace-nowrap cursor-pointer transition-colors ${
                    tab === t.id ? 'bg-[#1B4E43] text-white' : 'bg-[#FAF5EC] text-[#5A4D3F] border border-[#E3D6BE]'
                  }`}
                >
                  {t.icon}
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto flex-1">
              {tab === 'pedidos' && (
                <div className="space-y-2">
                  {loadingOrders ? (
                    <p className="text-xs text-[#8A7969]">Cargando tus pedidos...</p>
                  ) : myOrders.length === 0 ? (
                    <p className="text-xs text-[#8A7969] bg-[#FAF5EC] border border-[#EFE8D8] rounded-xl p-3">
                      Todavía no tenés compras. Cuando compres, aparecen acá con su estado y el botón para repetir.
                    </p>
                  ) : (
                    myOrders.map((o) => (
                      <div key={o.orderId} className="bg-[#FAF5EC] border border-[#E8DFC9] rounded-2xl p-3 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <strong className="text-[#1B4E43]">{o.orderId}</strong>
                          <strong className="text-[#1B4E43]">{formatARS(o.total)}</strong>
                        </div>
                        <p className="text-[11px] text-[#6A5949] mt-0.5">
                          {o.createdAt} · <span className="font-bold uppercase">{o.status || 'pendiente'}</span>
                        </p>
                        <p className="text-[11px] text-[#8A7969] truncate mt-0.5">
                          {(o.items || []).map((i) => `${i.product.name} x${i.quantity}`).join(' · ')}
                        </p>
                        <button
                          onClick={() => {
                            onReorder(o);
                            onClose();
                          }}
                          className="mt-2 w-full inline-flex items-center justify-center gap-1.5 bg-[#EFA332] hover:bg-[#E39420] text-[#1E170E] font-bold text-xs px-3 py-2 rounded-xl cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Volver a pedir
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {tab === 'datos' && (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-[#5B4E41] mb-1">Nombre y apellido</label>
                    <input value={fName} onChange={(e) => setFName(e.target.value)} className="w-full p-2.5 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl outline-none" />
                  </div>
                  <div>
                    <label className="block font-bold text-[#5B4E41] mb-1">Email</label>
                    <input value={currentUser.email} disabled className="w-full p-2.5 bg-[#F3EFE6] border border-[#E3D6BE] rounded-xl outline-none text-[#8A7969]" />
                  </div>
                  <div>
                    <label className="block font-bold text-[#5B4E41] mb-1">WhatsApp</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-[#8A7969] absolute left-3 top-3" />
                      <input value={fPhone} onChange={(e) => setFPhone(e.target.value)} placeholder="11 2345 6789" className="w-full p-2.5 pl-9 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-[#5B4E41] mb-1">Mascota</label>
                      <div className="relative">
                        <PawPrint className="w-4 h-4 text-[#8A7969] absolute left-3 top-3" />
                        <input value={fPetName} onChange={(e) => setFPetName(e.target.value)} placeholder="Ej: Teo" className="w-full p-2.5 pl-9 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block font-bold text-[#5B4E41] mb-1">Especie / raza</label>
                      <input value={fPetInfo} onChange={(e) => setFPetInfo(e.target.value)} placeholder="Ej: Caniche, 3 años" className="w-full p-2.5 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl outline-none" />
                    </div>
                  </div>
                  <button onClick={saveDatos} className="w-full bg-[#1B4E43] hover:bg-[#256B5C] text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer">
                    Guardar datos
                  </button>
                </div>
              )}

              {tab === 'direcciones' && (
                <div className="space-y-2.5 text-xs">
                  {(profile?.addresses || []).map((a) => (
                    <div key={a.id} className={`border rounded-2xl p-3 ${a.isDefault ? 'border-[#1B4E43] bg-[#E8F3EF]/50' : 'border-[#E8DFC9] bg-[#FAF5EC]'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-[#1B4E43]">{a.label} {a.isDefault && <span className="text-[10px] bg-[#1B4E43] text-white px-1.5 py-0.5 rounded-full ml-1">Principal</span>}</strong>
                        <div className="flex gap-1">
                          {!a.isDefault && (
                            <button onClick={() => setDefaultAddr(a.id)} className="text-[11px] font-bold text-[#1B4E43] hover:underline cursor-pointer" title="Usar como predeterminada">
                              <Star className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => startEditAddr(a)} className="text-[11px] font-bold text-[#1B4E43] hover:underline cursor-pointer">Editar</button>
                          <button onClick={() => removeAddress(a.id)} className="text-red-500 hover:text-red-700 cursor-pointer" title="Eliminar">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[#5A4D3F] mt-1">{a.street}{a.city ? `, ${a.city}` : ''}</p>
                      {a.notes && <p className="text-[11px] text-[#8A7969]">{a.notes}</p>}
                    </div>
                  ))}
                  {(profile?.addresses || []).length === 0 && !showAddrForm && (
                    <p className="text-[#8A7969] bg-[#FAF5EC] border border-[#EFE8D8] rounded-xl p-3">
                      Guardá tu dirección y el checkout se completa solo.
                    </p>
                  )}
                  {!showAddrForm ? (
                    <button onClick={() => setShowAddrForm(true)} className="w-full inline-flex items-center justify-center gap-1.5 border-2 border-dashed border-[#CBB99C] text-[#5A4D3F] font-bold text-xs px-3 py-2.5 rounded-xl cursor-pointer hover:border-[#1B4E43]">
                      <Plus className="w-4 h-4" /> Agregar dirección
                    </button>
                  ) : (
                    <div className="bg-[#FAF5EC] border border-[#E3D6BE] rounded-2xl p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-bold text-[#5B4E41] mb-1">Nombre</label>
                          <input value={aLabel} onChange={(e) => setALabel(e.target.value)} placeholder="Casa" className="w-full p-2 bg-white border border-[#E3D6BE] rounded-xl outline-none" />
                        </div>
                        <div>
                          <label className="block font-bold text-[#5B4E41] mb-1">Localidad</label>
                          <input value={aCity} onChange={(e) => setACity(e.target.value)} placeholder="Bella Vista" className="w-full p-2 bg-white border border-[#E3D6BE] rounded-xl outline-none" />
                        </div>
                      </div>
                      <div>
                        <label className="block font-bold text-[#5B4E41] mb-1">Calle, altura, piso</label>
                        <input value={aStreet} onChange={(e) => setAStreet(e.target.value)} placeholder="Av. Mitre 452, 2° B" className="w-full p-2 bg-white border border-[#E3D6BE] rounded-xl outline-none" />
                      </div>
                      <div>
                        <label className="block font-bold text-[#5B4E41] mb-1">Aclaraciones (opcional)</label>
                        <input value={aNotes} onChange={(e) => setANotes(e.target.value)} placeholder="Timbre, portería..." className="w-full p-2 bg-white border border-[#E3D6BE] rounded-xl outline-none" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={resetAddrForm} className="flex-1 py-2 text-[#7A6A59] font-bold cursor-pointer">Cancelar</button>
                        <button onClick={saveAddress} disabled={!aStreet.trim()} className="flex-1 bg-[#1B4E43] text-white font-bold py-2 rounded-xl cursor-pointer disabled:opacity-40">
                          {editingAddr ? 'Guardar cambios' : 'Agregar'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === 'pagos' && (
                <div className="space-y-2 text-xs">
                  <p className="text-[#6A5949]">Elegí cómo pagar por defecto: el checkout ya viene seleccionado.</p>
                  {PAY_METHODS.map((m) => {
                    const active = (profile?.defaultPayment || 'transferencia') === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => profile && onSaveProfile({ ...profile, defaultPayment: m.id })}
                        className={`w-full text-left p-3 rounded-2xl border cursor-pointer transition-all ${
                          active ? 'border-[#1B4E43] bg-[#E8F3EF] ring-1 ring-[#1B4E43]' : 'border-[#E3D6BE] bg-[#FAF5EC]'
                        }`}
                      >
                        <span className="font-bold text-[#1B4E43] block">{m.label}</span>
                        <span className="text-[11px] text-[#6A5949]">{m.desc}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {tab === 'favoritos' && (
                <div className="space-y-2">
                  {favProducts.length === 0 ? (
                    <p className="text-xs text-[#8A7969] bg-[#FAF5EC] border border-[#EFE8D8] rounded-xl p-3">
                      Tocá el 🤍 en cualquier producto para guardarlo acá.
                    </p>
                  ) : (
                    favProducts.map((p) => {
                      const v = p.variants.find((x) => x.inStock !== false) || p.variants[0];
                      return (
                        <div key={p.id} className="flex items-center gap-2.5 bg-[#FAF5EC] border border-[#E8DFC9] rounded-2xl p-2.5">
                          <img src={p.image} alt={p.name} className="w-12 h-12 rounded-xl object-cover bg-white shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-[#2B231D] truncate">{p.name}</p>
                            <p className="text-[11px] font-black text-[#1B4E43]">{formatARS(v.price)}</p>
                          </div>
                          <button onClick={() => onQuickAdd(p)} className="text-[11px] font-bold bg-[#EFA332] text-[#1E170E] px-3 py-1.5 rounded-xl cursor-pointer shrink-0">
                            Agregar
                          </button>
                          <button onClick={() => removeFav(p.id)} className="text-red-500 hover:text-red-700 cursor-pointer shrink-0" title="Quitar de favoritos">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              <button
                onClick={onLogout}
                className="mt-4 w-full bg-[#FAF5EC] hover:bg-[#EFE8D8] text-[#DE5D4E] text-xs font-bold py-2.5 px-4 rounded-xl border border-[#E3D6BE] transition-colors cursor-pointer"
              >
                Cerrar sesión
              </button>
            </div>
          </>
          )}
      </motion.div>
    </div>
  );
};
