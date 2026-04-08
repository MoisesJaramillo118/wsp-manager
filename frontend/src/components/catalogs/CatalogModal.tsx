import React, { useState, useEffect, useRef } from 'react';
import type { Catalog } from '../../types';
import { catalogService } from '../../services/catalogService';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { toast } from '../ui/Toast';

interface CatalogModalProps {
  open: boolean;
  catalog: Catalog | null;
  onClose: () => void;
  onSaved: () => void;
}

export const CatalogModal: React.FC<CatalogModalProps> = ({
  open,
  catalog,
  onClose,
  onSaved,
}) => {
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('general');
  const [descripcion, setDescripcion] = useState('');
  const [keywords, setKeywords] = useState('');
  const [dirty, setDirty] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isEdit = !!catalog;

  useEffect(() => {
    if (open) {
      if (catalog) {
        setNombre(catalog.nombre);
        setCategoria(catalog.categoria);
        setDescripcion(catalog.descripcion || '');
        setKeywords(catalog.keywords || '');
      } else {
        setNombre('');
        setCategoria('general');
        setDescripcion('');
        setKeywords('');
      }
      setDirty(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }, [open, catalog]);

  const handleChange = (setter: (v: string) => void) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setter(e.target.value);
    setDirty(true);
  };

  const handleSave = async () => {
    if (!nombre.trim()) return toast('Nombre requerido', false);

    const formData = new FormData();
    formData.append('nombre', nombre.trim());
    formData.append('categoria', categoria);
    formData.append('descripcion', descripcion.trim());
    formData.append('keywords', keywords.trim());

    const file = fileRef.current?.files?.[0];
    if (file) {
      if (file.size > 30 * 1024 * 1024) {
        return toast('El archivo no debe superar 30 MB', false);
      }
      formData.append('file', file);
    } else if (!isEdit) {
      return toast('Selecciona un archivo PDF', false);
    }

    try {
      if (isEdit && catalog) {
        await catalogService.update(catalog.id, formData);
        toast('Catalogo actualizado', true);
      } else {
        await catalogService.create(formData);
        toast('Catalogo subido', true);
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
      title={isEdit ? 'Editar Catalogo' : 'Subir Catalogo'}
    >
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1 text-slate-500">
            Nombre del catalogo
          </label>
          <input
            className="text-xs"
            placeholder="Coleccion Verano 2026"
            value={nombre}
            onChange={handleChange(setNombre)}
            autoComplete="off"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 text-slate-500">Categoria</label>
          <select className="text-xs" value={categoria} onChange={handleChange(setCategoria)}>
            <option value="general">General</option>
            <option value="verano">Verano</option>
            <option value="invierno">Invierno</option>
            <option value="nueva_coleccion">Nueva Coleccion</option>
            <option value="promociones">Promociones</option>
            <option value="mayorista">Mayorista</option>
            <option value="accesorios">Accesorios</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 text-slate-500">Descripcion breve</label>
          <textarea
            className="text-xs"
            rows={2}
            placeholder="Catalogo de ropa femenina temporada verano..."
            value={descripcion}
            onChange={handleChange(setDescripcion)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 text-slate-500">
            Palabras clave (separadas por comas)
          </label>
          <input
            className="text-xs"
            placeholder="verano, blusas, vestidos, faldas"
            value={keywords}
            onChange={handleChange(setKeywords)}
            autoComplete="off"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Cuando el cliente mencione alguna de estas palabras, se enviara este catalogo
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 text-slate-500">Archivo PDF</label>
          <div className="relative">
            <input
              type="file"
              ref={fileRef}
              accept=".pdf"
              className="text-xs w-full border rounded-lg p-2 bg-slate-50"
              onChange={() => setDirty(true)}
            />
            <p className="text-[11px] text-slate-400 mt-1">Maximo 30 MB</p>
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-5">
        <Button variant="primary" className="flex-1 text-xs" onClick={handleSave}>
          {isEdit ? 'Guardar' : 'Subir'}
        </Button>
        <Button variant="secondary" className="flex-1 text-xs" onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </Modal>
  );
};
