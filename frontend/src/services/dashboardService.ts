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
};
