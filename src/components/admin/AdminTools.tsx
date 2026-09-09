import React, { useState } from 'react';
import { Product } from '../../types';
import { saveCloudProduct } from '../../lib/cloudDb';

interface Props {
  products: Product[];
  onUpdateProducts: (p: Product[]) => void;
}

export const AdminTools: React.FC<Props> = ({ products, onUpdateProducts }) => {
  const [percent, setPercent] = useState(10);
  const [scope, setScope] = useState<string>('todas');
  const [msg, setMsg] = useState<string | null>(null);
  const [importText, setImportText] = useState('');

  const feedback = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 4000);
  };

  const persistAll = async (list: Product[]) => {
    onUpdateProducts(list);
    for (const p of list) await saveCloudProduct(p);
  };

  // Aumento / descuento masivo de precios
  const applyBulkPercent = async () => {
    const factor = 1 + percent / 100;
    const updated = products.map((p) => {
      const matchScope =
        scope === 'todas' || p.category === scope || p.brand === scope;
      if (!matchScope) return p;
      return {
        ...p,
        variants: p.variants.map((v) => ({ ...v, price: Math.max(0, Math.round(v.price * factor)) })),
      };
    });
    await persistAll(updated);
    feedback(`✅ Precios actualizados ${percent >= 0 ? '+' : ''}${percent}% en "${scope}".`);
  };

  // Marcar todo con stock / reponer
  const restockAll = async (qty: number) => {
    const updated = products.map((p) => ({
      ...p,
      variants: p.variants.map((v) => ({ ...v, inStock: true, stock: qty })),
    }));
    await persistAll(updated);
    feedback(`✅ Todo el catálogo repuesto a ${qty} unidades por variante.`);
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(products, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `catalogo-la-juaquina-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const rows = [
      ['id', 'nombre', 'marca', 'categoria', 'presentacion', 'precio', 'stock', 'enStock'].join(';'),
      ...products.flatMap((p) =>
        p.variants.map((v) =>
          [p.id, `"${p.name.replace(/"/g, "'")}"`, p.brand, p.category, v.weight, v.price, v.stock ?? '', v.inStock].join(';')
        )
      ),
    ].join('\n');
    const blob = new Blob(['\ufeff' + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `catalogo-la-juaquina-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    try {
      const parsed = JSON.parse(importText);
      const list: Product[] = Array.isArray(parsed) ? parsed : parsed.products;
      if (!Array.isArray(list) || list.length === 0) throw new Error('formato inválido');
      await persistAll(list);
      feedback(`✅ Catálogo importado: ${list.length} productos.`);
      setImportText('');
    } catch {
      feedback('❌ No pude importar: pegá un JSON válido de productos (array o {products: [...]})');
    }
  };

  const handleImportFile = async (file: File) => {
    const text = await file.text();
    setImportText(text);
  };

  const brands = Array.from(new Set(products.map((p) => p.brand)));

  return (
    <div className="space-y-4">
      {msg && (
        <div className="p-3 rounded-2xl bg-[#E8F3EF] border border-[#256B5C]/30 text-[#1B4E43] font-bold text-xs">{msg}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#FFFDF9] border border-[#E5D7BF] rounded-2xl p-4 shadow-xs">
          <h3 className="font-bold text-sm text-[#1B4E43] mb-1">💲 Aumento / descuento masivo</h3>
          <p className="text-[11px] text-[#8A7969] mb-3">Aplica a todas las presentaciones del alcance elegido. Usá valores negativos para descuentos.</p>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <input
              type="number"
              value={percent}
              onChange={(e) => setPercent(Number(e.target.value))}
              className="w-24 p-2 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl outline-none font-bold"
            />
            <span className="font-bold">%</span>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="p-2 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl font-semibold outline-none cursor-pointer"
            >
              <option value="todas">Todo el catálogo</option>
              <option value="perros">Perros</option>
              <option value="gatos">Gatos</option>
              <option value="piedras">Piedras</option>
              <option value="accesorios">Accesorios</option>
              {brands.map((b) => (
                <option key={b} value={b}>Marca: {b}</option>
              ))}
            </select>
            <button onClick={applyBulkPercent} className="bg-[#EFA332] hover:bg-[#E39420] text-[#1E170E] font-black px-4 py-2 rounded-xl cursor-pointer">
              Aplicar
            </button>
          </div>
        </div>

        <div className="bg-[#FFFDF9] border border-[#E5D7BF] rounded-2xl p-4 shadow-xs">
          <h3 className="font-bold text-sm text-[#1B4E43] mb-1">📦 Reposición rápida</h3>
          <p className="text-[11px] text-[#8A7969] mb-3">Marca todo como en stock con una cantidad base por variante.</p>
          <div className="flex flex-wrap gap-2">
            {[10, 20, 50].map((q) => (
              <button
                key={q}
                onClick={() => restockAll(q)}
                className="text-xs font-bold bg-[#E8F3EF] hover:bg-[#D8EAE3] text-[#1B4E43] border border-[#CDE5DC] px-4 py-2 rounded-xl cursor-pointer"
              >
                Reponer a {q} u.
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[#FFFDF9] border border-[#E5D7BF] rounded-2xl p-4 shadow-xs">
        <h3 className="font-bold text-sm text-[#1B4E43] mb-1">🔄 Exportar / importar catálogo</h3>
        <p className="text-[11px] text-[#8A7969] mb-3">Respaldá tu catálogo o cargá productos desde otro archivo. Ideal antes de cambios grandes.</p>
        <div className="flex flex-wrap gap-2 mb-3">
          <button onClick={exportJSON} className="text-xs font-bold bg-[#1B4E43] text-white px-4 py-2 rounded-xl cursor-pointer hover:bg-[#256B5C]">
            Descargar JSON
          </button>
          <button onClick={exportCSV} className="text-xs font-bold bg-[#FAF5EC] border border-[#E3D6BE] px-4 py-2 rounded-xl cursor-pointer hover:bg-[#F2ECE0]">
            Descargar CSV
          </button>
          <label className="text-xs font-bold bg-[#FAF5EC] border border-[#E3D6BE] px-4 py-2 rounded-xl cursor-pointer hover:bg-[#F2ECE0]">
            Subir JSON…
            <input type="file" accept=".json" className="hidden" onChange={(e) => e.target.files?.[0] && handleImportFile(e.target.files[0])} />
          </label>
        </div>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          rows={4}
          placeholder='Pegá acá el JSON del catálogo y presioná "Importar"…'
          className="w-full text-[11px] font-mono p-3 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl outline-none"
        />
        <button onClick={handleImport} disabled={!importText.trim()} className="mt-2 text-xs font-bold bg-[#EFA332] hover:bg-[#E39420] text-[#1E170E] px-5 py-2 rounded-xl cursor-pointer disabled:opacity-40">
          Importar catálogo
        </button>
      </div>

      <div className="bg-[#FFF7ED] border border-[#FDBA74]/50 rounded-2xl p-4 text-xs text-[#9A3412]">
        <p className="font-bold mb-1">💡 Flujo recomendado para agregar productos</p>
        <ol className="list-decimal ml-4 space-y-1">
          <li>En la pestaña <strong>Productos</strong> tocá “Nuevo Producto” y cargá nombre, marca, foto y presentaciones con su <strong>stock en unidades</strong>.</li>
          <li>Cada compra de la tienda <strong>descuenta stock sola</strong> y el pedido cae en <strong>Ventas</strong> con datos de envío.</li>
          <li>Si te quedás sin stock, el cliente puede pedir “avisarme” y lo ves en la campanita de alertas.</li>
          <li>Antes de un aumento general, exportá el JSON como respaldo y después usá el aumento masivo.</li>
        </ol>
      </div>
    </div>
  );
};
