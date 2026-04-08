import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { ChatMessage, Conversation, Advisor } from '../../types';
import { chatService } from '../../services/chatService';
import { useAuthStore } from '../../stores/authStore';
import { ChatBubble } from './ChatBubble';
import { ChatInput } from './ChatInput';
import { toast } from '../ui/Toast';

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

const OUTCOME_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  venta_cerrada: 'Venta cerrada',
  venta_perdida: 'Venta perdida',
};

const OUTCOME_COLORS: Record<string, string> = {
  pendiente: 'badge-gray',
  venta_cerrada: 'badge-green',
  venta_perdida: 'badge-red',
};

interface ChatMainProps {
  phone: string | null;
  advisors: Advisor[];
  onRefreshList: () => void;
  onOpenQuickReply: () => void;
  onOpenTags: () => void;
  onOpenNote: () => void;
  onOpenReminder: () => void;
  onOpenVenta: () => void;
  onOpenOrigen: () => void;
}

export const ChatMain: React.FC<ChatMainProps> = ({
  phone,
  advisors,
  onRefreshList,
  onOpenQuickReply,
  onOpenTags,
  onOpenNote,
  onOpenReminder,
  onOpenVenta,
  onOpenOrigen,
}) => {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.rol === 'admin';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversation, setConversation] = useState<(Conversation & { outcome?: string }) | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [typing, setTyping] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMsgCountRef = useRef(0);

  const loadChat = useCallback(async (chatPhone: string) => {
    try {
      const data = await chatService.getChatDetail(chatPhone);
      const msgs = data.messages || [];
      setMessages(msgs);
      setConversation(data.conversation || null);
      lastMsgCountRef.current = msgs.length;

      // Scroll to bottom
      setTimeout(() => {
        if (messagesRef.current) {
          messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        }
      }, 50);

      // Load suggestions if last message is incoming
      if (msgs.length > 0 && msgs[msgs.length - 1].direction === 'incoming') {
        const sugs = await chatService.getAISuggestions(chatPhone);
        setSuggestions(sugs);
      } else {
        setSuggestions([]);
      }
    } catch (e: any) {
      toast('Error: ' + (e.message || 'Error cargando chat'), false);
    }
  }, []);

  const refreshChat = useCallback(async () => {
    if (!phone) return;
    try {
      const data = await chatService.getChatDetail(phone);
      const msgs = data.messages || [];
      if (msgs.length !== lastMsgCountRef.current) {
        lastMsgCountRef.current = msgs.length;
        setMessages(msgs);
        setConversation(data.conversation || null);

        // Auto-scroll if near bottom
        const el = messagesRef.current;
        if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 50) {
          setTimeout(() => {
            if (el) el.scrollTop = el.scrollHeight;
          }, 50);
        }

        // Update suggestions
        if (msgs.length > 0 && msgs[msgs.length - 1].direction === 'incoming') {
          const sugs = await chatService.getAISuggestions(phone);
          setSuggestions(sugs);
        } else {
          setSuggestions([]);
        }
      }
    } catch {
      // silent
    }
  }, [phone]);

  // Load chat when phone changes
  useEffect(() => {
    if (!phone) {
      setMessages([]);
      setConversation(null);
      setSuggestions([]);
      return;
    }
    loadChat(phone);
  }, [phone, loadChat]);

  // Poll every 5 seconds
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!phone) return;
    pollRef.current = setInterval(refreshChat, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [phone, refreshChat]);

  const handleSend = useCallback(
    async (message: string) => {
      if (!phone) return;
      try {
        setTyping(true);
        await chatService.sendMessage(phone, message);
        await refreshChat();
      } catch (e: any) {
        toast('Error: ' + (e.message || 'Error enviando'), false);
      } finally {
        setTyping(false);
      }
    },
    [phone, refreshChat]
  );

  const handleUseSuggestion = useCallback(
    (text: string) => {
      handleSend(text);
    },
    [handleSend]
  );

  // Action handlers
  const handleTakeOver = async () => {
    if (!phone || !user?.id) return;
    try {
      await chatService.assignAdvisor(phone, Number(user.id));
      toast('Te hiciste cargo de este chat', true);
      onRefreshList();
      loadChat(phone);
    } catch (e: any) {
      toast(e.message, false);
    }
  };

  const handleRelease = async () => {
    if (!phone) return;
    try {
      await chatService.assignAdvisor(phone, null);
      toast('Chat liberado', true);
      onRefreshList();
      loadChat(phone);
    } catch (e: any) {
      toast(e.message, false);
    }
  };

  const handleResolve = async () => {
    if (!phone) return;
    try {
      await chatService.setStatus(phone, 'resuelto');
      toast('Resuelto', true);
      onRefreshList();
      loadChat(phone);
    } catch (e: any) {
      toast(e.message, false);
    }
  };

  const handleReopen = async () => {
    if (!phone) return;
    try {
      await chatService.setStatus(phone, 'sin_responder');
      toast('Reabierto', true);
      onRefreshList();
      loadChat(phone);
    } catch (e: any) {
      toast(e.message, false);
    }
  };

  const handleAssignAdvisor = async (advisorId: string) => {
    if (!phone || advisorId === '') return;
    const id = Number(advisorId);
    try {
      await chatService.assignAdvisor(phone, id || null);
      toast(id ? 'Asignado' : 'Asesor removido', true);
      onRefreshList();
      loadChat(phone);
    } catch (e: any) {
      toast(e.message, false);
    }
  };

  const handleAutoAssign = async () => {
    if (!phone) return;
    try {
      const r = await chatService.autoAssign(phone);
      toast(`Asignado a ${r.advisor.nombre}`, true);
      onRefreshList();
      loadChat(phone);
    } catch (e: any) {
      toast(e.message, false);
    }
  };

  const handleSetOutcome = async (outcome: string) => {
    if (!phone) return;
    try {
      await chatService.setOutcome(phone, outcome);
      toast('Actualizado', true);
      loadChat(phone);
    } catch (e: any) {
      toast(e.message, false);
    }
  };

  // Derived state
  const st = conversation?.status || 'sin_responder';
  const isResolved = st === 'resuelto';
  const isAssigned = st === 'asignado';
  const isAssignedToMe = conversation?.advisor_id === Number(user?.id);
  const outcome = conversation?.outcome || 'pendiente';

  if (!phone) {
    return (
      <div className="chat-main">
        <div className="border-b border-slate-100 bg-white px-3 py-2">
          <span className="font-medium text-sm">Selecciona una conversacion</span>
        </div>
        <div className="chat-messages">
          <div className="flex items-center justify-center h-full text-slate-400 text-xs">
            Selecciona una conversacion del panel izquierdo
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-main">
      {/* Header Row 1 */}
      <div className="border-b border-slate-100 bg-white">
        <div className="px-3 py-2 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <span className="font-medium text-sm truncate block">
              {conversation?.remote_name || 'Desconocido'}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-[11px] text-slate-400">+{phone}</span>
              <span className={`badge text-[10px] ${STATUS_COLORS[st] || ''}`}>
                {STATUS_LABELS[st] || st}
              </span>
              {outcome !== 'pendiente' && (
                <span className={`badge text-[10px] ${OUTCOME_COLORS[outcome] || ''}`}>
                  {OUTCOME_LABELS[outcome] || outcome}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-1 shrink-0 items-center">
            {!isAdmin && !isResolved && (!isAssigned || !isAssignedToMe) && (
              <button className="btn btn-sm text-[11px] btn-pr" onClick={handleTakeOver}>
                Hacerme cargo
              </button>
            )}
            {!isAdmin && isAssignedToMe && (
              <button className="btn btn-sm text-[11px] btn-sec text-amber-600" onClick={handleRelease}>
                Liberar
              </button>
            )}
            {!isResolved && (
              <button className="btn btn-ghost btn-sm text-[11px]" onClick={handleResolve}>
                Resolver
              </button>
            )}
            {isResolved && (
              <button className="btn btn-ghost btn-sm text-[11px] text-amber-600" onClick={handleReopen}>
                Reabrir
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => loadChat(phone)} title="Actualizar">
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="23,4 23,10 17,10" />
                <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
              </svg>
            </button>
          </div>
        </div>

        {/* Toolbar Row 2 */}
        <div className="px-3 pb-2 flex items-center gap-1.5 flex-wrap">
          {isAdmin && (
            <>
              <select
                className="text-[11px] py-1 px-2 max-w-[120px]"
                value={conversation?.advisor_id?.toString() || ''}
                onChange={(e) => handleAssignAdvisor(e.target.value)}
              >
                <option value="">Asignar asesor...</option>
                <option value="0">-- Sin asignar --</option>
                {advisors.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
              <button className="btn btn-ghost btn-sm text-[11px]" onClick={handleAutoAssign}>
                Auto
              </button>
              <select
                className="text-[11px] py-1 px-2 max-w-[110px]"
                value={outcome}
                onChange={(e) => handleSetOutcome(e.target.value)}
              >
                <option value="pendiente">Pendiente</option>
                <option value="venta_cerrada">Venta cerrada</option>
                <option value="venta_perdida">Venta perdida</option>
              </select>
            </>
          )}
          <span className="w-px h-4 bg-slate-200" />
          <button className="btn btn-ghost btn-sm text-[11px]" onClick={onOpenTags}>Tags</button>
          <button className="btn btn-ghost btn-sm text-[11px]" onClick={onOpenNote}>Nota</button>
          <button className="btn btn-ghost btn-sm text-[11px]" onClick={onOpenReminder}>Recordar</button>
          <button className="btn btn-sm text-[11px] btn-pr" onClick={onOpenVenta}>Venta cerrada</button>
          <button className="btn btn-ghost btn-sm text-[11px]" onClick={onOpenOrigen}>Origen</button>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages" ref={messagesRef}>
        {!messages.length ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-xs">
            No hay mensajes
          </div>
        ) : (
          messages.map((m) => <ChatBubble key={m.id} message={m} />)
        )}
        {typing && (
          <div className="wsp-out text-xs text-slate-400 italic">Enviando...</div>
        )}
      </div>

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        onQuickReply={onOpenQuickReply}
        suggestions={suggestions}
        onUseSuggestion={handleUseSuggestion}
      />
    </div>
  );
};
