import React from 'react';
import type { Conversation } from '../../types';

function fmtTime(dt: string): string {
  if (!dt) return '';
  const d = new Date(dt.replace(' ', 'T') + (dt.includes('Z') || dt.includes('+') ? '' : 'Z'));
  return d.toLocaleString('es-PE', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
}

const STATUS_LABELS: Record<string, string> = {
  sin_responder: 'Sin responder',
  ia_atendido: 'IA Atendido',
  necesita_asesor: 'Pide Asesor',
  asignado: 'Asignado',
  resuelto: 'Resuelto',
};

const STATUS_COLORS: Record<string, string> = {
  sin_responder: 'badge-amber',
  ia_atendido: 'badge-petrol',
  necesita_asesor: 'badge-red',
  asignado: 'badge-mint',
  resuelto: 'badge-gray',
};

interface ChatListItemProps {
  chat: Conversation;
  isActive: boolean;
  onClick: (phone: string) => void;
}

export const ChatListItem: React.FC<ChatListItemProps> = ({ chat, isActive, onClick }) => {
  const st = chat.status || 'sin_responder';
  const needsHuman = chat.needs_human;
  const borderColor = needsHuman
    ? 'border-l-4 border-l-red-300'
    : st === 'asignado'
      ? 'border-l-4 border-l-mint-400'
      : '';

  const initials = (chat.remote_name || chat.remote_phone).substring(0, 2).toUpperCase();

  return (
    <div
      className={`chat-list-item ${isActive ? 'active' : ''} ${borderColor}`}
      onClick={() => onClick(chat.remote_phone)}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={`w-9 h-9 rounded-full ${needsHuman ? 'bg-red-300' : 'bg-petrol-400'} flex items-center justify-center text-white font-semibold text-[11px] shrink-0`}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-baseline">
            <span className="font-medium text-xs truncate">
              {chat.remote_name || '+' + chat.remote_phone}
            </span>
            <span className="text-[10px] text-slate-400 shrink-0 ml-2">
              {fmtTime(chat.last_message_at)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 truncate mt-0.5">
            {chat.last_direction !== 'incoming' && 'Tu: '}
            {(chat.last_message || '').substring(0, 50)}
          </p>
          <div className="flex gap-1 mt-1">
            <span className={`badge ${STATUS_COLORS[st] || 'badge-gray'} text-[9px]`}>
              {STATUS_LABELS[st] || st}
            </span>
            {chat.advisor_nombre && (
              <span
                className="text-[9px] px-1.5 py-0.5 rounded-full"
                style={{
                  background: `${chat.advisor_color}18`,
                  color: chat.advisor_color || '#6b4f5c',
                }}
              >
                {chat.advisor_nombre}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
