import React, { useEffect, useState, useCallback, useRef } from 'react';
import type { Conversation, Advisor } from '../../types';
import { chatService, type ChatStats } from '../../services/chatService';
import { advisorService } from '../../services/advisors';
import { Badge } from '../ui/Badge';
import { ChatSidebar } from './ChatSidebar';
import { ChatMain } from './ChatMain';
import { TagsModal } from '../tags/TagsModal';
import { ReminderModal } from '../reminders/ReminderModal';
import { VentaCerradaModal } from '../sales/VentaCerradaModal';
import { OrigenModal } from './OrigenModal';
import { QuickRepliesModal } from './QuickRepliesModal';
import { NoteModal } from './NoteModal';

type ChatFilter = '' | 'sin_responder' | 'asignado' | 'resuelto';

export const ChatPage: React.FC = () => {
  const [chats, setChats] = useState<Conversation[]>([]);
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [currentPhone, setCurrentPhone] = useState<string | null>(null);
  const [filter, setFilter] = useState<ChatFilter>('');
  const [stats, setStats] = useState<ChatStats | null>(null);
  const [loading, setLoading] = useState(true);
  const listRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Modal states
  const [tagsOpen, setTagsOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [ventaOpen, setVentaOpen] = useState(false);
  const [origenOpen, setOrigenOpen] = useState(false);
  const [quickReplyOpen, setQuickReplyOpen] = useState(false);

  const loadChats = useCallback(async () => {
    try {
      const url = filter || undefined;
      const data = await chatService.getChats(url);
      setChats(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const loadStats = useCallback(async () => {
    try {
      const s = await chatService.getChatStats();
      setStats(s);
    } catch {
      // silent
    }
  }, []);

  const loadAdvisors = useCallback(async () => {
    try {
      const data = await advisorService.getAll();
      setAdvisors(data);
    } catch {
      // silent
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadChats();
    loadStats();
    loadAdvisors();
  }, [loadChats, loadStats, loadAdvisors]);

  // Check for pending chat open from dashboard
  useEffect(() => {
    const pending = sessionStorage.getItem('openChatPhone');
    if (pending) {
      sessionStorage.removeItem('openChatPhone');
      setCurrentPhone(pending);
    }
  }, []);

  // List refresh every 15s
  useEffect(() => {
    if (listRefreshRef.current) clearInterval(listRefreshRef.current);
    listRefreshRef.current = setInterval(() => {
      loadChats();
      loadStats();
    }, 15000);
    return () => {
      if (listRefreshRef.current) clearInterval(listRefreshRef.current);
    };
  }, [loadChats, loadStats]);

  const handleFilterChange = useCallback(
    (newFilter: ChatFilter) => {
      setFilter(newFilter);
      setLoading(true);
    },
    []
  );

  const handleSelectChat = useCallback((phone: string) => {
    setCurrentPhone(phone);
  }, []);

  const handleRefreshList = useCallback(() => {
    loadChats();
    loadStats();
  }, [loadChats, loadStats]);

  // Conversation info for the currently selected chat
  const currentConv = chats.find((c) => c.remote_phone === currentPhone);

  const handleSendQuickReply = useCallback(
    async (content: string) => {
      if (!currentPhone) return;
      setQuickReplyOpen(false);
      try {
        await chatService.sendMessage(currentPhone, content);
      } catch {
        // handled inside ChatMain
      }
    },
    [currentPhone]
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="text-xl font-semibold">Chat + Ventas</h2>
        {stats && (
          <div className="flex gap-2 flex-wrap text-xs">
            <Badge
              variant="amber"
              className="cursor-pointer"
            >
              {stats.sin_responder} sin responder
            </Badge>
            <Badge
              variant="petrol"
              className="cursor-pointer"
            >
              {stats.sin_asignar} sin asignar
            </Badge>
            <Badge
              variant="red"
              className="cursor-pointer"
            >
              {stats.necesita_asesor} piden asesor
            </Badge>
            <Badge
              variant="mint"
              className="cursor-pointer"
            >
              {stats.asignados} asignados
            </Badge>
            <Badge variant="gray">{stats.total} total</Badge>
          </div>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        <div style={{ display: 'flex', height: 'calc(100vh - 130px)', minHeight: 400, overflow: 'hidden' }}>
          <ChatSidebar
            chats={chats}
            currentPhone={currentPhone}
            filter={filter}
            onFilterChange={handleFilterChange}
            onSelectChat={handleSelectChat}
            loading={loading}
          />
          <ChatMain
            phone={currentPhone}
            advisors={advisors}
            onRefreshList={handleRefreshList}
            onOpenQuickReply={() => setQuickReplyOpen(true)}
            onOpenTags={() => setTagsOpen(true)}
            onOpenNote={() => setNoteOpen(true)}
            onOpenReminder={() => setReminderOpen(true)}
            onOpenVenta={() => setVentaOpen(true)}
            onOpenOrigen={() => setOrigenOpen(true)}
          />
        </div>
      </div>

      {/* Modals */}
      {currentPhone && (
        <>
          <TagsModal
            isOpen={tagsOpen}
            onClose={() => setTagsOpen(false)}
            conversationPhone={currentPhone}
          />
          <NoteModal
            isOpen={noteOpen}
            onClose={() => setNoteOpen(false)}
            remotePhone={currentPhone}
            onCreated={() => handleRefreshList()}
          />
          <ReminderModal
            isOpen={reminderOpen}
            onClose={() => setReminderOpen(false)}
            remotePhone={currentPhone}
            onCreated={() => handleRefreshList()}
          />
          <VentaCerradaModal
            isOpen={ventaOpen}
            onClose={() => setVentaOpen(false)}
            remotePhone={currentPhone}
            remoteName={currentConv?.remote_name || ''}
            onSaved={() => handleRefreshList()}
          />
          <OrigenModal
            isOpen={origenOpen}
            onClose={() => setOrigenOpen(false)}
            remotePhone={currentPhone}
            currentOrigen={currentConv?.origen}
            onSaved={() => handleRefreshList()}
          />
          <QuickRepliesModal
            isOpen={quickReplyOpen}
            onClose={() => setQuickReplyOpen(false)}
            onSelect={handleSendQuickReply}
          />
        </>
      )}
    </div>
  );
};
