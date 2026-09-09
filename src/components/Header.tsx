import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  Search, 
  Menu, 
  X, 
  Heart, 
  Phone, 
  Percent,
  Sparkles,
  Truck,
  User,
  ShieldCheck
} from 'lucide-react';
import { ProductCategory } from '../types';
import { AuthUserProfile } from '../lib/cloudDb';

interface HeaderProps {
  activeCategory: ProductCategory;
  onSelectCategory: (cat: ProductCategory) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  cartCount: number;
  onOpenCart: () => void;
  onOpenHelp: () => void;
  currentUser: AuthUserProfile | null;
  onOpenAuth: () => void;
  onOpenAdmin: () => void;
  isAdminView?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  cartCount,
  onOpenCart,
  onOpenHelp,
  currentUser,
  onOpenAuth,
  onOpenAdmin,
  isAdminView = false,
}) => {

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const categories: { id: ProductCategory; label: string; icon?: string }[] = [
    { id: 'todos', label: 'Todo el Catálogo' },
    { id: 'perros', label: 'Perros 🐶' },
    { id: 'gatos', label: 'Gatos 🐱' },
    { id: 'piedras', label: 'Piedras Sanitarias 🧼' },
    { id: 'accesorios', label: 'Accesorios & Camas 🎾' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#FFFDF9]/95 backdrop-blur-md border-b border-[#E8DFC9] transition-all shadow-xs">
      {/* Top micro-announcement banner */}
      <div className="bg-[#1B4E43] text-[#FAF7F2] py-2 px-4 text-xs sm:text-sm font-medium">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="bg-[#EFA332] text-[#1B4E43] text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shrink-0">
              <Percent className="w-3 h-3" /> 10% OFF
            </span>
            <span className="hidden sm:inline">Pagando con transferencia bancaria directa · Tienda online con envíos a todo el país</span>
            <span className="sm:hidden truncate">Transferencia · Bella Vista · Todo el país</span>
          </div>

          <div className="flex items-center gap-4 hidden sm:flex text-xs">
            <span className="flex items-center gap-1 text-[#E2CFB4]">
              <Truck className="w-3.5 h-3.5 text-[#EFA332]" />
              Envíos a todo el país
            </span>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2 sm:gap-4">
          
          {/* Brand Logo */}
          <a 
            href="#top" 
            onClick={() => onSelectCategory('todos')}
            className="flex items-center gap-2 text-decoration-none group shrink-0 min-w-0"
          >
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-[#1B4E43] to-[#2B6D5E] flex items-center justify-center text-white shadow-md shadow-[#1B4E43]/30 group-hover:scale-105 transition-transform shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#EFA332]" viewBox="0 0 64 64" fill="currentColor">
                <ellipse cx="32" cy="40" rx="15" ry="13"/>
                <ellipse cx="14" cy="24" rx="7" ry="9"/>
                <ellipse cx="50" cy="24" rx="7" ry="9"/>
                <ellipse cx="24" cy="12" rx="6" ry="8"/>
                <ellipse cx="40" cy="12" rx="6" ry="8"/>
              </svg>
            </div>
            <div className="min-w-0">
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-[#1B4E43] font-display flex items-center gap-1 truncate">
                La Joaquina
                <span className="text-[#EFA332] text-lg sm:text-xl">🐾</span>
              </span>
              <span className="text-[11px] hidden min-[420px]:block uppercase font-bold tracking-wider text-[#7A6B5B] -mt-1">
                Pet Shop & Alimentos
              </span>
            </div>
          </a>

          {/* Search bar (Desktop & Tablet) */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Buscar por marca, raza, alimento o accesorio..."
                className="w-full bg-[#FAF5EC] text-sm text-[#2B231D] placeholder-[#9A8A78] pl-10 pr-4 py-2.5 rounded-full border border-[#E3D6BE] focus:outline-none focus:ring-2 focus:ring-[#1B4E43] focus:border-transparent transition-all"
              />
              <Search className="w-4 h-4 text-[#8C7B6A] absolute left-3.5 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button 
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8C7B6A] hover:text-[#1B4E43] bg-[#E8DFC9] rounded-full w-4 h-4 flex items-center justify-center"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Help Button */}
            <button
              onClick={onOpenHelp}
              className="hidden lg:flex items-center gap-2 text-xs font-bold text-[#1B4E43] bg-[#E8F3EF] hover:bg-[#D7EBE4] border border-[#BCE0D4] px-3.5 py-2 rounded-full transition-colors cursor-pointer"
              title="Ayuda y contacto"
            >
              <Sparkles className="w-4 h-4 text-[#256B5C]" />
              <span>Ayuda</span>
            </button>

            {/* Auth / Profile Button */}
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={onOpenAuth}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-full transition-colors cursor-pointer border ${
                currentUser
                  ? 'bg-[#E8F3EF] text-[#1B4E43] border-[#256B5C]/30'
                  : 'bg-[#FAF5EC] text-[#4A3D31] border-[#E3D6BE] hover:bg-[#F2ECE0]'
              }`}
              title={currentUser ? 'Ver mi cuenta y base de datos' : 'Iniciar Sesión / Acceso'}
            >
              <User className="w-4 h-4" />
              <span className="hidden md:inline">
                {currentUser ? (currentUser.name || 'Mi Cuenta').split(' ')[0] : 'Ingresar'}
              </span>
            </motion.button>

            {/* Alternar Inicio / Vista de Administrador */}
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={onOpenAdmin}
              className={`inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-2 rounded-full border transition-all cursor-pointer shadow-2xs ${
                isAdminView
                  ? 'bg-[#1B4E43] text-[#FFE194] border-[#1B4E43] hover:bg-[#256B5C]'
                  : 'bg-[#FFF8E6] text-[#8C5800] border-[#EFA332] hover:bg-[#FFECC2]'
              }`}
              title="Alternar entre vista de Tienda y Panel Administrador"
            >
              <ShieldCheck className={`w-4 h-4 ${isAdminView ? 'text-[#FFE194]' : 'text-[#EFA332]'}`} />
              <span className="hidden sm:inline">{isAdminView ? '🛍️ Modo Tienda' : '👑 Alternar Admin'}</span>
            </motion.button>


            {/* Cart Button with spring micro-interaction */}
            <motion.button
              id="cart-toggle-btn"
              onClick={onOpenCart}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.93 }}
              transition={{ type: 'spring', stiffness: 500, damping: 18 }}
              className="relative flex items-center gap-2 bg-[#EFA332] hover:bg-[#E39420] text-[#1E170E] font-bold text-sm px-3 py-2 sm:px-4 sm:py-2.5 rounded-full shadow-xs cursor-pointer btn-gloss"
              aria-label="Abrir carrito de compras"
            >
              <ShoppingBag className="w-5 h-5" />
              <span className="hidden sm:inline font-display">Carrito</span>
              <AnimatePresence>
                {cartCount > 0 && (
                  <motion.span
                    key={`cart-badge-${cartCount}`}
                    initial={{ scale: 0.3, opacity: 0 }}
                    animate={{ scale: [1, 1.35, 1], opacity: 1 }}
                    exit={{ scale: 0.3, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 600, damping: 14 }}
                    className="bg-[#1B4E43] text-white text-xs font-black w-5 h-5 rounded-full flex items-center justify-center -mr-1 shadow-xs"
                  >
                    {cartCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-[#1B4E43] hover:bg-[#F2ECE0] transition-colors"
              aria-label="Alternar menú"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Search bar */}
        <div className="md:hidden pb-3">
          <div className="relative w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar marcas, cachorros, piedras..."
              className="w-full bg-[#FAF5EC] text-sm text-[#2B231D] placeholder-[#9A8A78] pl-10 pr-4 py-2 rounded-full border border-[#E3D6BE] focus:outline-none focus:ring-2 focus:ring-[#1B4E43]"
            />
            <Search className="w-4 h-4 text-[#8C7B6A] absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Category Navigation Bar (Desktop) */}
        <nav className="hidden md:flex items-center space-x-1 pb-3 overflow-x-auto no-scrollbar pt-1 border-t border-[#EAE1CE]/60">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#1B4E43] text-[#FAF7F2] shadow-xs'
                    : 'text-[#615243] hover:text-[#1B4E43] hover:bg-[#F2ECE0]'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
          
          <div className="ml-auto flex items-center gap-3 text-xs font-semibold text-[#615243]">
            <a href="#testimonios" className="hover:text-[#1B4E43] hover:underline">
              ⭐ Testimonios
            </a>
            <a href="#calculadora" className="hover:text-[#1B4E43] hover:underline">
              🧮 Calculadora de Ración
            </a>
            <a href="#contacto" className="hover:text-[#1B4E43] hover:underline">
              📍 Contacto
            </a>
          </div>
        </nav>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#FFFDF9] border-b border-[#E8DFC9] px-4 pt-2 pb-6 space-y-3 shadow-lg">
          <p className="text-xs font-bold uppercase tracking-wider text-[#8A7969] px-2">Categorías</p>
          <div className="grid grid-cols-2 gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  onSelectCategory(cat.id);
                  setMobileMenuOpen(false);
                }}
                className={`text-left px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeCategory === cat.id
                    ? 'bg-[#1B4E43] text-white'
                    : 'bg-[#F6EFE2] text-[#423427] hover:bg-[#ECE2D2]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="pt-2 border-t border-[#E8DFC9] space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onOpenAuth();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#FAF5EC] border border-[#E3D6BE] text-[#3D3025] text-xs font-bold"
              >
                <User className="w-4 h-4 text-[#1B4E43]" />
                <span>{currentUser ? 'Mi Perfil' : 'Iniciar Sesión'}</span>
              </button>
              <button
                onClick={() => {
                  onOpenAdmin();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#FFF8E6] border border-[#EFA332] text-[#8C5800] text-xs font-bold"
              >
                <ShieldCheck className="w-4 h-4 text-[#EFA332]" />
                <span>Admin Catálogo</span>
              </button>
            </div>

              <button
                onClick={() => {
                  onOpenHelp();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#E8F3EF] text-[#1B4E43] text-xs font-bold"
              >
                <Sparkles className="w-4 h-4 text-[#256B5C]" />
                Ayuda y contacto
              </button>

            <div className="flex justify-around pt-2 text-xs font-semibold text-[#5A4C3D]">
              <a 
                href="#testimonios" 
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 px-2"
              >
                Testimonios
              </a>
              <a 
                href="#calculadora" 
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 px-2"
              >
                Calculadora
              </a>
              <a 
                href="#contacto" 
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 px-2"
              >
                Contacto
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
