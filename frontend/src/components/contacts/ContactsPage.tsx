import React, { useEffect, useState, useCallback } from 'react';
import type { Contact, ContactGroup } from '../../types';
import { contactService } from '../../services/contacts';
import { Button } from '../ui/Button';
import { Pagination } from '../ui/Pagination';
import { ExportButton } from '../ui/ExportButton';
import { toast } from '../ui/Toast';
import { Skeleton } from '../ui/SkeletonLoader';
import { useDebounce } from '../../hooks/useDebounce';
import { ContactModal } from './ContactModal';
import { ImportModal } from './ImportModal';

export const ContactsPage: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Modal states
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await contactService.getPaginated(page, 20, debouncedSearch);
      setContacts(result.contacts || []);
      setTotalPages(Math.ceil((result.total || 0) / (result.limit || 20)));
      setTotalItems(result.total || 0);
    } catch (e: any) {
      toast('Error cargando contactos', false);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  const loadGroups = useCallback(async () => {
    try {
      const data = await contactService.getGroups();
      setGroups(data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // Reset page on search/filter change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, groupFilter]);

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setContactModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Eliminar contacto?')) return;
    try {
      await contactService.delete(id);
      toast('Contacto eliminado', true);
      loadContacts();
    } catch (e: any) {
      toast(e.message || 'Error', false);
    }
  };

  const handleNewContact = () => {
    setEditingContact(null);
    setContactModalOpen(true);
  };

  const handleContactSaved = () => {
    setContactModalOpen(false);
    setEditingContact(null);
    loadContacts();
  };

  const handleImportDone = () => {
    setImportModalOpen(false);
    loadContacts();
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await contactService.getAll();
      // Export as CSV from the data
      const data = Array.isArray(blob) ? blob : [];
      const csv = 'nombre,telefono,grupo,notas\n' +
        data.map((c: Contact) => `"${c.nombre}","${c.telefono}","${c.grupo_nombre || ''}","${c.notas || ''}"`).join('\n');
      const b = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(b);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'contactos.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast('Exportado', true);
    } catch (e: any) {
      toast('Error exportando', false);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <h2 className="text-xl font-semibold">Contactos</h2>
        <div className="flex gap-2">
          <ExportButton onClick={handleExport} loading={exporting} label="Exportar" />
          <Button variant="secondary" size="sm" onClick={() => setImportModalOpen(true)}>
            Importar CSV
          </Button>
          <Button variant="primary" size="sm" onClick={handleNewContact}>
            + Nuevo
          </Button>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            type="text"
            placeholder="Buscar..."
            className="max-w-[220px] text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
          />
          <select
            className="max-w-[180px] text-xs"
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
          >
            <option value="">Todos los grupos</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nombre}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <Skeleton variant="table" count={5} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Telefono</th>
                  <th>Grupo</th>
                  <th>Notas</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {contacts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-slate-400 py-6 text-xs">
                      No hay contactos
                    </td>
                  </tr>
                ) : (
                  contacts.map((c) => (
                    <tr key={c.id}>
                      <td className="text-xs font-medium">{c.nombre}</td>
                      <td className="text-xs">{c.telefono}</td>
                      <td>
                        {c.grupo_nombre ? (
                          <span
                            className="badge text-[10px]"
                            style={{
                              background: `${c.grupo_color || '#ec4899'}18`,
                              color: c.grupo_color || '#ec4899',
                            }}
                          >
                            {c.grupo_nombre}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="text-xs text-slate-500 max-w-[200px] truncate">
                        {c.notas || '-'}
                      </td>
                      <td>
                        <div className="flex gap-1">
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
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={setPage}
        />
      </div>

      {/* Contact Modal */}
      <ContactModal
        open={contactModalOpen}
        contact={editingContact}
        groups={groups}
        onClose={() => { setContactModalOpen(false); setEditingContact(null); }}
        onSaved={handleContactSaved}
      />

      {/* Import Modal */}
      <ImportModal
        open={importModalOpen}
        groups={groups}
        onClose={() => setImportModalOpen(false)}
        onImported={handleImportDone}
      />
    </div>
  );
};
