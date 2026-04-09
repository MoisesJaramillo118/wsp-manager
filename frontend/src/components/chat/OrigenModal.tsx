import React, { useState } from 'react';
import { origenService } from '../../services/origen';
import { toast } from '../ui/Toast';
import { Modal } from '../ui/Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  remotePhone: string;
  currentOrigen?: string;
  onSaved?: () => void;
}

const ORIGENES = [
  { value: 'directo', label: 'WhatsApp Directo' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook_ads', label: 'Facebook Ads' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'referido', label: 'Referido' },
  { value: 'tienda', label: 'Tienda Fisica' },
];

export const OrigenModal: React.FC<Props> = ({ isOpen, onClose, remotePhone, currentOrigen, onSaved }) => {
  const [selected, setSelected] = useState(currentOrigen || '');

  const handleSelect = async (origen: string) => {
    setSelected(origen);
    try {
      await origenService.update(remotePhone, { origen });
      toast('Origen guardado');
      onSaved?.();
    } catch {
      toast('Error al guardar origen', false);
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose} title="Origen de la conversacion" maxWidth="380px">
      <div className="space-y-2">
        <label className="block text-xs font-medium mb-1 text-slate-500">
          Como nos encontro este cliente?
        </label>
        <div className="grid grid-cols-2 gap-2">
          {ORIGENES.map((o) => (
            <button
              key={o.value}
              className="p-3 border rounded-xl text-center hover:border-pink-300 hover:bg-pink-50 transition-all"
              style={{
                borderColor: selected === o.value ? '#ec4899' : '#e4e7ec',
                background: selected === o.value ? '#fdf2f8' : undefined,
              }}
              onClick={() => handleSelect(o.value)}
            >
              <div className="text-xs font-medium">{o.label}</div>
            </button>
          ))}
        </div>
      </div>
      <button className="btn btn-sec w-full text-xs mt-3" onClick={onClose}>
        Cerrar
      </button>
    </Modal>
  );
};
