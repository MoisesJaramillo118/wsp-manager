import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { toast } from '../ui/Toast';
import { useAuthStore } from '../../stores/authStore';
import api from '../../config/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  remotePhone: string;
  onCreated?: () => void;
}

export const NoteModal: React.FC<Props> = ({ isOpen, onClose, remotePhone, onCreated }) => {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const user = useAuthStore((s) => s.user);

  const handleSave = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try {
      await api.post(`/chats/${encodeURIComponent(remotePhone)}/notes`, {
        note: note.trim(),
        advisor_id: user?.id || null,
        advisor_nombre: user?.nombre || '',
      });
      toast('Nota guardada', true);
      setNote('');
      onCreated?.();
      onClose();
    } catch {
      toast('Error guardando nota', false);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setNote('');
    onClose();
  };

  return (
    <Modal open={isOpen} onClose={handleClose} title="Agregar nota interna">
      <textarea
        className="w-full text-sm border rounded-lg p-2"
        rows={4}
        placeholder="Escribe una nota interna..."
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex justify-end gap-2 mt-3">
        <button className="btn btn-sec btn-sm text-xs" onClick={handleClose}>
          Cancelar
        </button>
        <button
          className="btn btn-pr btn-sm text-xs"
          onClick={handleSave}
          disabled={saving || !note.trim()}
        >
          {saving ? 'Guardando...' : 'Guardar nota'}
        </button>
      </div>
    </Modal>
  );
};
