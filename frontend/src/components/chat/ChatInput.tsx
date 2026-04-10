import React, { useState, useRef, useCallback } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  suggestions?: string[];
  onUseSuggestion?: (text: string) => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  suggestions = [],
  onUseSuggestion,
  disabled = false,
}) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const msg = text.trim();
    if (!msg) return;
    onSend(msg);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '44px';
    }
  }, [text, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const el = e.target;
    el.style.height = '44px';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
  };

  return (
    <>
      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <div
          className="flex gap-1.5 px-3 py-1.5 border-t border-slate-100 bg-white overflow-x-auto flex-shrink-0"
          style={{ scrollbarWidth: 'thin' }}
        >
          {suggestions.map((s, i) => (
            <button
              key={i}
              className="ai-sug"
              onClick={() => onUseSuggestion?.(s)}
              title={s}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Typing indicator placeholder */}
      <div className="chat-input-area">
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            rows={2}
            placeholder="Escribe un mensaje..."
            style={{ minHeight: 44 }}
            value={text}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={disabled}
          />
        </div>
        <button
          className="btn btn-pr btn-sm shrink-0 self-end"
          onClick={handleSend}
          disabled={disabled}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22,2 15,22 11,13 2,9" />
          </svg>
        </button>
      </div>
    </>
  );
};
