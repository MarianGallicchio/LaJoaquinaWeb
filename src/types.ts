export type ProductCategory = 'todos' | 'perros' | 'gatos' | 'otras' | 'piedras' | 'accesorios';

export interface ProductVariant {
  weight: string;
  price: number;
  originalPrice?: number;
  inStock: boolean;
  stock?: number; // unidades disponibles (si se omite = stock ilimitado mientras inStock sea true)
  minStock?: number; // aviso de stock bajo (por defecto 5)
}

export type OrderStatus =
  | 'pendiente'
  | 'pago_pendiente'
  | 'confirmado'
  | 'pagado'
  | 'preparando'
  | 'enviado'
  | 'entregado'
  | 'cancelado';

export type PaymentMethodId = 'mercadopago' | 'transferencia' | 'efectivo';

export interface CustomerAddress {
  id: string;
  label: string; // Casa, Trabajo...
  street: string; // calle, altura, piso
  city: string;
  notes?: string;
  isDefault?: boolean;
}

export interface CustomerProfileData {
  name: string;
  email: string;
  phone: string;
  petName?: string;
  petInfo?: string; // especie, raza, edad
  addresses: CustomerAddress[];
  defaultPayment?: PaymentMethodId;
  favorites: string[]; // ids de producto
  birthDate?: string; // YYYY-MM-DD (para regalo de cumpleaños)
  points?: number; // puntos de fidelidad acumulados
  lastBirthdayBonus?: number; // año en que ya se acreditó el regalo
  updatedAt?: string;
}

export function emptyCustomerProfile(email = '', name = ''): CustomerProfileData {
  return { name, email, phone: '', addresses: [], favorites: [] };
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: 'perros' | 'gatos' | 'otras' | 'piedras' | 'accesorios';
  subCategory?: string; // e.g. "Cachorro", "Adulto", "Aglomerante", "Juguete"
  description: string;
  nutritionalInfo?: string;
  image: string;
  images?: string[]; // fotos extra (la principal sigue siendo image)
  badge?: string;
  rating: number;
  reviewsCount: number;
  variants: ProductVariant[];
  selectedVariantIndex?: number;
  mercadolibreQuery: string;
  mercadolibreUrl?: string;
  isBestSeller?: boolean;
  isPromo?: boolean;
}

export interface CartItem {
  product: Product;
  selectedVariant: ProductVariant;
  quantity: number;
}

export interface OrderDetails {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerId?: string;
  deliveryMethod: 'pickup' | 'express_amba' | 'correo_argentino';
  address: string;
  notes?: string;
  paymentMethod: 'mercadopago' | 'transferencia' | 'efectivo';
  items: CartItem[];
  subtotal: number;
  discount: number;
  shippingCost: number;
  total: number;
  orderId: string;
  createdAt: string;
  status?: OrderStatus | string;
  trackingCode?: string;
  adminNotes?: string;
  giftWrap?: { message?: string }; // envoltorio para regalo
  pointsUsed?: number; // puntos canjeados en este pedido
  pointsEarned?: number; // puntos ganados con este pedido
  history?: Array<{ at: string; from: string; to: string; by?: string }>;
}

export interface Testimonial {
  id: string;
  clientName: string;
  location: string;
  petName: string;
  petType: 'perro' | 'gato';
  petBreed: string;
  comment: string;
  rating: number;
  avatar: string;
  petImage: string;
  purchasedProduct: string;
  date: string;
  verifiedPurchase: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  quickActions?: {
    label: string;
    action: () => void;
  }[];
}

export interface StockAlert {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  productBrand?: string;
  variantWeight: string;
  customerEmail: string;
  customerPhone?: string;
  customerName?: string;
  notes?: string;
  createdAt: string;
  status: 'pending' | 'notified' | 'resolved';
}

// Reseña de cliente (requiere aprobación del admin para publicarse)
export interface Review {
  id: string;
  productId: string;
  productName: string;
  customerName: string;
  rating: number; // 1..5
  comment: string;
  approved: boolean;
  createdAt: string;
}

// Movimiento de stock (auditoría: ventas, cancelaciones y ajustes manuales)
export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  variantLabel: string;
  change: number; // negativo = salida, positivo = entrada
  reason: 'venta' | 'cancelacion' | 'ajuste' | 'carga';
  orderId?: string;
  by?: string; // quién lo generó (admin email o "tienda")
  createdAt: string;
}

// Estado público y acotado de un pedido (para seguimiento sin login)
export interface OrderTracking {
  orderId: string;
  status: string;
  trackingCode?: string;
  deliveryMethod?: string;
  updatedAt?: string;
  history?: Array<{ at: string; from: string; to: string }>;
}

// Carrito abandonado: checkout iniciado con email pero compra no concretada
export interface CartRecovery {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  itemsCount: number;
  itemsSummary: string; // ej: "Dogui 15kg x2, Piedras x1"
  total: number;
  status: 'pending' | 'recovered' | 'dismissed';
  createdAt: string;
}

export interface ShippingMethodConfig {
  id: 'pickup' | 'express_amba' | 'correo_argentino';
  label: string;
  cost: number;
  enabled: boolean;
  detail: string;
}
// Regla de pack: llevando minQty unidades de una categoría, % OFF automático
export interface PackRule {
  id: string;
  label: string; // ej: "Pack Perros x3"
  category: ProductCategory | 'todas';
  minQty: number;
  percent: number;
  active: boolean;
}

export interface StoreSettings {
  storeName: string;
  address: string;
  city: string;
  hours: string;
  whatsapp: string;
  instagram: string;
  aliasTransferencia: string;
  couponCode: string;
  couponPercent: number;
  transferPercent: number;
  announcement?: string;
  ordersEmail?: string;
  // Promo con cuenta regresiva (se edita en Envíos y Comercio)
  promoText?: string; // ej: "Semana del Gato: 20% OFF en piedras"
  promoEndsAt?: string; // ISO; vacía = sin cuenta regresiva
  // Medición (se inyectan solo si están cargados)
  gaId?: string; // G-XXXXXXX (Google Analytics 4)
  metaPixelId?: string; // Meta Pixel
  // Envoltorio para regalo
  giftWrapPrice?: number; // 0 o vacío = desactivado
  // Armá tu pack (descuentos por cantidad, se aplican solos)
  packRules?: PackRule[];
  // Fidelidad: 1 punto cada pointsPerARS gastados; cada punto vale arsPerPoint
  pointsPerARS?: number;
  arsPerPoint?: number;
  birthdayPoints?: number; // regalo de cumpleaños en puntos
  shipping: ShippingMethodConfig[];
  updatedAt?: string;
}

export type DistributorCategory = 'alimentos' | 'accesorios' | 'piedras' | 'varios';

export interface Distributor {
  id: string;
  name: string; // empresa / distribuidor
  contactName?: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  category: DistributorCategory;
  brands: string; // marcas que provee
  paymentTerms?: string; // condiciones de pago mayorista
  notes?: string;
  active: boolean;
  lastPurchase?: string;
  createdAt: string;
}


