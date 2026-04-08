import React, { useState } from 'react';
import { reminderService } from '../../services/reminders';
import { toast } from '../ui/Toast';
import { Modal } from '../ui/Modal';
import { useConfirmClose } from '../../hooks/useConfirmClose';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  remotePhone: string;
  onCreated?: () => void;
}

export const ReminderModal: React.FC<Props> = ({ isOpen, onClose, remotePhone, onCreated }) => {
  const [note, setNote] = useState('');
  const [remindAt, setRemindAt] = useState('');
  const [saving, setSaving] = useState(false);

  const [dirty, setDirty] = useState(false);
  const { markDirty: hookMarkDirty, markClean: hookMarkClean, confirmClose } = useConfirmClose('reminder-modal');

  const markDirty = () => { setDirty(true); hookMarkDirty(); };
  const markClean = () => { setDirty(false); hookMarkClean(); };
  const handleClose = () => { if (confirmClose()) onClose(); };

  const handleSave = async () => {
    if (!note.trim()) {
      toast('Escribe una nota', false);
      return;
    }
    if (!remindAt) {
      toast('Selecciona fecha y hora', false);
      return;
    }

    setSaving(true);
    try {
      await reminderService.create({
        remote_phone: remotePhone,
        advisor_id: 0, // Will be set by backend from auth token
        note: note.trim(),
        remind_at: remindAt,
      });
      toast('Recordatorio creado');
      setNote('');
      setRemindAt('');
      markClean();
      onCreated?.();
      onClose();
    } catch {
      toast('Error al crear recordatorio', false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={isOpen} onClose={handleClose} dirty={dirty} title="Nuevo recordatorio" maxWidth="420px">
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1 text-slate-500">Nota</label>
          <input
            value={note}
            onChange={(e) => { setNote(e.target.value); markDirty(); }}
            placeholder="Llamar para confirmar pedido..."
            className="text-xs"
            autoComplete="off"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 text-slate-500">Fecha y hora</label>
          <input
            type="datetime-local"
            value={remindAt}
            onChange={(e) => { setRemindAt(e.target.value); markDirty(); }}
            className="text-xs"
          />
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          className="btn btn-pr flex-1 text-xs"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Creando...' : 'Crear recordatorio'}
        </button>
        <button className="btn btn-sec flex-1 text-xs" onClick={handleClose}>
          Cancelar
        </button>
      </div>
    </Modal>
  );
};
