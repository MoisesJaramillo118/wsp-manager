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
  { value: 'directo', emoji: '\uD83D\uDCAC', label: 'WhatsApp directo' },
  { value: 'instagram', emoji: '\uD83D\uDCF8', label: 'Instagram' },
  { value: 'facebook_ads', emoji: '\uD83D\uDCE2', label: 'Facebook Ads' },
  { value: 'tiktok', emoji: '\uD83C\uDFB5', label: 'TikTok' },
  { value: 'referido', emoji: '\uD83D\uDC65', label: 'Referido' },
  { value: 'tienda', emoji: '\uD83C\uDFEA', label: 'Tienda fisica' },
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
              <div className="text-lg mb-1">{o.emoji}</div>
              <div className="text-[11px]">{o.label}</div>
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
