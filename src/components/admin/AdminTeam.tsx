import React, { useEffect, useState } from 'react';
import { KeyRound, Plus, Trash2, UserPlus, ShieldCheck } from 'lucide-react';
import { fetchStaff, saveStaff, deleteStaff, changeMyPassword, supaMode, AuthUserProfile } from '../../lib/cloudDb';
import type { StaffRow, StaffRole } from '../../lib/supabase';

interface Props {
  currentUser: AuthUserProfile | null;
  notify: (msg: string) => void;
}

const ROLE_LABEL: Record<StaffRole, string> = {
  admin: '👑 Encargado general',
  stock: '📦 Solo stock',
  ventas: '🛍️ Solo ventas',
};

// Equipo y mi cuenta (solo dueña): perfil, cambio de clave y empleados por puesto.
export const AdminTeam: React.FC<Props> = ({ currentUser, notify }) => {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [newPass2, setNewPass2] = useState('');
  const [savingPass, setSavingPass] = useState(false);
  const [eEmail, setEEmail] = useState('');
  const [eName, setEName] = useState('');
  const [eRole, setERole] = useState<StaffRole>('ventas');
  const [savingEmp, setSavingEmp] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setStaff(await fetchStaff());
    } catch (e: any) {
      notify(`⚠️ ${e.message || 'No se pudo leer el equipo.'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!supaMode()) {
    return (
      <div className="bg-[#FFFDF9] border border-[#E5D7BF] rounded-2xl p-6 text-xs text-[#6A5949] text-center">
        El equipo necesita la nube conectada (Supabase). En modo local no aplica.
      </div>
    );
  }

  const handleChangePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== newPass2) {
      notify('⚠️ Las claves nuevas no coinciden.');
      return;
    }
    setSavingPass(true);
    try {
      await changeMyPassword(newPass);
      setNewPass('');
      setNewPass2('');
      notify('✅ Clave cambiada. Usala la próxima vez que ingreses.');
    } catch (err: any) {
      notify(`⚠️ ${err.message || 'No se pudo cambiar la clave.'}`);
    } finally {
      setSavingPass(false);
    }
  };

  const handleAddEmp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eEmail.trim()) {
      notify('⚠️ Ingresá el email del empleado.');
      return;
    }
    setSavingEmp(true);
    try {
      const saved = await saveStaff({
        email: eEmail.trim().toLowerCase(),
        name: eName.trim() || eEmail.trim().split('@')[0],
        role: eRole,
        active: true,
      });
      setStaff((prev) => {
        const idx = prev.findIndex((x) => x.email === saved.email);
        return idx > -1 ? prev.map((x) => (x.email === saved.email ? saved : x)) : [saved, ...prev];
      });
      setEEmail('');
      setEName('');
      notify(`✅ ${saved.email} agregado como ${ROLE_LABEL[saved.role]}.`);
    } catch (err: any) {
      notify(`⚠️ ${err.message || 'No se pudo guardar.'}`);
    } finally {
      setSavingEmp(false);
    }
  };

  const handleRoleChange = async (email: string, role: StaffRole) => {
    const row = staff.find((x) => x.email === email);
    if (!row) return;
    try {
      const saved = await saveStaff({ ...row, role });
      setStaff((prev) => prev.map((x) => (x.email === email ? saved : x)));
      notify(`✅ ${email} ahora es ${ROLE_LABEL[role]}.`);
    } catch (err: any) {
      notify(`⚠️ ${err.message || 'No se pudo guardar.'}`);
    }
  };

  const handleToggleActive = async (email: string) => {
    const row = staff.find((x) => x.email === email);
    if (!row) return;
    try {
      const saved = await saveStaff({ ...row, active: !row.active });
      setStaff((prev) => prev.map((x) => (x.email === email ? saved : x)));
      notify(saved.active ? `✅ ${email} activado.` : `⏸️ ${email} desactivado (ya no puede entrar).`);
    } catch (err: any) {
      notify(`⚠️ ${err.message || 'No se pudo guardar.'}`);
    }
  };

  const handleDelete = async (email: string) => {
    if (!confirm(`¿Quitar a ${email} del equipo? Su cuenta de la tienda sigue existiendo, pero ya no entra al panel.`)) return;
    try {
      await deleteStaff(email);
      setStaff((prev) => prev.filter((x) => x.email !== email));
      notify(`🗑️ ${email} eliminado del equipo.`);
    } catch (err: any) {
      notify(`⚠️ ${err.message || 'No se pudo eliminar.'}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#FFFDF9] border border-[#E5D7BF] rounded-2xl p-4 shadow-xs">
        <h3 className="font-bold text-sm text-[#1B4E43] mb-1 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4" /> Mi cuenta de dueña
        </h3>
        <p className="text-xs text-[#6A5949] mb-3">
          Conectada como <strong>{currentUser?.email}</strong>. Si tu clave es corta o la sabe alguien más, cambiala acá mismo.
        </p>
        <form onSubmit={handleChangePass} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="relative">
            <KeyRound className="w-4 h-4 text-[#8A7969] absolute left-3 top-3" />
            <input
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="Clave nueva (mín. 6)"
              className="w-full text-xs pl-9 pr-3 py-2.5 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl outline-none"
            />
          </div>
          <div className="relative">
            <KeyRound className="w-4 h-4 text-[#8A7969] absolute left-3 top-3" />
            <input
              type="password"
              value={newPass2}
              onChange={(e) => setNewPass2(e.target.value)}
              placeholder="Repetir clave nueva"
              className="w-full text-xs pl-9 pr-3 py-2.5 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={savingPass}
            className="bg-[#1B4E43] hover:bg-[#256B5C] text-white font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer disabled:opacity-60"
          >
            {savingPass ? 'Guardando...' : 'Cambiar mi clave'}
          </button>
        </form>
      </div>

      <div className="bg-[#FFFDF9] border border-[#E5D7BF] rounded-2xl p-4 shadow-xs">
        <h3 className="font-bold text-sm text-[#1B4E43] mb-1 flex items-center gap-1.5">
          <UserPlus className="w-4 h-4" /> Empleados por puesto
        </h3>
        <p className="text-[11px] text-[#8A7969] mb-3">
          1) La persona se crea su cuenta en la <strong>tienda</strong> con su email.
          2) La agregás acá con <strong>ese mismo email</strong> y su puesto.
          3) Entra al admin y ve solo su sección. Stock no ve ventas y viceversa.
        </p>

        <form onSubmit={handleAddEmp} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-2 mb-4">
          <input
            type="email"
            required
            value={eEmail}
            onChange={(e) => setEEmail(e.target.value)}
            placeholder="email@ejemplo.com"
            className="text-xs p-2.5 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl outline-none"
          />
          <input
            value={eName}
            onChange={(e) => setEName(e.target.value)}
            placeholder="Nombre (opcional)"
            className="text-xs p-2.5 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl outline-none"
          />
          <select
            value={eRole}
            onChange={(e) => setERole(e.target.value as StaffRole)}
            className="text-xs p-2.5 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl outline-none cursor-pointer"
          >
            <option value="ventas">🛍️ Ventas</option>
            <option value="stock">📦 Stock</option>
            <option value="admin">👑 General</option>
          </select>
          <button
            type="submit"
            disabled={savingEmp}
            className="inline-flex items-center justify-center gap-1.5 bg-[#EFA332] hover:bg-[#E39420] text-[#1E170E] font-black text-xs px-4 py-2.5 rounded-xl cursor-pointer disabled:opacity-60"
          >
            <Plus className="w-4 h-4" /> Agregar
          </button>
        </form>

        {loading ? (
          <p className="text-xs text-[#8A7969]">Cargando equipo...</p>
        ) : staff.length === 0 ? (
          <p className="text-xs text-[#8A7969] bg-[#FAF5EC] border border-[#EFE8D8] rounded-xl p-3">
            Todavía no hay empleados. Cuando agregues al primero aparece acá.
          </p>
        ) : (
          <div className="space-y-2">
            {staff.map((s) => (
              <div key={s.email} className={`flex flex-wrap items-center gap-2 border rounded-2xl p-3 text-xs ${s.active ? 'bg-[#FAF5EC] border-[#E8DFC9]' : 'bg-[#F3F4F6] border-[#E5E7EB] opacity-70'}`}>
                <div className="flex-1 min-w-[160px]">
                  <strong className="text-[#1B4E43] block">{s.name || s.email}</strong>
                  <span className="text-[#6A5949]">{s.email}</span>
                </div>
                <select
                  value={s.role}
                  onChange={(e) => handleRoleChange(s.email, e.target.value as StaffRole)}
                  className="text-xs bg-white border border-[#E3D6BE] rounded-xl px-2.5 py-1.5 font-bold cursor-pointer outline-none"
                  title="Cambiar puesto"
                >
                  <option value="ventas">🛍️ Ventas</option>
                  <option value="stock">📦 Stock</option>
                  <option value="admin">👑 General</option>
                </select>
                <button
                  onClick={() => handleToggleActive(s.email)}
                  className={`text-[11px] font-black px-2.5 py-1.5 rounded-full cursor-pointer ${s.active ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#F3F4F6] text-[#6B7280]'}`}
                  title={s.active ? 'Desactivar acceso' : 'Activar acceso'}
                >
                  {s.active ? 'Activo' : 'Inactivo'}
                </button>
                <button onClick={() => handleDelete(s.email)} className="p-1.5 text-red-500 hover:text-red-700 cursor-pointer" title="Quitar del equipo">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
