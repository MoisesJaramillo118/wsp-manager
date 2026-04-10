import React, { useState, useEffect } from 'react';
import type { WeeklyChartDay } from '../../types';
import { dashboardService, type ConversionDay } from '../../services/dashboardService';
import { salesService } from '../../services/sales';
import { toast } from '../ui/Toast';
import { ExportButton } from '../ui/ExportButton';
import { useAuthStore } from '../../stores/authStore';

interface AdvisorPerformance {
  id: number;
  nombre: string;
  local_tienda: string;
  especialidad: string;
  chats_activos: number;
  ventas_cerradas: number;
  ventas_perdidas: number;
  resueltos: number;
  total_atendidos: number;
  avg_response_seconds: number | null;
}

export const StatsPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.rol === 'admin';

  const [totalConv, setTotalConv] = useState(0);
  const [totalVentas, setTotalVentas] = useState(0);
  const [tasaConv, setTasaConv] = useState('0%');
  const [totalContactos, setTotalContactos] = useState(0);
  const [tasaConvGlobal, setTasaConvGlobal] = useState('0%');
  const [advisorPerf, setAdvisorPerf] = useState<AdvisorPerformance[]>([]);
  const [weekly, setWeekly] = useState<WeeklyChartDay[]>([]);
  const [conversionDiaria, setConversionDiaria] = useState<ConversionDay[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadStats();
    dashboardService.conversionDiaria().then(setConversionDiaria).catch(() => {});
  }, []);

  const loadStats = async () => {
    try {
      const [dashboard, weeklyData] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getWeeklyChart(),
      ]);

      setTotalConv(dashboard.total_conversaciones || 0);
      const ventas = dashboard.ventas_cerradas || 0;
      setTotalVentas(ventas);
      const total = ventas;
      setTasaConv(total > 0 ? `${Math.round((ventas / total) * 100)}%` : '0%');
      setTotalContactos(dashboard.total_contactos || 0);
      setTasaConvGlobal(`${dashboard.tasa_conversion_global || 0}%`);
      setWeekly(weeklyData);

      if (isAdmin) {
        try {
          const perfData = await dashboardService.getAdvisorPerformance();
          setAdvisorPerf(perfData as unknown as AdvisorPerformance[]);
        } catch {
          // may not have permission
        }
      }
    } catch {
      toast('Error cargando estadisticas', false);
    }
  };

  // Feature h: export stats
  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await salesService.export();
      const blob = res.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `estadisticas_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast('Exportacion descargada');
    } catch {
      toast('Error al exportar', false);
    } finally {
      setExporting(false);
    }
  };

  const maxChart = Math.max(...weekly.map((d) => Math.max(d.enviados, d.chats_entrantes, d.ventas)), 1);

  const dayLabel = (fecha: string) => {
    const d = new Date(fecha);
    return ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'][d.getDay()] || fecha;
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <h2 className="text-xl font-semibold">Estadisticas</h2>
        {/* Feature h: Export button */}
        <ExportButton onClick={handleExport} loading={exporting} />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-5">
        <div className="stat-card">
          <div className="stat-num">{totalConv}</div>
          <div className="stat-label">Conversaciones totales</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{totalVentas}</div>
          <div className="stat-label">Ventas cerradas</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{tasaConv}</div>
          <div className="stat-label">Tasa de conversion</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{totalContactos}</div>
          <div className="stat-label">Total contactos</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{tasaConvGlobal}</div>
          <div className="stat-label">Tasa conversion</div>
        </div>
      </div>

      {/* Advisor performance table (admin only) */}
      {isAdmin && (
        <div className="card mb-4">
          <h3 className="font-semibold text-sm mb-3">Rendimiento por asesor</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Asesor</th>
                  <th>Local</th>
                  <th>Especialidad</th>
                  <th>Chats activos</th>
                  <th>Ventas</th>
                  <th>Tasa %</th>
                  <th>Tiempo resp.</th>
                </tr>
              </thead>
              <tbody>
                {advisorPerf.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center text-xs text-slate-400 py-4">
                      Sin datos de rendimiento
                    </td>
                  </tr>
                )}
                {advisorPerf.map((a) => {
                  const totalClosed = (a.ventas_cerradas || 0) + (a.ventas_perdidas || 0);
                  const tasa = totalClosed > 0 ? Math.round((a.ventas_cerradas / totalClosed) * 100) : 0;
                  const avgSec = a.avg_response_seconds;
                  const tiempoResp = avgSec != null ? (avgSec < 60 ? `${Math.round(avgSec)}s` : `${Math.round(avgSec / 60)}min`) : '-';
                  return (
                  <tr key={a.id}>
                    <td className="font-medium">{a.nombre}</td>
                    <td>{a.local_tienda || '-'}</td>
                    <td>{a.especialidad || '-'}</td>
                    <td>{a.chats_activos}</td>
                    <td className="text-green-600 font-medium">{a.ventas_cerradas}</td>
                    <td>
                      <span className="badge badge-mint text-[10px]">{tasa}%</span>
                    </td>
                    <td className="text-xs text-slate-500">{tiempoResp}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Conversion diaria (ultimos 30 dias) */}
      <div className="card mb-4">
        <h3 className="font-semibold text-sm mb-3">Conversion Diaria (ultimos 30 dias)</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Chats nuevos</th>
                <th>Ventas</th>
                <th>Tasa conversion %</th>
              </tr>
            </thead>
            <tbody>
              {conversionDiaria.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-xs text-slate-400 py-4">
                    Sin datos de conversion
                  </td>
                </tr>
              )}
              {conversionDiaria.map((row) => {
                const rowStyle: React.CSSProperties = {};
                if (row.tasa > 30) {
                  rowStyle.background = '#dcfce7';
                } else if (row.tasa < 10) {
                  rowStyle.background = '#fee2e2';
                }
                return (
                  <tr key={row.fecha} style={rowStyle}>
                    <td className="font-medium">{row.fecha}</td>
                    <td>{row.chats_nuevos}</td>
                    <td className="text-green-600 font-medium">{row.ventas}</td>
                    <td>
                      <span className="badge badge-mint text-[10px]">{row.tasa}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Weekly activity chart */}
      <div className="card">
        <h3 className="font-semibold text-sm mb-3">Actividad semanal</h3>
        <div className="flex items-end gap-2 h-[160px] border-b border-slate-100 pb-2">
          {weekly.map((day, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <div className="flex gap-0.5 items-end h-full">
                <div
                  className="chart-bar"
                  style={{
                    height: `${(day.chats_entrantes / maxChart) * 100}%`,
                    background: '#f9a8d4',
                    width: 8,
                  }}
                  title={`Entrantes: ${day.chats_entrantes}`}
                />
                <div
                  className="chart-bar"
                  style={{
                    height: `${(day.enviados / maxChart) * 100}%`,
                    background: '#ec4899',
                    width: 8,
                  }}
                  title={`Enviados: ${day.enviados}`}
                />
                <div
                  className="chart-bar"
                  style={{
                    height: `${(day.ventas / maxChart) * 100}%`,
                    background: '#22c55e',
                    width: 8,
                  }}
                  title={`Ventas: ${day.ventas}`}
                />
              </div>
              <div className="text-[10px] text-slate-400">{dayLabel(day.fecha)}</div>
            </div>
          ))}
          {weekly.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
              Sin datos esta semana
            </div>
          )}
        </div>
        <div className="flex gap-4 mt-2 text-[10px] text-slate-400">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm" style={{ background: '#f9a8d4' }} />
            Entrantes
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm" style={{ background: '#ec4899' }} />
            Enviados
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm" style={{ background: '#22c55e' }} />
            Ventas
          </div>
        </div>
      </div>
    </div>
  );
};
