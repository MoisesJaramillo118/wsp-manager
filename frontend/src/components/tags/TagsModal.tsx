import React, { useState, useEffect } from 'react';
import type { Tag } from '../../types';
import { tagService } from '../../services/tags';
import { chatService } from '../../services/chats';
import { toast } from '../ui/Toast';
import { Modal } from '../ui/Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  conversationPhone: string;
}

export const TagsModal: React.FC<Props> = ({ isOpen, onClose, conversationPhone }) => {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [assignedTagIds, setAssignedTagIds] = useState<Set<number>>(new Set());
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#ec4899');

  useEffect(() => {
    if (isOpen) {
      loadTags();
    }
  }, [isOpen, conversationPhone]);

  const loadTags = async () => {
    try {
      const [tagsRes, assignedRes] = await Promise.all([
        tagService.list(),
        conversationPhone ? chatService.tags(conversationPhone) : Promise.resolve({ data: [] }),
      ]);
      setAllTags(tagsRes.data);
      setAssignedTagIds(new Set((assignedRes.data as Tag[]).map((t) => t.id)));
    } catch {
      toast('Error cargando etiquetas', false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await tagService.create({ nombre: newName.trim(), color: newColor });
      setNewName('');
      toast('Etiqueta creada');
      loadTags();
    } catch {
      toast('Error al crear etiqueta', false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await tagService.delete(id);
      toast('Etiqueta eliminada');
      loadTags();
    } catch {
      toast('Error al eliminar', false);
    }
  };

  const handleToggleTag = async (tagId: number) => {
    const next = new Set(assignedTagIds);
    if (next.has(tagId)) {
      next.delete(tagId);
    } else {
      next.add(tagId);
    }
    setAssignedTagIds(next);

    // Tag assignment is managed through chat tags endpoint
    // The parent component should handle persisting tag assignments
  };

  return (
    <Modal open={isOpen} onClose={onClose} title="Gestionar etiquetas" maxWidth="400px">
      {/* New tag form */}
      <div className="flex gap-2 mb-3 items-center">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nueva etiqueta..."
          className="text-xs"
          style={{ flex: 1, width: 'auto', minWidth: 0 }}
          autoComplete="off"
          onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
        />
        <input
          type="color"
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          style={{ width: 32, height: 32, border: 'none', padding: 0, borderRadius: 6, cursor: 'pointer', flexShrink: 0 }}
        />
        <button className="btn btn-pr btn-sm text-xs" style={{ flexShrink: 0 }} onClick={handleCreate}>
          +
        </button>
      </div>

      {/* Tag list */}
      <div className="space-y-1 max-h-[240px] overflow-y-auto">
        {allTags.map((tag) => (
          <div key={tag.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-slate-50">
            {conversationPhone && (
              <input
                type="checkbox"
                className="w-3.5 h-3.5"
                checked={assignedTagIds.has(tag.id)}
                onChange={() => handleToggleTag(tag.id)}
              />
            )}
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ background: tag.color }}
            />
            <span className="text-xs flex-1">{tag.nombre}</span>
            <button
              className="btn btn-danger btn-sm text-[10px]"
              onClick={() => handleDelete(tag.id)}
            >
              Eliminar
            </button>
          </div>
        ))}
        {allTags.length === 0 && (
          <div className="text-xs text-slate-400 py-4 text-center">
            No hay etiquetas creadas
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-3">
        <button className="btn btn-sec flex-1 text-xs" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </Modal>
  );
};
