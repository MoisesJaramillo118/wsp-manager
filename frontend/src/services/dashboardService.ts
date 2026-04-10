import api from '../config/api';
import type { DashboardAlert, WeeklyChartDay } from '../types';

export interface AdvisorPerformance {
  id: number;
  nombre: string;
  color: string;
  rol: string;
  local_tienda: string;
  especialidad: string;
  max_chats: number;
  chats_activos: number;
  ventas_cerradas: number;
  ventas_perdidas: number;
  avg_response_seconds: number | null;
}

export interface DashboardData {
  chats_activos: number;
  sin_responder: number;
  necesita_asesor: number;
  asignados: number;
  ventas_cerradas: number;
  ventas_cerradas_hoy: number;
  ventas_perdidas: number;
  ventas_perdidas_hoy: number;
  enviados_hoy: number;
  programados: number;
  total_contactos: number;
  fallidos_hoy: number;
  total_conversaciones: number;
  resueltos: number;
  ia_atendido: number;
  dinero_hoy: number;
  dinero_semana: number;
  dinero_mes: number;
  ventas_registradas_hoy: number;
  ventas_registradas_mes: number;
  total_ventas_cerradas: number;
  total_chats_unicos: number;
  tasa_conversion_global: number;
}

export interface ConversionDay {
  fecha: string;
  chats_nuevos: number;
  ventas: number;
  tasa: number;
}

export interface FunnelData {
  chats_recibidos: number;
  chats_asignados: number;
  ventas_cerradas: number;
  monto_total: number;
  tasa_asignacion: number;
  tasa_cierre: number;
  ticket_promedio: number;
}

export interface AdvisorKPI {
  id: number;
  nombre: string;
  color: string;
  especialidad: string;
  local_tienda: string;
  en_turno: boolean;
  ventas_total: number;
  monto_total: number;
  ventas_hoy: number;
  monto_hoy: number;
  ventas_semana: number;
  monto_semana: number;
  ventas_mes: number;
  monto_mes: number;
  chats_atendidos_total: number;
  chats_activos: number;
  tasa_conversion: number;
  ticket_promedio_total: number;
  ticket_promedio_hoy: number;
  ticket_promedio_semana: number;
  ticket_promedio_mes: number;
}

export interface AdminKPIData {
  advisors: AdvisorKPI[];
  funnel: {
    hoy: FunnelData;
    semana: FunnelData;
    mes: FunnelData;
    total: FunnelData;
  };
}

export const dashboardService = {
  async getStats(): Promise<DashboardData> {
    const { data } = await api.get('/dashboard/stats');
    return data;
  },

  async getAlerts(minutes: number = 20): Promise<DashboardAlert[]> {
    const { data } = await api.get(`/dashboard/alerts?minutes=${minutes}`);
    return data;
  },

  async getAdvisorPerformance(): Promise<AdvisorPerformance[]> {
    const { data } = await api.get('/dashboard/advisor-performance');
    return data;
  },

  async getWeeklyChart(): Promise<WeeklyChartDay[]> {
    const { data } = await api.get('/dashboard/weekly-chart');
    return data;
  },

  conversionDiaria: () =>
    api.get<ConversionDay[]>('/dashboard/conversion-diaria').then((r) => r.data),

  getAdminKPI: async (): Promise<AdminKPIData> => {
    const { data } = await api.get('/dashboard/admin-kpi');
    return data;
  },
};
