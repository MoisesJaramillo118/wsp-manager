import React, { useEffect, useState, useCallback } from 'react';
import type { Template } from '../../types';
import { templateService } from '../../services/templates';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/SkeletonLoader';
import { toast } from '../ui/Toast';
import { TemplateModal } from './TemplateModal';

const CATEGORY_TABS: { label: string; value: string }[] = [
  { label: 'Todas', value: '' },
  { label: 'Promociones', value: 'promocion' },
  { label: 'Coleccion', value: 'nueva_coleccion' },
  { label: 'Bienvenida', value: 'bienvenida' },
  { label: 'Descuentos', value: 'descuento' },
  { label: 'Pedido', value: 'estado_pedido' },
];

const CATEGORY_LABELS: Record<string, string> = {
  promocion: 'Promocion',
  nueva_coleccion: 'Nueva Coleccion',
  bienvenida: 'Bienvenida',
  descuento: 'Descuento',
  estado_pedido: 'Estado de Pedido',
  personalizado: 'Personalizado',
};

export const TemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await templateService.getAll();
      setTemplates(data);
    } catch {
      toast('Error cargando plantillas', false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const filteredTemplates = categoryFilter
    ? templates.filter((t) => t.categoria === categoryFilter)
    : templates;

  const handleEdit = (t: Template) => {
    setEditingTemplate(t);
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Eliminar plantilla?')) return;
    try {
      await templateService.delete(id);
      toast('Plantilla eliminada', true);
      loadTemplates();
    } catch (e: any) {
      toast(e.message || 'Error', false);
    }
  };

  const handleNew = () => {
    setEditingTemplate(null);
    setModalOpen(true);
  };

  const handleSaved = () => {
    setModalOpen(false);
    setEditingTemplate(null);
    loadTemplates();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <h2 className="text-xl font-semibold">Plantillas de Mensajes</h2>
        <Button variant="primary" size="sm" onClick={handleNew}>
          + Nueva Plantilla
        </Button>
      </div>

      {/* Category filter tabs */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.value}
            className={`btn btn-sm text-xs ${categoryFilter === tab.value ? 'btn-pr' : 'btn-sec'}`}
            onClick={() => setCategoryFilter(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <Skeleton variant="card" count={3} height={120} />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card className="text-center text-slate-400 py-8 text-xs">
          No hay plantillas{categoryFilter ? ' en esta categoria' : ''}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredTemplates.map((t) => (
            <Card key={t.id}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <Badge variant="petrol" className="text-[9px] mb-1">
                    {CATEGORY_LABELS[t.categoria] || t.categoria}
                  </Badge>
                  <h4 className="font-medium text-sm">{t.nombre}</h4>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mb-3 line-clamp-3" style={{ WebkitLineClamp: 3, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {t.contenido}
              </p>
              <div className="flex gap-1 pt-2 border-t border-slate-100">
                <button
                  className="btn btn-ghost btn-sm text-[11px]"
                  onClick={() => handleEdit(t)}
                >
                  Editar
                </button>
                <button
                  className="btn btn-ghost btn-sm text-[11px] text-red-400"
                  onClick={() => handleDelete(t.id)}
                >
                  Eliminar
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <TemplateModal
        open={modalOpen}
        template={editingTemplate}
        onClose={() => { setModalOpen(false); setEditingTemplate(null); }}
        onSaved={handleSaved}
      />
    </div>
  );
};
