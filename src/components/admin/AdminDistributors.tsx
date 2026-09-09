import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Search, Phone, Mail, MapPin, Pencil, Trash2, X, Save,
  Download, Factory, Truck,
} from 'lucide-react';
import { Distributor, DistributorCategory } from '../../types';
import { saveCloudDistributor, deleteCloudDistributor } from '../../lib/cloudDb';

interface Props {
  distributors: Distributor[];
  onChange: (list: Distributor[]) => void;
  notify: (msg: string) => void;
}

const CATEGORIES: DistributorCategory[] = ['alimentos', 'accesorios', 'piedras', 'varios'];

const CAT_LABEL: Record<DistributorCategory, string> = {
  alimentos: '🍖 Alimentos',
  accesorios: '🎾 Accesorios',
  piedras: '🧼 Piedras',
  varios: '📦 Varios',
};

const EMPTY: Distributor = {
  id: '',
  name: '',
  contactName: '',
  phone: '',
  email: '',
  address: '',
  city: 'Bella Vista',
  category: 'alimentos',
  brands: '',
  paymentTerms: '',
  notes: '',
  active: true,
  lastPurchase: '',
  createdAt: '',
};

export const AdminDistributors: React.FC<Props> = ({ distributors, onChange, notify }) => {
  const [q, setQ] = useState('');
  const [catFilter, setCatFilter] = useState<string>('todas');
  const [showInactive, setShowInactive] = useState(true);
  const [editing, setEditing] = useState<Distributor | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Distributor | null>(null);
  const [form, setForm] = useState<Distributor>(EMPTY);

  const filtered = useMemo(() => {
    const query = q.toLowerCase().trim();
    return distributors.filter((d) => {
      if (!showInactive && !d.active) return false;
      if (catFilter !== 'todas' && d.category !== catFilter) return false;
      if (!query) return true;
      return (
        d.name.toLowerCase().includes(query) ||
        (d.brands || '').toLowerCase().includes(query) ||
        (d.contactName || '').toLowerCase().includes(query) ||
        (d.city || '').toLowerCase().includes(query)
      );
    });
  }, [distributors, q, catFilter, showInactive]);

  const activeCount = distributors.filter((d) => d.active).length;

  const startCreate = () => {
    setForm({ ...EMPTY, id: `dist-${Date.now()}` });
    setIsCreating(true);
    setEditing(null);
  };

  const startEdit = (d: Distributor) => {
    setForm(JSON.parse(JSON.stringify(d)));
    setEditing(d);
    setIsCreating(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return;
    const item: Distributor = {
      ...form,
      name: form.name.trim(),
      phone: form.phone.trim(),
      createdAt: form.createdAt || new Date().toISOString(),
    };
    const saved = await saveCloudDistributor(item).catch((e: any) => {
      notify(`⚠️ ${e.message || 'No se pudo guardar.'}`);
      return null;
    });
    if (!saved) return;
    const exists = distributors.some((d) => d.id === saved.id);
    onChange(exists ? distributors.map((d) => (d.id === saved.id ? saved : d)) : [saved, ...distributors]);
    setEditing(null);
    setIsCreating(false);
    notify(isCreating ? `✅ Mayorista "${saved.name}" agregado.` : `✅ Mayorista "${saved.name}" actualizado.`);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteCloudDistributor(toDelete.id);
      onChange(distributors.filter((d) => d.id !== toDelete.id));
      notify(`🗑️ Mayorista "${toDelete.name}" eliminado.`);
    } catch (e: any) {
      notify(`⚠️ ${e.message || 'No se pudo eliminar.'}`);
    }
    setToDelete(null);
  };

  const toggleActive = async (d: Distributor) => {
    const updated = { ...d, active: !d.active };
    try {
      await saveCloudDistributor(updated);
      onChange(distributors.map((x) => (x.id === d.id ? updated : x)));
    } catch (e: any) {
      notify(`⚠️ ${e.message || 'No se pudo guardar.'}`);
    }
  };

  const exportCSV = () => {
    const rows = [
      ['Empresa', 'Contacto', 'Teléfono', 'Email', 'Dirección', 'Ciudad', 'Rubro', 'Marcas', 'Pago', 'Activo'].join(';'),
      ...filtered.map((d) =>
        [`"${d.name}"`, `"${d.contactName || ''}"`, d.phone, d.email || '', `"${d.address || ''}"`, d.city || '', d.category, `"${d.brands || ''}"`, `"${d.paymentTerms || ''}"`, d.active ? 'Sí' : 'No'].join(';')
      ),
    ].join('\n');
    const blob = new Blob(['\ufeff' + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mayoristas-la-juaquina-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const waLink = (d: Distributor) => {
    const clean = (d.phone || '').replace(/\D/g, '');
    if (!clean) return null;
    const phone = clean.startsWith('54') ? clean : '54' + clean;
    return `https://wa.me/${phone}?text=${encodeURIComponent(`¡Hola ${d.contactName || d.name}! Te escribimos de La Juaquina Pet Shop (Bella Vista) para consultar precios mayoristas de ${d.brands || 'sus productos'}.`)}`;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-[#1B4E43] to-[#0F2E27] text-white p-4 rounded-2xl shadow-sm">
          <span className="text-[11px] font-bold uppercase opacity-70">Mayoristas activos</span>
          <strong className="block text-2xl font-extrabold font-display">{activeCount}</strong>
        </div>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCatFilter(catFilter === c ? 'todas' : c)}
            className={`text-left p-4 rounded-2xl border shadow-xs cursor-pointer transition-all ${
              catFilter === c ? 'bg-[#1B4E43] text-white border-[#1B4E43]' : 'bg-[#FFFDF9] border-[#E5D7BF] hover:border-[#1B4E43]'
            }`}
          >
            <span className={`text-[11px] font-bold uppercase block ${catFilter === c ? 'opacity-70' : 'text-[#7A6A59]'}`}>{CAT_LABEL[c]}</span>
            <strong className={`block text-2xl font-extrabold font-display ${catFilter === c ? '' : 'text-[#1B4E43]'}`}>
              {distributors.filter((d) => d.category === c && d.active).length}
            </strong>
          </button>
        ))}
      </div>

      <div className="bg-[#FFFDF9] border border-[#E5D7BF] rounded-2xl p-4 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 text-[#8A7969] absolute left-3 top-2.5" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por empresa, marca, contacto o ciudad..."
            className="w-full text-xs pl-9 pr-3 py-2 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl outline-none focus:ring-2 focus:ring-[#1B4E43]"
          />
        </div>
        <label className="flex items-center gap-1.5 text-xs font-bold text-[#5A4D3F] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="w-3.5 h-3.5 accent-[#1B4E43] cursor-pointer"
          />
          Ver inactivos
        </label>
        <button onClick={exportCSV} className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#FAF5EC] border border-[#E3D6BE] px-3 py-2 rounded-xl cursor-pointer hover:bg-[#F2ECE0]">
          <Download className="w-3.5 h-3.5" /> CSV
        </button>
        <button onClick={startCreate} className="inline-flex items-center gap-1.5 text-xs font-black bg-gradient-to-b from-[#F5B44A] to-[#E39420] text-[#1E170E] px-4 py-2 rounded-xl cursor-pointer btn-gloss">
          <Plus className="w-4 h-4" /> Nuevo mayorista
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-[#FFFDF9] border border-[#E5D7BF] rounded-2xl p-10 text-center text-xs text-[#8A7969]">
          <Factory className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="font-bold text-sm text-[#3D3025]">Sin mayoristas cargados</p>
          <p className="mt-1">Agregá tus distribuidores para tener a mano contactos, marcas y condiciones de pago.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          <AnimatePresence>
            {filtered.map((d) => {
              const wa = waLink(d);
              return (
                <motion.div
                  key={d.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className={`bg-[#FFFDF9] border rounded-2xl p-4 shadow-xs hover:shadow-md transition-shadow ${d.active ? 'border-[#E5D7BF]' : 'border-[#E3D6BE] opacity-70'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${d.active ? 'bg-[#E8F3EF] text-[#1B4E43]' : 'bg-[#F3F4F6] text-[#9CA3AF]'}`}>
                        <Factory className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[#1B4E43] leading-tight">{d.name}</h4>
                        <span className="text-[10px] font-bold uppercase text-[#8A7969]">{CAT_LABEL[d.category] || d.category}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleActive(d)}
                      title={d.active ? 'Desactivar' : 'Activar'}
                      className={`text-[10px] font-black px-2 py-1 rounded-full uppercase cursor-pointer ${d.active ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#F3F4F6] text-[#6B7280]'}`}
                    >
                      {d.active ? 'Activo' : 'Inactivo'}
                    </button>
                  </div>

                  {d.brands && (
                    <p className="text-xs text-[#5A4D3F] mt-2.5"><strong>Marcas:</strong> {d.brands}</p>
                  )}
                  <div className="text-[11px] text-[#6A5949] mt-1.5 space-y-0.5">
                    {d.contactName && <p>👤 {d.contactName}</p>}
                    <p className="flex items-center gap-1"><Phone className="w-3 h-3" /> {d.phone}</p>
                    {d.email && <p className="flex items-center gap-1 truncate"><Mail className="w-3 h-3 shrink-0" /> {d.email}</p>}
                    {(d.address || d.city) && <p className="flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" /> {[d.address, d.city].filter(Boolean).join(', ')}</p>}
                    {d.paymentTerms && <p className="flex items-center gap-1">💳 {d.paymentTerms}</p>}
                    {d.lastPurchase && <p className="flex items-center gap-1"><Truck className="w-3 h-3" /> Última compra: {d.lastPurchase}</p>}
                  </div>
                  {d.notes && (
                    <p className="mt-2 text-[11px] italic text-[#7A6A59] bg-[#FAF5EC] border border-[#EFE8D8] rounded-xl p-2">"{d.notes}"</p>
                  )}

                  <div className="mt-3 pt-2.5 border-t border-[#EFE8D8] flex items-center justify-between">
                    {wa ? (
                      <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold bg-[#25D366] hover:bg-[#20bd5a] text-white px-3 py-1.5 rounded-xl">
                        <Phone className="w-3 h-3" /> WhatsApp
                      </a>
                    ) : <span />}
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => startEdit(d)} className="p-1.5 rounded-lg bg-[#FAF5EC] hover:bg-[#EFE8D8] text-[#1B4E43] cursor-pointer" title="Editar">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setToDelete(d)} className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 cursor-pointer" title="Eliminar">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {(isCreating || editing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-[#FFFDF9] rounded-3xl max-w-lg w-full border border-[#E5D7BF] shadow-2xl overflow-hidden my-6">
            <div className="p-4 bg-[#1B4E43] text-white flex items-center justify-between">
              <h3 className="font-bold text-base font-display">{isCreating ? 'Nuevo distribuidor mayorista' : `Editar: ${form.name}`}</h3>
              <button onClick={() => { setEditing(null); setIsCreating(false); }} className="p-1 rounded-full hover:bg-white/10 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-4 sm:p-5 space-y-3 max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#5B4E41] mb-1">Empresa / Distribuidor *</label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Distribuidora San Miguel" className="w-full p-2.5 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl outline-none" />
                </div>
                <div>
                  <label className="block font-bold text-[#5B4E41] mb-1">Nombre de contacto</label>
                  <input value={form.contactName || ''} onChange={(e) => setForm({ ...form, contactName: e.target.value })} placeholder="Ej: Carlos" className="w-full p-2.5 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl outline-none" />
                </div>
                <div>
                  <label className="block font-bold text-[#5B4E41] mb-1">Teléfono / WhatsApp *</label>
                  <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="11 2345 6789" className="w-full p-2.5 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl outline-none" />
                </div>
                <div>
                  <label className="block font-bold text-[#5B4E41] mb-1">Email</label>
                  <input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ventas@distribuidora.com" className="w-full p-2.5 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl outline-none" />
                </div>
                <div>
                  <label className="block font-bold text-[#5B4E41] mb-1">Rubro</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as DistributorCategory })} className="w-full p-2.5 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl outline-none">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#5B4E41] mb-1">Dirección</label>
                  <input value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Calle y altura" className="w-full p-2.5 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl outline-none" />
                </div>
                <div>
                  <label className="block font-bold text-[#5B4E41] mb-1">Ciudad</label>
                  <input value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Bella Vista" className="w-full p-2.5 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl outline-none" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#5B4E41] mb-1">Marcas que provee</label>
                  <input value={form.brands} onChange={(e) => setForm({ ...form, brands: e.target.value })} placeholder="Ej: Sabrosito, Raza, Dogui" className="w-full p-2.5 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl outline-none" />
                </div>
                <div>
                  <label className="block font-bold text-[#5B4E41] mb-1">Condiciones de pago</label>
                  <input value={form.paymentTerms || ''} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} placeholder="Ej: Contado, 7 días, CC" className="w-full p-2.5 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl outline-none" />
                </div>
                <div>
                  <label className="block font-bold text-[#5B4E41] mb-1">Última compra</label>
                  <input value={form.lastPurchase || ''} onChange={(e) => setForm({ ...form, lastPurchase: e.target.value })} placeholder="Ej: 12/05/2026" className="w-full p-2.5 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl outline-none" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#5B4E41] mb-1">Notas</label>
                  <textarea rows={2} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Descuentos por volumen, días de reparto..." className="w-full p-2.5 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl outline-none" />
                </div>
                <label className="flex items-center gap-2 font-bold text-[#1B4E43] cursor-pointer select-none sm:col-span-2">
                  <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="w-4 h-4 accent-[#1B4E43] cursor-pointer" />
                  Mayorista activo
                </label>
              </div>
              <div className="pt-3 border-t border-[#EFE8D8] flex justify-end gap-2">
                <button type="button" onClick={() => { setEditing(null); setIsCreating(false); }} className="px-4 py-2 rounded-xl text-[#7A6A59] hover:bg-[#FAF5EC] font-bold cursor-pointer">Cancelar</button>
                <button type="submit" className="bg-[#1B4E43] hover:bg-[#256B5C] text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer">
                  <Save className="w-4 h-4 text-[#EFA332]" /> Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-[#FFFDF9] rounded-2xl max-w-sm w-full p-6 border border-[#E5D7BF] shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm mb-1">¿Eliminar mayorista?</h3>
            <p className="text-xs text-[#7A6A59] mb-5">Se eliminará <strong>"{toDelete.name}"</strong> de la lista.</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setToDelete(null)} className="px-3 py-2 text-xs font-bold rounded-xl border border-[#E3D6BE] cursor-pointer">Cancelar</button>
              <button onClick={confirmDelete} className="px-3 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white cursor-pointer">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
