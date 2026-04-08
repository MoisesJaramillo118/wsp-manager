import api from '../config/api';
import type { AISettings } from '../types';

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

  test: (prompt: string) =>
    api.post<{ response: string }>('/ai/test', { prompt }),

  suggest: (phone: string) =>
    api.get<{ suggestions: string[] }>(
      `/ai/suggest/${encodeURIComponent(phone)}`
    ),
};
