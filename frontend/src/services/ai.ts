import api from '../config/api';
import type { AISettings } from '../types';

export interface TemplateSuggestion {
  nombre: string;
  categoria: string;
  contenido: string;
  explicacion: string;
}

export const aiService = {
  getSettings: () =>
    api.get<AISettings>('/ai/settings'),

  updateSettings: (data: Partial<{
    enabled: boolean;
    provider: string;
    model: string;
    system_prompt: string;
    max_tokens: number;
    api_key: string;
  }>) => api.put('/ai/settings', data),

  test: (message: string) =>
    api.post<{ response: string; reply: string }>('/ai/test', { message }),

  suggest: (phone: string) =>
    api.get<{ suggestions: string[] }>(
      `/ai/suggest/${encodeURIComponent(phone)}`
    ),

  templateSuggest: (idea: string) =>
    api.post<{ suggestions: TemplateSuggestion[] }>('/ai/template-suggest', { idea }),
};
