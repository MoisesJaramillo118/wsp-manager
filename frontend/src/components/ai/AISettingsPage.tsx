import React, { useState, useEffect, useRef } from 'react';
import type { AISettings } from '../../types';
import { aiService } from '../../services/ai';
import { toast } from '../ui/Toast';

const PROVIDERS: { value: string; label: string; help: string; helpUrl: string }[] = [
  { value: 'openai', label: 'OpenAI (GPT-4o mini / GPT-4o)', help: 'Necesitas una API Key de OpenAI', helpUrl: 'https://platform.openai.com/api-keys' },
  { value: 'groq', label: 'Groq (Gratis - Llama 3.3 70B)', help: 'Obten tu API Key gratis en Groq', helpUrl: 'https://console.groq.com/keys' },
  { value: 'gemini', label: 'Google Gemini (Gratis)', help: 'Obten tu API Key gratis en Google AI Studio', helpUrl: 'https://aistudio.google.com/apikey' },
];

const MODELS: Record<string, { value: string; label: string }[]> = {
  openai: [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (rapido y barato)' },
    { value: 'gpt-4o', label: 'GPT-4o (mas capaz)' },
  ],
  groq: [
    { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile' },
    { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant' },
  ],
  gemini: [
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  ],
};

interface TestMessage {
  text: string;
  direction: 'in' | 'out';
  isAI?: boolean;
}

export const AISettingsPage: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [provider, setProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState('gpt-4o-mini');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [saving, setSaving] = useState(false);
  const [keyStatus, setKeyStatus] = useState('');

  const [testMessages, setTestMessages] = useState<TestMessage[]>([
    { text: 'Envia un mensaje de prueba', direction: 'in', isAI: false },
  ]);
  const [testInput, setTestInput] = useState('');
  const [testing, setTesting] = useState(false);
  const testAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await aiService.getSettings();
      const settings: AISettings = res.data;
      setEnabled(settings.enabled);
      setProvider(settings.provider || 'openai');
      setModel(settings.model || 'gpt-4o-mini');
      setSystemPrompt(settings.system_prompt || '');
      if (settings.has_api_key) {
        setApiKey('');
        setKeyStatus(`Clave configurada: ${settings.api_key_masked}`);
      }
    } catch {
      toast('Error cargando configuracion de IA', false);
    }
  };

  const handleToggle = async () => {
    const newEnabled = !enabled;
    setEnabled(newEnabled);
    try {
      await aiService.updateSettings({ enabled: newEnabled });
      toast(newEnabled ? 'IA activada' : 'IA desactivada');
    } catch {
      setEnabled(!newEnabled);
      toast('Error al cambiar estado', false);
    }
  };

  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    const models = MODELS[newProvider];
    if (models && models.length > 0) {
      setModel(models[0].value);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data: Record<string, unknown> = {
        provider,
        model,
        system_prompt: systemPrompt,
      };
      if (apiKey) data.api_key = apiKey;

      await aiService.updateSettings(data);
      toast('Configuracion guardada');
      setApiKey('');
      loadSettings();
    } catch {
      toast('Error al guardar', false);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testInput.trim()) return;
    const userMsg = testInput.trim();
    setTestInput('');
    setTestMessages((prev) => [...prev, { text: userMsg, direction: 'out' }]);

    setTesting(true);
    try {
      const result = await aiService.test(userMsg);
      setTestMessages((prev) => [...prev, { text: result.data.response, direction: 'in', isAI: true }]);
    } catch {
      setTestMessages((prev) => [...prev, { text: 'Error al probar la IA', direction: 'in', isAI: true }]);
    } finally {
      setTesting(false);
    }

    setTimeout(() => {
      if (testAreaRef.current) {
        testAreaRef.current.scrollTop = testAreaRef.current.scrollHeight;
      }
    }, 100);
  };

  const currentProvider = PROVIDERS.find((p) => p.value === provider);
  const currentModels = MODELS[provider] || [];

  return (
    <div>
      <h2 className="text-xl font-semibold mb-5">IA Automatica</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left card: Configuracion */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-medium text-sm">Configuracion</h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs">{enabled ? 'Activada' : 'Desactivada'}</span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={handleToggle}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-gray-200 rounded-full peer-checked:bg-mint-400 transition-colors" />
                <div className="absolute left-[2px] top-[2px] w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
              </div>
            </label>
          </div>

          <div className="space-y-3">
            {/* Provider */}
            <div>
              <label className="block text-xs font-medium mb-1 text-slate-500">Proveedor</label>
              <select
                className="text-xs"
                value={provider}
                onChange={(e) => handleProviderChange(e.target.value)}
              >
                {PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              {currentProvider && (
                <p className="text-[11px] text-slate-400 mt-1">
                  {currentProvider.help}{' '}
                  <a
                    href={currentProvider.helpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-petrol-500 underline"
                  >
                    Obtener clave
                  </a>
                </p>
              )}
            </div>

            {/* API Key */}
            <div>
              <label className="block text-xs font-medium mb-1 text-slate-500">API Key</label>
              <div className="flex gap-2">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Pega tu API Key..."
                  className="text-xs"
                />
                <button
                  className="btn btn-sec btn-sm text-[11px]"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? 'Ocultar' : 'Ver'}
                </button>
              </div>
              {keyStatus && (
                <p className="text-[11px] text-slate-400 mt-1">{keyStatus}</p>
              )}
            </div>

            {/* Model */}
            <div>
              <label className="block text-xs font-medium mb-1 text-slate-500">Modelo</label>
              <select
                className="text-xs"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                {currentModels.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* System Prompt */}
            <div>
              <label className="block text-xs font-medium mb-1 text-slate-500">Prompt del sistema</label>
              <textarea
                rows={4}
                className="text-xs"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                className="btn btn-pr flex-1 text-xs"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                className="btn btn-sec flex-1 text-xs"
                onClick={() => {
                  setTestMessages([{ text: 'Envia un mensaje de prueba', direction: 'in', isAI: false }]);
                }}
              >
                Probar
              </button>
            </div>
          </div>
        </div>

        {/* Right card: Prueba de IA */}
        <div className="card">
          <h3 className="font-medium text-sm mb-3">Prueba de IA</h3>
          <div
            ref={testAreaRef}
            className="rounded-xl p-4 min-h-[180px] flex flex-col justify-end gap-2"
            style={{ background: '#e5ddd5', maxHeight: 300, overflowY: 'auto' }}
          >
            {testMessages.map((msg, i) => (
              <div
                key={i}
                className={`text-xs ${
                  msg.direction === 'out'
                    ? 'wsp-out'
                    : msg.isAI
                    ? 'wsp-in wsp-ai'
                    : 'wsp-in'
                }`}
              >
                {msg.text}
              </div>
            ))}
            {testing && (
              <div className="wsp-in wsp-ai text-xs">
                <span className="text-slate-400">Escribiendo...</span>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-3">
            <input
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="Escribe un mensaje de prueba..."
              className="text-xs"
              onKeyDown={(e) => { if (e.key === 'Enter') handleTest(); }}
            />
            <button
              className="btn btn-pr btn-sm text-xs"
              onClick={handleTest}
              disabled={testing}
            >
              Probar
            </button>
          </div>

          <div className="mt-3 p-3 bg-petrol-50 rounded-lg">
            <h4 className="font-medium text-xs text-petrol-700 mb-1.5">Como funciona</h4>
            <ul className="text-[11px] text-petrol-600 space-y-1">
              <li>1. Cuando te escriben por WhatsApp, la IA responde automaticamente</li>
              <li>2. Usa contexto de los ultimos mensajes de cada conversacion</li>
              <li>3. Si un chat esta asignado a un asesor, la IA no interviene</li>
              <li>4. Las respuestas IA se marcan con linea verde menta</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
