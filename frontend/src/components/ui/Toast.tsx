import React, { useState, useEffect, useCallback } from 'react';

interface ToastMessage {
  id: number;
  text: string;
  ok: boolean;
}

let toastListener: ((msg: string, ok: boolean) => void) | null = null;
let nextId = 0;

export function toast(message: string, ok: boolean = true) {
  if (toastListener) toastListener(message, ok);
}

export const ToastContainer: React.FC = () => {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const addMessage = useCallback((text: string, ok: boolean) => {
    const id = ++nextId;
    setMessages((prev) => [...prev, { id, text, ok }]);
    setTimeout(() => {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    }, 3000);
  }, []);

  useEffect(() => {
    toastListener = addMessage;
    return () => { toastListener = null; };
  }, [addMessage]);

  return (
    <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 200, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {messages.map((m) => (
        <div
          key={m.id}
          className={`toast show ${m.ok ? 'toast-ok' : 'toast-err'}`}
          style={{ position: 'relative', transform: 'translateX(0)' }}
        >
          {m.text}
        </div>
      ))}
    </div>
  );
};
