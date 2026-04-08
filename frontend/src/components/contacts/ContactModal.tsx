import React, { useState, useEffect } from 'react';
import type { Contact, ContactGroup } from '../../types';
import { contactService } from '../../services/contacts';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { toast } from '../ui/Toast';

const FALLBACK_COUNTRIES = [
  { name: 'Peru', code: 'PE', dial: '+51' },
  { name: 'Argentina', code: 'AR', dial: '+54' },
  { name: 'Bolivia', code: 'BO', dial: '+591' },
  { name: 'Brasil', code: 'BR', dial: '+55' },
  { name: 'Chile', code: 'CL', dial: '+56' },
  { name: 'Colombia', code: 'CO', dial: '+57' },
  { name: 'Ecuador', code: 'EC', dial: '+593' },
  { name: 'Mexico', code: 'MX', dial: '+52' },
  { name: 'Estados Unidos', code: 'US', dial: '+1' },
  { name: 'Espana', code: 'ES', dial: '+34' },
  { name: 'Venezuela', code: 'VE', dial: '+58' },
  { name: 'Uruguay', code: 'UY', dial: '+598' },
  { name: 'Paraguay', code: 'PY', dial: '+595' },
  { name: 'Panama', code: 'PA', dial: '+507' },
  { name: 'Costa Rica', code: 'CR', dial: '+506' },
];

function splitPhone(full: string): { dialCode: string; phone: string } {
  const p = full.replace(/[\s+\-()]/g, '');
  for (const c of [...FALLBACK_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length)) {
    const d = c.dial.replace('+', '');
    if (p.startsWith(d)) return { dialCode: c.dial, phone: p.substring(d.length) };
  }
  return { dialCode: '+51', phone: p };
}

function buildFullPhone(dc: string, phone: string): string {
  let p = phone.replace(/[\s+\-()]/g, '');
  const d = dc.replace('+', '');
  if (p.startsWith(d)) return p;
  if (p.startsWith('0')) p = p.substring(1);
  return d + p;
}

interface ContactModalProps {
  open: boolean;
  contact: Contact | null;
  groups: ContactGroup[];
  onClose: () => void;
  onSaved: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({
  open,
  contact,
  groups,
  onClose,
  onSaved,
}) => {
  const [nombre, setNombre] = useState('');
  const [dialCode, setDialCode] = useState('+51');
  const [telefono, setTelefono] = useState('');
  const [grupoId, setGrupoId] = useState('');
  const [notas, setNotas] = useState('');
  const [dirty, setDirty] = useState(false);

  const isEdit = !!contact;

  useEffect(() => {
    if (open) {
      if (contact) {
        setNombre(contact.nombre);
        const parsed = splitPhone(contact.telefono);
        setDialCode(parsed.dialCode);
        setTelefono(parsed.phone);
        setGrupoId(contact.grupo_id?.toString() || '');
        setNotas(contact.notas || '');
      } else {
        setNombre('');
        setDialCode('+51');
        setTelefono('');
        setGrupoId('');
        setNotas('');
      }
      setDirty(false);
    }
  }, [open, contact]);

  const handleChange = (setter: (v: string) => void) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setter(e.target.value);
    setDirty(true);
  };

  const handleSave = async () => {
    if (!nombre.trim()) return toast('Nombre requerido', false);
    if (!telefono.trim()) return toast('Telefono requerido', false);

    const fullPhone = buildFullPhone(dialCode, telefono);
    const payload = {
      nombre: nombre.trim(),
      telefono: fullPhone,
      grupo_id: grupoId ? Number(grupoId) : null,
      notas: notas.trim(),
    };

    try {
      if (isEdit && contact) {
        await contactService.update(contact.id, payload);
        toast('Contacto actualizado', true);
      } else {
        await contactService.create(payload);
        toast('Contacto creado', true);
      }
      onSaved();
    } catch (e: any) {
      toast(e.message || 'Error guardando', false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} dirty={dirty} title={isEdit ? 'Editar Contacto' : 'Nuevo Contacto'}>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1 text-slate-500">Nombre</label>
          <input
            className="text-xs"
            placeholder="Maria Lopez"
            value={nombre}
            onChange={handleChange(setNombre)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 text-slate-500">Telefono</label>
          <div className="flex gap-2">
            <select
              className="shrink-0 text-xs"
              style={{ width: '140px' }}
              value={dialCode}
              onChange={handleChange(setDialCode)}
            >
              {FALLBACK_COUNTRIES.map((c) => (
                <option key={c.code} value={c.dial}>
                  {c.dial} {c.name}
                </option>
              ))}
            </select>
            <input
              className="text-xs"
              style={{ flex: 1, width: 'auto', minWidth: 0 }}
              placeholder="987654321"
              value={telefono}
              onChange={handleChange(setTelefono)}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 text-slate-500">Grupo</label>
          <select className="text-xs" value={grupoId} onChange={handleChange(setGrupoId)}>
            <option value="">Sin grupo</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 text-slate-500">Notas</label>
          <textarea
            className="text-xs"
            rows={2}
            placeholder="Notas..."
            value={notas}
            onChange={handleChange(setNotas)}
          />
        </div>
      </div>
      <div className="flex gap-2 mt-5">
        <Button variant="primary" className="flex-1 text-xs" onClick={handleSave}>
          Guardar
        </Button>
        <Button variant="secondary" className="flex-1 text-xs" onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </Modal>
  );
};
