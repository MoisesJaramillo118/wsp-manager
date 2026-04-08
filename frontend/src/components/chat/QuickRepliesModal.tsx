import React, { useState, useEffect, useMemo } from 'react';
import type { QuickReply } from '../../types';
import { quickReplyService } from '../../services/quickReplies';
import { toast } from '../ui/Toast';
import { Modal } from '../ui/Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (content: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  saludo: '#22c55e',
  seguimiento: '#f6ad55',
  cierre: '#ec4899',
  informacion: '#3b82f6',
  promocion: '#8b5cf6',
  otro: '#9aa5b4',
};

export const QuickRepliesModal: React.FC<Props> = ({ isOpen, onClose, onSelect }) => {
  const [replies, setReplies] = useState<QuickReply[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      quickReplyService.list().then((r) => setReplies(r.data)).catch(() => toast('Error cargando respuestas rapidas', false));
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    if (!search.trim()) return replies;
    const q = search.toLowerCase();
    return replies.filter(
      (r) =>
        r.titulo.toLowerCase().includes(q) ||
        r.contenido.toLowerCase().includes(q) ||
        r.categoria.toLowerCase().includes(q)
    );
  }, [replies, search]);

  const handleUse = (reply: QuickReply) => {
    onSelect(reply.contenido);
    onClose();
  };

  return (
    <Modal open={isOpen} onClose={onClose} maxWidth="420px">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Respuestas rapidas</h3>
        <button className="btn btn-ghost btn-sm text-[11px]" onClick={onClose}>
          Cerrar
        </button>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar..."
        className="text-xs mb-2"
        autoComplete="off"
      />

      <div className="max-h-[320px] overflow-y-auto space-y-1">
        {filtered.map((reply) => (
          <div
            key={reply.id}
            className="p-2.5 rounded-lg border border-slate-100 hover:border-pink-200 hover:bg-pink-50/30 cursor-pointer transition-all"
            onClick={() => handleUse(reply)}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: CATEGORY_COLORS[reply.categoria] || '#9aa5b4' }}
              />
              <span className="text-xs font-medium">{reply.titulo}</span>
              <span className="badge badge-gray text-[10px] ml-auto">{reply.categoria}</span>
            </div>
            <div className="text-[11px] text-slate-500 line-clamp-2">{reply.contenido}</div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-xs text-slate-400 py-6 text-center">
            {search ? 'Sin resultados' : 'No hay respuestas rapidas'}
          </div>
        )}
      </div>
    </Modal>
  );
};
