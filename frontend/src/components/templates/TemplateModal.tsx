import React, { useState, useEffect } from 'react';
import type { Template } from '../../types';
import { templateService } from '../../services/templates';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { toast } from '../ui/Toast';

interface TemplatePrefill {
  nombre?: string;
  categoria?: string;
  contenido?: string;
}

interface TemplateModalProps {
  open: boolean;
  template: Template | null;
  prefill?: TemplatePrefill | null;
  onClose: () => void;
  onSaved: () => void;
}

export const TemplateModal: React.FC<TemplateModalProps> = ({
  open,
  template,
  prefill,
  onClose,
  onSaved,
}) => {
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('promocion');
  const [contenido, setContenido] = useState('');
  const [dirty, setDirty] = useState(false);

  const isEdit = !!template;

  useEffect(() => {
    if (open) {
      if (template) {
        setNombre(template.nombre);
        setCategoria(template.categoria);
        setContenido(template.contenido);
      } else if (prefill) {
        setNombre(prefill.nombre || '');
        setCategoria(prefill.categoria || 'promocion');
        setContenido(prefill.contenido || '');
      } else {
        setNombre('');
        setCategoria('promocion');
        setContenido('');
      }
      setDirty(false);
    }
  }, [open, template, prefill]);

  const handleChange = (setter: (v: string) => void) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setter(e.target.value);
    setDirty(true);
  };

  const handleSave = async () => {
    if (!nombre.trim()) return toast('Nombre requerido', false);
    if (!contenido.trim()) return toast('Contenido requerido', false);

    const payload = {
      nombre: nombre.trim(),
      categoria,
      contenido: contenido.trim(),
    };

    try {
      if (isEdit && template) {
        await templateService.update(template.id, payload);
        toast('Plantilla actualizada', true);
      } else {
        await templateService.create(payload);
        toast('Plantilla creada', true);
      }
      onSaved();
    } catch (e: any) {
      toast(e.message || 'Error guardando', false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      dirty={dirty}
      title={isEdit ? 'Editar Plantilla' : 'Nueva Plantilla'}
    >
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1 text-slate-500">Nombre</label>
          <input
            className="text-xs"
            placeholder="Promo Verano"
            value={nombre}
            onChange={handleChange(setNombre)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 text-slate-500">Categoria</label>
          <select className="text-xs" value={categoria} onChange={handleChange(setCategoria)}>
            <option value="promocion">Promocion</option>
            <option value="nueva_coleccion">Nueva Coleccion</option>
            <option value="bienvenida">Bienvenida</option>
            <option value="descuento">Descuento</option>
            <option value="estado_pedido">Estado de Pedido</option>
            <option value="personalizado">Personalizado</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 text-slate-500">Contenido</label>
          <textarea
            className="text-xs"
            rows={4}
            placeholder="Escribe el contenido del mensaje (sin nombres personales)"
            value={contenido}
            onChange={handleChange(setContenido)}
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
