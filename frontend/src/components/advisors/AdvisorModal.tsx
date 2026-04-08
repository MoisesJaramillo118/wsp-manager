import React, { useState, useEffect } from 'react';
import type { Advisor } from '../../types';
import { advisorService } from '../../services/advisors';
import { toast } from '../ui/Toast';
import { Modal } from '../ui/Modal';

const COLORS = ['#ec4899', '#f9a8d4', '#b89daa', '#f6ad55', '#ef6b6b'];
const RING_COLORS = ['ring-petrol-500', 'ring-mint-400', 'ring-slate-500', 'ring-amber-400', 'ring-red-400'];
const LOCALS = ['', 'Local Principal', 'Local 1', 'Local 2'];
const ESPECIALIDADES = ['', 'Moda femenina', 'Promociones', 'Mayoristas', 'Atencion postventa'];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  advisor: Advisor | null;
  onSaved: () => void;
}

export const AdvisorModal: React.FC<Props> = ({ isOpen, onClose, advisor, onSaved }) => {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState('asesor');
  const [local, setLocal] = useState('');
  const [especialidad, setEspecialidad] = useState('');
  const [maxChats, setMaxChats] = useState(10);
  const [color, setColor] = useState(COLORS[0]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (advisor) {
        setNombre(advisor.nombre);
        setEmail(advisor.email);
        setPassword('');
        setRol(advisor.rol);
        setLocal(advisor.local_tienda || '');
        setEspecialidad(advisor.especialidad || '');
        setMaxChats(advisor.max_chats);
        setColor(advisor.color || COLORS[0]);
      } else {
        setNombre('');
        setEmail('');
        setPassword('');
        setRol('asesor');
        setLocal('');
        setEspecialidad('');
        setMaxChats(10);
        setColor(COLORS[0]);
      }
      setDirty(false);
    }
  }, [isOpen, advisor]);

  const markDirty = () => setDirty(true);

  const handleSave = async () => {
    if (!nombre.trim() || !email.trim()) {
      toast('Nombre y email son requeridos', false);
      return;
    }
    if (!advisor && password.length < 4) {
      toast('La contrasena debe tener al menos 4 caracteres', false);
      return;
    }

    const payload = {
      nombre,
      email,
      password: password || '',
      rol,
      local_tienda: local,
      especialidad,
      max_chats: maxChats,
      color,
    };

    setSaving(true);
    try {
      if (advisor) {
        await advisorService.update(advisor.id, payload);
        toast('Asesor actualizado');
      } else {
        await advisorService.create(payload);
        toast('Asesor creado');
      }
      setDirty(false);
      onSaved();
    } catch {
      toast('Error al guardar', false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      dirty={dirty}
      title={advisor ? 'Editar Asesor' : 'Nuevo Asesor'}
    >
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1 text-slate-500">Nombre</label>
          <input
            value={nombre}
            onChange={(e) => { setNombre(e.target.value); markDirty(); }}
            placeholder="Maria Garcia"
            className="text-xs"
            autoComplete="off"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1 text-slate-500">Email (login)</label>
            <input
              value={email}
              onChange={(e) => { setEmail(e.target.value); markDirty(); }}
              type="email"
              placeholder="maria@clemencia.com"
              className="text-xs"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-slate-500">Contrasena</label>
            <input
              value={password}
              onChange={(e) => { setPassword(e.target.value); markDirty(); }}
              type="password"
              placeholder="Minimo 4 caracteres"
              className="text-xs"
              autoComplete="new-password"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1 text-slate-500">Rol</label>
            <select
              value={rol}
              onChange={(e) => { setRol(e.target.value); markDirty(); }}
              className="text-xs"
            >
              <option value="asesor">Asesor/Vendedor</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-slate-500">Local</label>
            <select
              value={local}
              onChange={(e) => { setLocal(e.target.value); markDirty(); }}
              className="text-xs"
            >
              <option value="">Sin asignar</option>
              {LOCALS.filter(Boolean).map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1 text-slate-500">Especialidad</label>
            <select
              value={especialidad}
              onChange={(e) => { setEspecialidad(e.target.value); markDirty(); }}
              className="text-xs"
            >
              <option value="">General</option>
              {ESPECIALIDADES.filter(Boolean).map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-slate-500">Max. chats</label>
            <input
              value={maxChats}
              onChange={(e) => { setMaxChats(Number(e.target.value)); markDirty(); }}
              type="number"
              min={1}
              max={50}
              className="text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1 text-slate-500">Color</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map((c, i) => (
              <label key={c} className="cursor-pointer">
                <input
                  type="radio"
                  name="advcolor"
                  value={c}
                  checked={color === c}
                  onChange={() => { setColor(c); markDirty(); }}
                  className="hidden peer"
                />
                <div
                  className={`w-7 h-7 rounded-full peer-checked:ring-2 ring-offset-2 ${RING_COLORS[i]}`}
                  style={{ background: c }}
                />
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-5">
        <button className="btn btn-pr flex-1 text-xs" onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
        <button className="btn btn-sec flex-1 text-xs" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </Modal>
  );
};
