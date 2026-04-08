import api from '../config/api';
import type { DashboardStats, DashboardAlert, WeeklyChartDay } from '../types';

export const dashboardService = {
  stats: () =>
    api.get<DashboardStats>('/dashboard/stats'),

  alerts: () =>
    api.get<DashboardAlert[]>('/dashboard/alerts'),

  advisorPerformance: () =>
    api.get('/dashboard/advisor-performance'),

  weeklyChart: () =>
    api.get<WeeklyChartDay[]>('/dashboard/weekly-chart'),
};
