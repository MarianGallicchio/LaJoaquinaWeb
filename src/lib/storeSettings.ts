import { StoreSettings } from '../types';

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'La Joaquina Pet Shop',
  address: 'Bella Vista, Buenos Aires',
  city: 'Bella Vista, Buenos Aires',
  hours: 'Atención online: Lun a Sáb de 9 a 19:30 hs',
  whatsapp: '5491123456789',
  instagram: '@lajoaquinapetshop',
  aliasTransferencia: 'LA.JOAQUINA.PET',
  couponCode: 'JOAQUINA10',
  couponPercent: 10,
  transferPercent: 10,
  announcement: '',
  shipping: [
    { id: 'pickup', label: 'Punto de entrega a coordinar', cost: 0, enabled: false, detail: 'Se coordina por WhatsApp' },
    { id: 'express_amba', label: 'Envío AMBA', cost: 3500, enabled: true, detail: 'Bella Vista y alrededores en 24/48 hs' },
    { id: 'correo_argentino', label: 'Todo el País', cost: 4900, enabled: true, detail: 'Correo Argentino' },
  ],
};

const KEY = 'la_juaquina_settings';

function needsMigration(s: any): boolean {
  const text = JSON.stringify(s || {});
  return text.includes('Victorica') || text.includes('Moreno');
}

export function getLocalSettings(): StoreSettings {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migración: si guardó la ubicación vieja (Moreno/local físico), volver a los valores nuevos
      if (needsMigration(parsed)) {
        localStorage.removeItem(KEY);
        return DEFAULT_SETTINGS;
      }
      // Actualización de marca: cupón, alias y nombre viejos -> nuevos
      if (parsed.couponCode === 'JUAQUINA10') parsed.couponCode = 'JOAQUINA10';
      if (parsed.aliasTransferencia === 'LA.JUAQUINA.PET') parsed.aliasTransferencia = 'LA.JOAQUINA.PET';
      if (typeof parsed.storeName === 'string') {
        parsed.storeName = parsed.storeName.replace(/La Juaquina/g, 'La Joaquina');
      }
      return { ...DEFAULT_SETTINGS, ...parsed, shipping: parsed.shipping || DEFAULT_SETTINGS.shipping };
    }
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS;
}

export function saveLocalSettings(s: StoreSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...s, updatedAt: new Date().toISOString() }));
  } catch { /* ignore */ }
}

export async function fetchStoreSettings(): Promise<StoreSettings> {
  try {
    const res = await fetch('/api/cloud/settings', { headers: { Accept: 'application/json' } });
    if (res.ok) {
      const data = await res.json();
      if (data.settings) {
        saveLocalSettings(data.settings);
        return { ...DEFAULT_SETTINGS, ...data.settings };
      }
    }
  } catch { /* offline */ }
  return getLocalSettings();
}

export async function saveStoreSettings(s: StoreSettings): Promise<StoreSettings> {
  saveLocalSettings(s);
  try {
    const res = await fetch('/api/cloud/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: s }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.settings) {
        saveLocalSettings(data.settings);
        return data.settings;
      }
    }
  } catch { /* offline */ }
  return s;
}

export function getShippingCost(s: StoreSettings, method: 'pickup' | 'express_amba' | 'correo_argentino'): number {
  return s.shipping.find((m) => m.id === method)?.cost ?? 0;
}

export function getEnabledShipping(s: StoreSettings) {
  const list = (s.shipping || []).filter((m) => m.enabled);
  return list.length > 0 ? list : s.shipping;
}

export function getMethodLabel(s: StoreSettings, method: string): string {
  return s.shipping.find((m) => m.id === method)?.label || method;
}

export function formatARS(val: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);
}

export function instagramUrl(s: StoreSettings): string {
  const handle = (s.instagram || '').replace(/^@/, '').trim();
  return handle ? `https://instagram.com/${handle}` : 'https://instagram.com/';
}

export function waLink(phone: string, text: string): string {
  const clean = (phone || '').replace(/\D/g, '');
  return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
}
