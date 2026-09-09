import React, { useState } from 'react';
import { StoreSettings } from '../../types';
import { saveStoreSettings, formatARS } from '../../lib/storeSettings';

interface Props {
  settings: StoreSettings;
  onSaved: (s: StoreSettings) => void;
}

export const AdminShipping: React.FC<Props> = ({ settings, onSaved }) => {
  const [form, setForm] = useState<StoreSettings>(settings);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (patch: Partial<StoreSettings>) => setForm({ ...form, ...patch });

  const setShip = (id: string, patch: Partial<StoreSettings['shipping'][number]>) => {
    setForm({ ...form, shipping: form.shipping.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const saved = await saveStoreSettings(form);
    onSaved(saved);
    setMsg('✅ Configuración de comercio y envíos guardada. La tienda ya la está usando.');
    setTimeout(() => setMsg(null), 3500);
    setSaving(false);
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {msg && (
        <div className="p-3 rounded-2xl bg-[#E8F3EF] border border-[#256B5C]/30 text-[#1B4E43] font-bold text-xs">{msg}</div>
      )}

      <div className="bg-[#FFFDF9] border border-[#E5D7BF] rounded-2xl p-4 shadow-xs">
        <h3 className="font-bold text-sm text-[#1B4E43] mb-3">🏪 Datos del comercio</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block font-bold text-[#5B4E41] mb-1">Nombre</label>
            <input value={form.storeName} onChange={(e) => set({ storeName: e.target.value })} className="w-full p-2.5 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl outline-none" />
          </div>
          <div>
            <label className="block font-bold text-[#5B4E41] mb-1">WhatsApp (solo números, con código país)</label>
            <input value={form.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} placeholder="5491123456789" className="w-full p-2.5 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl outline-none" />
          </div>
          <div>
            <label className="block font-bold text-[#5B4E41] mb-1">Dirección del local</label>
            <input value={form.address} onChange={(e) => set({ address: e.target.value })} className="w-full p-2.5 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl outline-none" />
          </div>
          <div>
            <label className="block font-bold text-[#5B4E41] mb-1">Horarios</label>
            <input value={form.hours} onChange={(e) => set({ hours: e.target.value })} className="w-full p-2.5 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl outline-none" />
          </div>
          <div>
            <label className="block font-bold text-[#5B4E41] mb-1">Alias para transferencia</label>
            <input value={form.aliasTransferencia} onChange={(e) => set({ aliasTransferencia: e.target.value })} className="w-full p-2.5 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl outline-none font-mono" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-[#5B4E41] mb-1">Cupón</label>
              <input value={form.couponCode} onChange={(e) => set({ couponCode: e.target.value.toUpperCase() })} className="w-full p-2.5 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl outline-none font-mono" />
            </div>
            <div>
              <label className="block font-bold text-[#5B4E41] mb-1">% OFF cupón</label>
              <input type="number" min={0} max={90} value={form.couponPercent} onChange={(e) => set({ couponPercent: Number(e.target.value) })} className="w-full p-2.5 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl outline-none" />
            </div>
          </div>
          <div>
            <label className="block font-bold text-[#5B4E41] mb-1">% OFF por transferencia</label>
            <input type="number" min={0} max={90} value={form.transferPercent} onChange={(e) => set({ transferPercent: Number(e.target.value) })} className="w-full p-2.5 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl outline-none" />
          </div>
        </div>
      </div>

      <div className="bg-[#FFFDF9] border border-[#E5D7BF] rounded-2xl p-4 shadow-xs">
        <h3 className="font-bold text-sm text-[#1B4E43] mb-1">🚚 Métodos de envío</h3>
        <p className="text-[11px] text-[#8A7969] mb-3">Estos precios los ve el cliente en el checkout y se guardan en cada pedido.</p>
        <div className="space-y-2.5">
          {form.shipping.map((m) => (
            <div key={m.id} className="grid grid-cols-1 sm:grid-cols-[1fr_130px_1fr_auto] gap-2 items-center bg-[#FAF5EC] border border-[#E8DFC9] rounded-xl p-3 text-xs">
              <div>
                <label className="block font-bold text-[#5B4E41] mb-1">Nombre</label>
                <input value={m.label} onChange={(e) => setShip(m.id, { label: e.target.value })} className="w-full p-2 bg-white border border-[#E3D6BE] rounded-lg outline-none font-semibold" />
              </div>
              <div>
                <label className="block font-bold text-[#5B4E41] mb-1">Costo ($)</label>
                <input type="number" min={0} value={m.cost} onChange={(e) => setShip(m.id, { cost: Number(e.target.value) })} className="w-full p-2 bg-white border border-[#E3D6BE] rounded-lg outline-none" />
                <span className="text-[10px] text-[#8A7969]">{m.cost === 0 ? 'Gratis' : formatARS(m.cost)}</span>
              </div>
              <div>
                <label className="block font-bold text-[#5B4E41] mb-1">Detalle</label>
                <input value={m.detail} onChange={(e) => setShip(m.id, { detail: e.target.value })} className="w-full p-2 bg-white border border-[#E3D6BE] rounded-lg outline-none" />
              </div>
              <label className="flex items-center gap-1.5 font-bold text-[#1B4E43] cursor-pointer select-none mt-5 sm:mt-0">
                <input type="checkbox" checked={m.enabled} onChange={(e) => setShip(m.id, { enabled: e.target.checked })} className="w-4 h-4 accent-[#1B4E43] cursor-pointer" />
                Activo
              </label>
            </div>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full sm:w-auto bg-[#1B4E43] hover:bg-[#256B5C] text-white font-bold text-xs px-6 py-3 rounded-xl cursor-pointer"
      >
        {saving ? 'Guardando...' : '💾 Guardar comercio y envíos'}
      </button>
    </form>
  );
};
