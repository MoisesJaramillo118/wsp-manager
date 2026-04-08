import api from '../config/api';
import type { Catalog } from '../types';

export const catalogService = {
  getAll: () => api.get<Catalog[]>('/catalogs').then((r) => r.data),
  create: (data: FormData) =>
    api.post<Catalog>('/catalogs', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),
  update: (id: number, data: FormData) =>
    api.put(`/catalogs/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),
  delete: (id: number) => api.delete(`/catalogs/${id}`).then((r) => r.data),
};
