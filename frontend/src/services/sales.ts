import api from '../config/api';

export const salesService = {
  create: (data: {
    remote_phone: string;
    advisor_id: number;
    monto: number;
    metodo_pago: string;
    productos_descripcion: string;
    comprobante_url?: string;
    notas?: string;
    origen?: string;
  }) => api.post('/ventas-cerradas', data),

  list: (params?: {
    page?: number;
    limit?: number;
    advisor_id?: number;
    desde?: string;
    hasta?: string;
  }) => api.get('/ventas-cerradas', { params }),

  stats: (params?: { desde?: string; hasta?: string }) =>
    api.get('/ventas-cerradas/stats', { params }),

  export: (params?: { desde?: string; hasta?: string }) =>
    api.get('/ventas-cerradas/export', { params, responseType: 'blob' }),

  porAsesor: (fechaDesde?: string, fechaHasta?: string) => {
    const params: Record<string, string> = {};
    if (fechaDesde) params.fecha_desde = fechaDesde;
    if (fechaHasta) params.fecha_hasta = fechaHasta;
    return api.get('/ventas-cerradas/por-asesor', { params });
  },
};
