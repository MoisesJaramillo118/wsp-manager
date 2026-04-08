import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { Conversation } from '../../types';
import { ChatListItem } from './ChatListItem';
import { useDebounce } from '../../hooks/useDebounce';

type ChatFilter = '' | 'sin_responder' | 'asignado' | 'resuelto';

interface ChatSidebarProps {
  chats: Conversation[];
  currentPhone: string | null;
  filter: ChatFilter;
  onFilterChange: (filter: ChatFilter) => void;
  onSelectChat: (phone: string) => void;
  loading?: boolean;
}

const FILTER_BUTTONS: { label: string; value: ChatFilter }[] = [
  { label: 'Todos', value: '' },
  { label: 'Nuevos', value: 'sin_responder' },
  { label: 'Mios', value: 'asignado' },
  { label: 'Cerrados', value: 'resuelto' },
];

const PAGE_SIZE = 30;

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  chats,
  currentPhone,
  filter,
  onFilterChange,
  onSelectChat,
  loading,
}) => {
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const listRef = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebounce(search, 200);

  // Reset visible count when filter/search changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filter, debouncedSearch]);

  const filtered = debouncedSearch
    ? chats.filter(
        (c) =>
          (c.remote_name || '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          c.remote_phone.includes(debouncedSearch)
      )
    : chats;

  const visibleChats = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  // Infinite scroll
  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el || !hasMore) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 100) {
      setVisibleCount((prev) => prev + PAGE_SIZE);
    }
  }, [hasMore]);

  return (
    <div className="chat-sidebar" style={{ width: 260 }}>
      <div className="p-2 border-b border-slate-100 space-y-1">
        <input
          type="text"
          placeholder="Buscar chat..."
          className="text-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoComplete="off"
        />
        <div className="flex gap-1 flex-wrap">
          {FILTER_BUTTONS.map((f) => (
            <button
              key={f.value}
              className={`btn btn-sm text-[10px] px-2 py-1 ${filter === f.value ? 'btn-pr' : 'btn-sec'}`}
              onClick={() => onFilterChange(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div
        ref={listRef}
        className="overflow-y-auto"
        style={{ maxHeight: 'calc(100vh - 240px)' }}
        onScroll={handleScroll}
      >
        {loading && !chats.length ? (
          <div className="p-6 text-center text-slate-400 text-xs">Cargando...</div>
        ) : !filtered.length ? (
          <div className="p-8 text-center text-slate-400 text-xs">No hay conversaciones</div>
        ) : (
          <>
            {visibleChats.map((c) => (
              <ChatListItem
                key={c.remote_phone}
                chat={c}
                isActive={c.remote_phone === currentPhone}
                onClick={onSelectChat}
              />
            ))}
            {hasMore && (
              <div className="p-3 text-center text-[10px] text-slate-400">
                Mostrando {visibleCount} de {filtered.length}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
