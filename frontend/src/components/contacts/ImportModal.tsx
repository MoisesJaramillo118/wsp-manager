import React, { useState, useEffect } from 'react';
import type { ContactGroup } from '../../types';
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
];

interface ImportModalProps {
  open: boolean;
  groups: ContactGroup[];
  onClose: () => void;
  onImported: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  open,
  groups,
  onClose,
  onImported,
}) => {
  const [grupoId, setGrupoId] = useState('');
  const [countryCode, setCountryCode] = useState('+51');
  const [csv, setCsv] = useState('');

  useEffect(() => {
    if (open) {
      setGrupoId('');
      setCountryCode('+51');
      setCsv('');
    }
  }, [open]);

  const handleImport = async () => {
    if (!csv.trim()) return toast('Pega datos CSV', false);
    try {
      // Parse CSV and create contacts
      const lines = csv.trim().split('\n');
      let imported = 0;
      for (const line of lines) {
        const parts = line.split(',').map((s) => s.trim().replace(/^"|"$/g, ''));
        if (parts.length < 2) continue;
        const [nombre, telefono] = parts;
        if (!nombre || !telefono || nombre.toLowerCase() === 'nombre') continue;
        let p = telefono.replace(/[\s+\-()]/g, '');
        const dc = countryCode.replace('+', '');
        if (!p.startsWith(dc)) {
          if (p.startsWith('0')) p = p.substring(1);
          p = dc + p;
        }
        try {
          await contactService.create({
            nombre,
            telefono: p,
            grupo_id: grupoId ? Number(grupoId) : null,
            notas: '',
          });
          imported++;
        } catch {
          // skip individual errors
        }
      }
      toast(`${imported} contacto(s) importado(s)`, true);
      onImported();
    } catch (e: any) {
      toast(e.message || 'Error importando', false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Importar Contactos">
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1 text-slate-500">Grupo destino</label>
          <select className="text-xs" value={grupoId} onChange={(e) => setGrupoId(e.target.value)}>
            <option value="">Sin grupo</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 text-slate-500">Codigo de pais</label>
          <select
            className="w-[180px] text-xs"
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
          >
            {FALLBACK_COUNTRIES.map((c) => (
              <option key={c.code} value={c.dial}>
                {c.dial} {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 text-slate-500">Datos CSV</label>
          <textarea
            className="text-xs"
            rows={5}
            placeholder={'nombre,telefono\nMaria Lopez,987654321\nJuan Perez,912345678'}
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
          />
        </div>
      </div>
      <div className="flex gap-2 mt-5">
        <Button variant="primary" className="flex-1 text-xs" onClick={handleImport}>
          Importar
        </Button>
        <Button variant="secondary" className="flex-1 text-xs" onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </Modal>
  );
};
