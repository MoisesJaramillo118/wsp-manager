import React, { useEffect, useState, useCallback } from 'react';
import type { Catalog } from '../../types';
import { catalogService } from '../../services/catalogService';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/SkeletonLoader';
import { toast } from '../ui/Toast';
import { CatalogModal } from './CatalogModal';

const CAT_LABELS: Record<string, string> = {
  general: 'General',
  verano: 'Verano',
  invierno: 'Invierno',
  nueva_coleccion: 'Nueva Coleccion',
  promociones: 'Promociones',
  mayorista: 'Mayorista',
  accesorios: 'Accesorios',
};

function formatSize(bytes: number): string {
  const kb = Math.round(bytes / 1024);
  return kb > 1024 ? (kb / 1024).toFixed(1) + ' MB' : kb + ' KB';
}

export const CatalogsPage: React.FC = () => {
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCatalog, setEditingCatalog] = useState<Catalog | null>(null);

  const loadCatalogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await catalogService.getAll();
      setCatalogs(data);
    } catch {
      toast('Error cargando catalogos', false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalogs();
  }, [loadCatalogs]);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Eliminar catalogo?')) return;
    try {
      await catalogService.delete(id);
      toast('Catalogo eliminado', true);
      loadCatalogs();
    } catch (e: any) {
      toast(e.message || 'Error', false);
    }
  };

  const handleEdit = (c: Catalog) => {
    setEditingCatalog(c);
    setModalOpen(true);
  };

  const handleNew = () => {
    setEditingCatalog(null);
    setModalOpen(true);
  };

  const handleSaved = () => {
    setModalOpen(false);
    setEditingCatalog(null);
    loadCatalogs();
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-semibold">Catalogos</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Sube PDFs y se envian automaticamente cuando un cliente los pida
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={handleNew}>
          + Subir Catalogo
        </Button>
      </div>

      {/* Info card */}
      <Card className="mb-4">
        <div className="flex items-start gap-3 text-xs">
          <svg
            width="20"
            height="20"
            fill="none"
            stroke="#ec4899"
            strokeWidth="2"
            viewBox="0 0 24 24"
            className="shrink-0 mt-0.5"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <div>
            <p className="font-medium text-slate-700 mb-1">Como funciona el envio automatico</p>
            <ul className="text-slate-500 space-y-0.5 list-disc ml-4">
              <li>
                Cuando un cliente escribe pidiendo un <b>catalogo</b>, el sistema detecta la solicitud
              </li>
              <li>Si hay un catalogo que coincida con lo que pide, se envia automaticamente el PDF</li>
              <li>
                Usa <b>palabras clave</b> para que el sistema identifique cual catalogo enviar
              </li>
              <li>
                Si no hay coincidencia especifica, se envia el catalogo marcado como <b>General</b>
              </li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Skeleton variant="card" count={3} height={160} />
        </div>
      ) : catalogs.length === 0 ? (
        <Card className="text-center text-slate-400 py-8 text-xs">
          No hay catalogos. Sube uno para empezar.
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {catalogs.map((c) => (
            <Card key={c.id}>
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-12 bg-red-50 rounded-lg flex items-center justify-center shrink-0">
                  <svg
                    width="20"
                    height="20"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                  >
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14,2 14,8 20,8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">{c.nombre}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="petrol" className="text-[9px]">
                      {CAT_LABELS[c.categoria] || c.categoria}
                    </Badge>
                    <span className="text-[10px] text-slate-400">{formatSize(c.filesize)}</span>
                  </div>
                </div>
              </div>

              {c.descripcion && (
                <p className="text-[11px] text-slate-500 mb-2">{c.descripcion}</p>
              )}

              {c.keywords && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {c.keywords.split(',').map((k, i) => (
                    <span
                      key={i}
                      className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500"
                    >
                      {k.trim()}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <svg
                    width="12"
                    height="12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="7,10 12,15 17,10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  {c.downloads} envios
                </div>
                <div className="flex gap-1">
                  {c.filepath && (
                    <a
                      href={`/wsp-api/uploads/${c.filepath}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-ghost btn-sm text-[11px]"
                    >
                      Ver
                    </a>
                  )}
                  <button
                    className="btn btn-ghost btn-sm text-[11px]"
                    onClick={() => handleEdit(c)}
                  >
                    Editar
                  </button>
                  <button
                    className="btn btn-ghost btn-sm text-[11px] text-red-400"
                    onClick={() => handleDelete(c.id)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CatalogModal
        open={modalOpen}
        catalog={editingCatalog}
        onClose={() => {
          setModalOpen(false);
          setEditingCatalog(null);
        }}
        onSaved={handleSaved}
      />
    </div>
  );
};
