import React, { useState, useEffect, useMemo } from 'react';
import type { Advisor } from '../../types';
import { advisorService } from '../../services/advisors';
import { toast } from '../ui/Toast';
import { SearchInput } from '../ui/SearchInput';
import { useDebounce } from '../../hooks/useDebounce';
import { AdvisorModal } from './AdvisorModal';

interface AdvisorAssignment {
  advisor_id: number;
  advisor_nombre: string;
  advisor_color: string;
  chats: { remote_phone: string; remote_name: string; status: string }[];
}

export const AdvisorsPage: React.FC = () => {
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [assignments, setAssignments] = useState<AdvisorAssignment[]>([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAdvisor, setEditingAdvisor] = useState<Advisor | null>(null);
  const [expandedAdvisor, setExpandedAdvisor] = useState<number | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  const loadData = async () => {
    try {
      const [advsRes, assignsRes] = await Promise.all([
        advisorService.list(),
        advisorService.assignments(),
      ]);
      setAdvisors(advsRes.data);
      setAssignments(assignsRes.data);
    } catch {
      toast('Error cargando asesores', false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Feature e: filter advisors by nombre/email/local/especialidad
  const filtered = useMemo(() => {
    if (!debouncedSearch.trim()) return advisors;
    const q = debouncedSearch.toLowerCase();
    return advisors.filter(
      (a) =>
        a.nombre.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        (a.local_tienda || '').toLowerCase().includes(q) ||
        (a.especialidad || '').toLowerCase().includes(q)
    );
  }, [advisors, debouncedSearch]);

  const handleEdit = (advisor: Advisor) => {
    setEditingAdvisor(advisor);
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Eliminar este asesor?')) return;
    try {
      await advisorService.delete(id);
      toast('Asesor eliminado');
      loadData();
    } catch {
      toast('Error al eliminar', false);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingAdvisor(null);
  };

  const handleSaved = () => {
    handleModalClose();
    loadData();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const getAdvisorStats = (advisorId: number) => {
    const assign = assignments.find((a) => a.advisor_id === advisorId);
    if (!assign) return { activos: 0, ventas: 0, perdidas: 0 };
    const activos = assign.chats.filter((c) => c.status === 'abierto' || c.status === 'nuevo').length;
    const ventas = assign.chats.filter((c) => c.status === 'cerrado').length;
    const perdidas = assign.chats.filter((c) => c.status === 'spam').length;
    return { activos, ventas, perdidas };
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <h2 className="text-xl font-semibold">Asesores</h2>
        <div className="flex items-center gap-3">
          {/* Feature e: search input */}
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por nombre, email, local, especialidad..."
            className="w-64"
          />
          <button
            className="btn btn-pr btn-sm"
            onClick={() => { setEditingAdvisor(null); setModalOpen(true); }}
          >
            + Nuevo Asesor
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((advisor) => {
          const stats = getAdvisorStats(advisor.id);
          const capacity = advisor.max_chats > 0
            ? Math.round(((advisor.chats_asignados || 0) / advisor.max_chats) * 100)
            : 0;

          return (
            <div key={advisor.id} className="card">
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                  style={{ background: advisor.color || '#ec4899' }}
                >
                  {getInitials(advisor.nombre)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{advisor.nombre}</div>
                  <span
                    className={`badge text-[10px] ${advisor.rol === 'admin' ? 'badge-petrol' : 'badge-mint'}`}
                  >
                    {advisor.rol === 'admin' ? 'Admin' : 'Asesor'}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    className="btn btn-ghost btn-sm text-[11px]"
                    onClick={() => handleEdit(advisor)}
                  >
                    Editar
                  </button>
                  <button
                    className="btn btn-danger btn-sm text-[11px]"
                    onClick={() => handleDelete(advisor.id)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              <div className="text-xs text-slate-500 space-y-1 mb-3">
                {advisor.local_tienda && <div>Local: {advisor.local_tienda}</div>}
                {advisor.especialidad && <div>Especialidad: {advisor.especialidad}</div>}
                <div>{advisor.email}</div>
              </div>

              {/* Stats boxes */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center p-2 bg-slate-50 rounded-lg">
                  <div className="font-semibold text-sm">{stats.activos}</div>
                  <div className="text-[10px] text-slate-400">Activos</div>
                </div>
                <div className="text-center p-2 bg-slate-50 rounded-lg">
                  <div className="font-semibold text-sm text-green-600">{stats.ventas}</div>
                  <div className="text-[10px] text-slate-400">Ventas</div>
                </div>
                <div className="text-center p-2 bg-slate-50 rounded-lg">
                  <div className="font-semibold text-sm text-red-500">{stats.perdidas}</div>
                  <div className="text-[10px] text-slate-400">Perdidas</div>
                </div>
              </div>

              {/* Capacity bar */}
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>Capacidad</span>
                  <span>{advisor.chats_asignados || 0}/{advisor.max_chats} chats</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(capacity, 100)}%`,
                      background: capacity > 80 ? '#ef6b6b' : capacity > 50 ? '#f6ad55' : '#ec4899',
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chats asignados por asesor */}
      <h3 className="text-sm font-semibold mt-6 mb-3">Chats asignados por asesor</h3>
      <div className="space-y-3">
        {assignments.map((assign) => (
          <div key={assign.advisor_id} className="card" style={{ padding: '12px 16px' }}>
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() =>
                setExpandedAdvisor(expandedAdvisor === assign.advisor_id ? null : assign.advisor_id)
              }
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0"
                style={{ background: assign.advisor_color || '#ec4899' }}
              >
                {getInitials(assign.advisor_nombre)}
              </div>
              <div className="flex-1 text-sm font-medium">{assign.advisor_nombre}</div>
              <span className="badge badge-gray text-[10px]">{assign.chats.length} chats</span>
              <svg
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                style={{
                  transform: expandedAdvisor === assign.advisor_id ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
            {expandedAdvisor === assign.advisor_id && (
              <div className="mt-2 space-y-1">
                {assign.chats.length === 0 && (
                  <div className="text-xs text-slate-400 py-2">Sin chats asignados</div>
                )}
                {assign.chats.map((chat) => (
                  <div
                    key={chat.remote_phone}
                    className="flex items-center gap-2 py-1.5 text-xs border-t border-slate-50"
                  >
                    <span className="font-medium">{chat.remote_name || chat.remote_phone}</span>
                    <span className={`badge text-[10px] ${
                      chat.status === 'abierto' ? 'badge-green' :
                      chat.status === 'nuevo' ? 'badge-mint' :
                      chat.status === 'pendiente' ? 'badge-amber' : 'badge-gray'
                    }`}>
                      {chat.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <AdvisorModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        advisor={editingAdvisor}
        onSaved={handleSaved}
      />
    </div>
  );
};
