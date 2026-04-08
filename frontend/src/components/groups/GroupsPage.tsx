import React, { useEffect, useState, useCallback } from 'react';
import type { ContactGroup } from '../../types';
import { contactService } from '../../services/contacts';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/SkeletonLoader';
import { toast } from '../ui/Toast';
import { GroupModal } from './GroupModal';

export const GroupsPage: React.FC = () => {
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const data = await contactService.getGroups();
      setGroups(data);
    } catch {
      toast('Error cargando grupos', false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Eliminar grupo?')) return;
    try {
      await contactService.deleteGroup(id);
      toast('Grupo eliminado', true);
      loadGroups();
    } catch (e: any) {
      toast(e.message || 'Error', false);
    }
  };

  const handleSaved = () => {
    setModalOpen(false);
    loadGroups();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <h2 className="text-xl font-semibold">Grupos de Contactos</h2>
        <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
          + Nuevo Grupo
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Skeleton variant="card" count={3} height={100} />
        </div>
      ) : groups.length === 0 ? (
        <Card className="text-center text-slate-400 py-8 text-xs">
          No hay grupos. Crea uno para organizar tus contactos.
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {groups.map((g) => (
            <Card key={g.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full shrink-0"
                    style={{ background: g.color }}
                  />
                  <div>
                    <h4 className="font-medium text-sm">{g.nombre}</h4>
                    <span className="text-[11px] text-slate-400">
                      {g.total_contacts} contacto{g.total_contacts !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <button
                  className="btn btn-ghost btn-sm text-[11px] text-red-400"
                  onClick={() => handleDelete(g.id)}
                >
                  Eliminar
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <GroupModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
};
