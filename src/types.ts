export type ProductCategory = 'todos' | 'perros' | 'gatos' | 'piedras' | 'accesorios';

export interface ProductVariant {
  weight: string;
  price: number;
  originalPrice?: number;
  inStock: boolean;
  stock?: number; // unidades disponibles (si se omite = stock ilimitado mientras inStock sea true)
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

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: 'perros' | 'gatos' | 'piedras' | 'accesorios';
  subCategory?: string; // e.g. "Cachorro", "Adulto", "Aglomerante", "Juguete"
  description: string;
  nutritionalInfo?: string;
  image: string;
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

export interface ShippingMethodConfig {
  id: 'pickup' | 'express_amba' | 'correo_argentino';
  label: string;
  cost: number;
  enabled: boolean;
  detail: string;
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


