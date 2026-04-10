import React, { useState, useEffect, useMemo } from 'react';
import type { Contact, ContactGroup, Template } from '../../types';
import { contactService } from '../../services/contacts';
import { groupService } from '../../services/groups';
import { templateService } from '../../services/templates';
import { messagingService } from '../../services/messaging';
import { toast } from '../ui/Toast';

type SendMode = 'individual' | 'group' | 'multiple';

export const SendPage: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);

  const [mode, setMode] = useState<SendMode>('individual');
  const [selectedContact, setSelectedContact] = useState<number | ''>('');
  const [selectedGroup, setSelectedGroup] = useState<number | ''>('');
  const [selectedMultiple, setSelectedMultiple] = useState<Set<number>>(new Set());
  const [selectedTemplate, setSelectedTemplate] = useState<number | ''>('');
  const [message, setMessage] = useState('');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    // Feature f: Load ALL contacts (not limited to 500)
    contactService.all().then((r) => setContacts(r.data)).catch(() => toast('Error cargando contactos', false));
    groupService.list().then((r) => setGroups(r.data)).catch(() => {});
    templateService.list().then((r) => setTemplates(r.data)).catch(() => {});
  }, []);

  const handleTemplateChange = (templateId: number | '') => {
    setSelectedTemplate(templateId);
    if (templateId !== '') {
      const tpl = templates.find((t) => t.id === templateId);
      if (tpl) setMessage(tpl.contenido);
    }
  };

  const toggleMultipleContact = (id: number) => {
    setSelectedMultiple((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const previewText = useMemo(() => {
    return message;
  }, [message]);

  const recipientCount = useMemo(() => {
    if (mode === 'individual') return selectedContact ? 1 : 0;
    if (mode === 'group') {
      if (!selectedGroup) return 0;
      const g = groups.find((gr) => gr.id === Number(selectedGroup));
      return g?.total_contacts || 0;
    }
    return selectedMultiple.size;
  }, [mode, selectedContact, selectedGroup, selectedMultiple, groups]);

  const handleSend = async () => {
    if (!message.trim()) {
      toast('Escribe un mensaje', false);
      return;
    }
    if (recipientCount === 0) {
      toast('Selecciona al menos un destinatario', false);
      return;
    }

    setSending(true);
    try {
      if (scheduleEnabled && scheduleDate) {
        await messagingService.sendSchedule({
          grupo_id: mode === 'group' ? Number(selectedGroup) : undefined,
          contact_ids: mode === 'multiple'
            ? contacts.filter((c) => selectedMultiple.has(c.id)).map((c) => c.id)
            : mode === 'individual'
            ? [Number(selectedContact)]
            : undefined,
          contenido: message,
          scheduled_at: scheduleDate,
        });
      } else if (mode === 'individual') {
        await messagingService.sendIndividual({
          contact_id: Number(selectedContact),
          contenido: message,
        });
      } else {
        await messagingService.sendBulk({
          grupo_id: mode === 'group' ? Number(selectedGroup) : undefined,
          contact_ids: mode === 'multiple'
            ? contacts.filter((c) => selectedMultiple.has(c.id)).map((c) => c.id)
            : undefined,
          contenido: message,
        });
      }
      toast(scheduleEnabled ? 'Mensaje programado' : 'Mensaje enviado');
      setMessage('');
      setSelectedContact('');
      setSelectedGroup('');
      setSelectedMultiple(new Set());
      setScheduleEnabled(false);
      setScheduleDate('');
      setSelectedTemplate('');
    } catch {
      toast('Error al enviar mensaje', false);
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-5">Enviar Mensajes</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left card: Componer */}
        <div className="card">
          <h3 className="font-medium text-sm mb-4">Componer</h3>
          <div className="space-y-3">
            {/* Destinatarios */}
            <div>
              <label className="block text-xs font-medium mb-1 text-slate-500">Destinatarios</label>
              <select
                className="text-xs"
                value={mode}
                onChange={(e) => setMode(e.target.value as SendMode)}
              >
                <option value="individual">Contacto individual</option>
                <option value="group">Grupo completo</option>
                <option value="multiple">Multiples contactos</option>
              </select>

              {mode === 'individual' && (
                <select
                  className="mt-2 text-xs"
                  value={selectedContact}
                  onChange={(e) => setSelectedContact(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">Seleccionar contacto...</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} ({c.telefono})
                    </option>
                  ))}
                </select>
              )}

              {mode === 'group' && (
                <select
                  className="mt-2 text-xs"
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">Seleccionar grupo...</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nombre} ({g.total_contacts} contactos)
                    </option>
                  ))}
                </select>
              )}

              {mode === 'multiple' && (
                <div className="mt-2">
                  <div className="border rounded-lg p-2 max-h-40 overflow-y-auto space-y-1 text-xs">
                    {contacts.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 cursor-pointer py-0.5">
                        <input
                          type="checkbox"
                          className="w-3.5 h-3.5"
                          checked={selectedMultiple.has(c.id)}
                          onChange={() => toggleMultipleContact(c.id)}
                        />
                        <span>{c.nombre}</span>
                        <span className="text-slate-400">({c.telefono})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Template */}
            <div>
              <label className="block text-xs font-medium mb-1 text-slate-500">Plantilla (opcional)</label>
              <select
                className="text-xs"
                value={selectedTemplate}
                onChange={(e) => handleTemplateChange(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Mensaje libre...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs font-medium mb-1 text-slate-500">Mensaje</label>
              <textarea
                rows={4}
                className="text-xs"
                placeholder="Escribe tu mensaje..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <div className="text-[11px] text-slate-400 mt-1">
                <span>{message.length}</span> caracteres
              </div>
            </div>

            {/* Schedule */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-3.5 h-3.5"
                  checked={scheduleEnabled}
                  onChange={(e) => setScheduleEnabled(e.target.checked)}
                />
                <span className="text-xs">Programar envio</span>
              </label>
              {scheduleEnabled && (
                <input
                  type="datetime-local"
                  className="mt-2 text-xs"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                />
              )}
            </div>

            {/* Send button */}
            <button
              className="btn btn-pr w-full justify-center text-sm"
              onClick={handleSend}
              disabled={sending}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22,2 15,22 11,13 2,9" />
              </svg>
              {sending ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </div>

        {/* Right card: Vista previa */}
        <div className="card">
          <h3 className="font-medium text-sm mb-4">Vista previa</h3>
          <div
            className="rounded-xl p-5 min-h-[240px] flex flex-col justify-end"
            style={{ background: '#e5ddd5' }}
          >
            <div className="wsp-out text-xs">
              {previewText ? (
                <span style={{ whiteSpace: 'pre-wrap' }}>{previewText}</span>
              ) : (
                <span className="text-slate-400">El mensaje aparecera aqui...</span>
              )}
            </div>
          </div>
          <div className="mt-3 p-3 bg-slate-50 rounded-lg text-xs text-slate-500">
            {recipientCount > 0 && message.trim()
              ? `Se enviara a ${recipientCount} destinatario(s)`
              : 'Selecciona destinatarios y escribe un mensaje.'}
          </div>
        </div>
      </div>
    </div>
  );
};
