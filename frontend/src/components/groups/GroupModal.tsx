import React, { useState, useEffect } from 'react';
import { contactService } from '../../services/contacts';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { toast } from '../ui/Toast';

const COLOR_OPTIONS = ['#ec4899', '#f9a8d4', '#b89daa', '#f6ad55', '#ef6b6b'];

const RING_COLORS: Record<string, string> = {
  '#ec4899': 'ring-petrol-500',
  '#f9a8d4': 'ring-mint-500',
  '#b89daa': 'ring-slate-500',
  '#f6ad55': 'ring-amber-400',
  '#ef6b6b': 'ring-red-400',
};

interface GroupModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const GroupModal: React.FC<GroupModalProps> = ({ open, onClose, onSaved }) => {
  const [nombre, setNombre] = useState('');
  const [color, setColor] = useState('#ec4899');

  useEffect(() => {
    if (open) {
      setNombre('');
      setColor('#ec4899');
    }
  }, [open]);

  const handleSave = async () => {
    if (!nombre.trim()) return toast('Nombre requerido', false);
    try {
      await contactService.createGroup({ nombre: nombre.trim(), color });
      toast('Grupo creado', true);
      onSaved();
    } catch (e: any) {
      toast(e.message || 'Error', false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nuevo Grupo">
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1 text-slate-500">Nombre</label>
          <input
            className="text-xs"
            placeholder="Clientes VIP"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 text-slate-500">Color</label>
          <div className="flex gap-2 flex-wrap">
            {COLOR_OPTIONS.map((c) => (
              <label key={c} className="cursor-pointer">
                <input
                  type="radio"
                  name="gcolor"
                  value={c}
                  checked={color === c}
                  onChange={() => setColor(c)}
                  className="hidden peer"
                />
                <div
                  className={`w-7 h-7 rounded-full peer-checked:ring-2 ring-offset-2 ${RING_COLORS[c] || 'ring-slate-500'}`}
                  style={{ background: c }}
                />
              </label>
            ))}
          </div>
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
