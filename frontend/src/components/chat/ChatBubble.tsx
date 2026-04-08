import React from 'react';
import type { ChatMessage } from '../../types';

function fmtTime(dt: string): string {
  if (!dt) return '';
  const d = new Date(dt.replace(' ', 'T') + (dt.includes('Z') || dt.includes('+') ? '' : 'Z'));
  return d.toLocaleString('es-PE', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
}

interface ChatBubbleProps {
  message: ChatMessage;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  if (message.entry_type === 'note') {
    return (
      <div className="mx-auto my-1 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg max-w-[80%] text-center">
        <span className="text-[10px] text-amber-700 font-medium">Nota interna</span>
        <span className="text-[10px] text-amber-500 ml-2">
          {(message as any).advisor_nombre || ''} &middot; {fmtTime(message.created_at)}
        </span>
        <p className="text-[11px] text-amber-800 mt-0.5">{(message as any).note || message.message}</p>
      </div>
    );
  }

  const isIncoming = message.direction === 'incoming';
  const isAI = message.is_ai_response;

  const viaLabel: Record<string, string> = { twilio: 'T', meta: 'M' };
  const viaColor: Record<string, string> = { twilio: 'text-blue-400', meta: 'text-green-500' };
  const via = !isIncoming && viaLabel[message.sent_via] ? message.sent_via : null;

  // Delivery status checkmarks
  const deliveryIcon = !isIncoming ? renderDeliveryStatus(message.delivery_status) : null;

  return (
    <div
      className={`wsp-bubble ${isIncoming ? 'wsp-in' : 'wsp-out'} ${isAI ? 'wsp-ai' : ''}`}
      title={fmtTime(message.created_at)}
    >
      {isAI && <span className="text-[10px] text-mint-600 block mb-0.5">IA</span>}
      <span
        dangerouslySetInnerHTML={{
          __html: escapeHtml(message.message).replace(/\n/g, '<br>'),
        }}
      />
      <span className="text-[9px] text-slate-400 block text-right mt-1">
        {via && (
          <span className={`${viaColor[via]} mr-1`}>{viaLabel[via]}</span>
        )}
        {fmtTime(message.created_at)}
        {deliveryIcon}
      </span>
    </div>
  );
};

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderDeliveryStatus(status?: string): React.ReactNode {
  if (!status) return null;

  const checkColor = status === 'read' ? 'text-blue-500' : 'text-slate-400';

  if (status === 'sent') {
    return (
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className={`inline ml-1 ${checkColor}`}>
        <path d="M4 8l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (status === 'delivered' || status === 'read') {
    return (
      <svg width="16" height="12" viewBox="0 0 20 16" fill="none" className={`inline ml-1 ${checkColor}`}>
        <path d="M2 8l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 8l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  // pending
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="inline ml-1 text-slate-300">
      <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
