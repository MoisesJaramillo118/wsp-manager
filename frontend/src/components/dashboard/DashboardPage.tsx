import React, { useEffect, useState } from 'react';
import { dashboardService, type AdvisorPerformance, type DashboardData } from '../../services/dashboardService';
import type { DashboardAlert, WeeklyChartDay } from '../../types';
import { useUiStore } from '../../stores/uiStore';
import { StatCard } from '../ui/StatCard';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/SkeletonLoader';
import { Badge } from '../ui/Badge';

function fmtMinutes(m: number): string {
  return m < 60 ? m + 'min' : Math.floor(m / 60) + 'h ' + (m % 60) + 'min';
}

const DAYS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

const WeeklyChart: React.FC<{ data: WeeklyChartDay[] }> = ({ data }) => {
  if (!data.length) {
    return <div className="text-xs text-slate-400 text-center w-full">Sin datos</div>;
  }

  const maxVal = Math.max(...data.map((d) => Math.max(d.chats_entrantes || 0, d.enviados || 0, d.ventas || 0)), 1);

  return (
    <>
      <div className="flex items-end gap-1 h-[140px] border-b border-slate-100 pb-2 w-full">
        {data.map((d, i) => {
          const date = new Date(d.fecha + 'T12:00:00');
          const dayName = DAYS[date.getDay()];
          const h1 = Math.max(((d.chats_entrantes || 0) / maxVal) * 100, 2);
          const h2 = Math.max(((d.ventas || 0) / maxVal) * 100, 2);
          const h3 = Math.max(((d.enviados || 0) / maxVal) * 100, 2);
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="flex items-end gap-[2px] h-[110px]">
                <div
                  className="chart-bar bg-petrol-400"
                  style={{ height: `${h1}%`, width: 10 }}
                  title={`Chats: ${d.chats_entrantes}`}
                />
                <div
                  className="chart-bar bg-mint-400"
                  style={{ height: `${h2}%`, width: 10 }}
                  title={`Ventas: ${d.ventas}`}
                />
                <div
                  className="chart-bar bg-slate-300"
                  style={{ height: `${h3}%`, width: 10 }}
                  title={`Enviados: ${d.enviados}`}
                />
              </div>
              <span className="text-[10px] text-slate-400">{dayName}</span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 mt-2 text-[10px] text-slate-400">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-petrol-500 inline-block" />Chats
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-mint-400 inline-block" />Ventas
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-slate-300 inline-block" />Enviados
        </span>
      </div>
    </>
  );
};

const AlertBar: React.FC<{
  alert: DashboardAlert;
  onClickAlert: (phone: string) => void;
}> = ({ alert, onClickAlert }) => (
  <div
    className="alert-bar"
    onClick={() => onClickAlert(alert.remote_phone)}
  >
    <svg width="16" height="16" fill="none" stroke="#ef6b6b" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
    <div className="flex-1 min-w-0">
      <span className="text-xs font-medium">{alert.remote_name || '+' + alert.remote_phone}</span>
      <span className="text-[11px] text-slate-400 ml-2">{fmtMinutes(alert.minutes_waiting)} esperando</span>
      <p className="text-[11px] text-slate-500 truncate">{(alert.last_message || '').substring(0, 60)}</p>
    </div>
    {alert.advisor_nombre ? (
      <Badge variant="petrol" className="text-[10px]">{alert.advisor_nombre}</Badge>
    ) : (
      <Badge variant="red" className="text-[10px]">Sin asignar</Badge>
    )}
  </div>
);

const PerfRow: React.FC<{ advisor: AdvisorPerformance; rank: number }> = ({ advisor, rank }) => (
  <div className="perf-row">
    <span className="text-xs font-semibold text-slate-400 w-5">{rank}</span>
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold"
      style={{ background: advisor.color }}
    >
      {advisor.nombre.substring(0, 2).toUpperCase()}
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-xs font-medium truncate">{advisor.nombre}</div>
      <div className="text-[10px] text-slate-400">
        {advisor.ventas_cerradas} ventas &middot; {advisor.chats_activos} activos
      </div>
    </div>
    {rank === 1 && <span className="text-amber-400 text-sm">&#9733;</span>}
  </div>
);

export const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [performance, setPerformance] = useState<AdvisorPerformance[]>([]);
  const [chart, setChart] = useState<WeeklyChartDay[]>([]);
  const connectionStatus = useUiStore((s) => s.connectionStatus);
  const setActiveSection = useUiStore((s) => s.setActiveSection);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    try {
      const [statsData, alertsData, perfData, chartData] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getAlerts(20),
        dashboardService.getAdvisorPerformance(),
        dashboardService.getWeeklyChart(),
      ]);
      setStats(statsData);
      setAlerts(alertsData);
      setPerformance(perfData);
      setChart(chartData);
    } catch (e) {
      console.error('Dashboard error:', e);
    } finally {
      setLoading(false);
    }
  }

  function handleAlertClick(phone: string) {
    setActiveSection('chat');
    // The chat page will handle opening the specific phone
    sessionStorage.setItem('openChatPhone', phone);
  }

  const connDot = connectionStatus === 'connected' ? 'dot-green' : connectionStatus === 'connecting' ? 'dot-yellow' : 'dot-red';
  const connText = connectionStatus === 'connected' ? 'Conectado' : connectionStatus === 'connecting' ? 'Conectando...' : 'Desconectado';

  const today = new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-semibold">Dashboard</h2>
            <p className="text-xs text-slate-400 mt-0.5">Resumen de actividad</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-5">
          <Skeleton variant="card" count={5} height={80} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
          <Skeleton variant="card" count={1} height={200} className="lg:col-span-2" />
          <Skeleton variant="card" count={1} height={200} />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-semibold">Dashboard</h2>
          <p className="text-xs text-slate-400 mt-0.5">Resumen de actividad</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`dot ${connDot}`} />
          <span className="text-xs text-slate-500">{connText}</span>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-5 space-y-2">
          <div className="text-xs font-medium text-red-600 mb-1">
            Alertas: {alerts.length} cliente(s) esperando respuesta
          </div>
          {alerts.slice(0, 5).map((a) => (
            <AlertBar key={a.remote_phone} alert={a} onClickAlert={handleAlertClick} />
          ))}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-5">
        <StatCard
          number={`S/${Number(stats?.dinero_hoy || 0).toFixed(2)}`}
          label="Ventas hoy (S/)"
          borderColor="#22c55e"
        />
        <StatCard
          number={`S/${Number(stats?.dinero_mes || 0).toFixed(2)}`}
          label="Ventas del mes (S/)"
          borderColor="#22c55e"
        />
        <StatCard number={stats?.chats_activos || 0} label="Chats activos" />
        <StatCard number={stats?.sin_responder || 0} label="Sin responder" />
        <StatCard number={stats?.asignados || 0} label="Asignados" />
      </div>

      {/* Chart + Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <Card className="lg:col-span-2">
          <h3 className="font-semibold text-sm mb-3">Actividad semanal</h3>
          <WeeklyChart data={chart} />
        </Card>

        <Card>
          <h3 className="font-semibold text-sm mb-3">Ranking Asesores</h3>
          {performance.length > 0 ? (
            <div className="space-y-0">
              {performance.slice(0, 5).map((a, i) => (
                <PerfRow key={a.id} advisor={a} rank={i + 1} />
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-400 py-4 text-center">
              Agrega asesores para ver ranking
            </div>
          )}
        </Card>
      </div>

      {/* Day Summary */}
      <div className="grid grid-cols-1 gap-4">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Resumen del dia</h3>
            <span className="text-[11px] text-slate-400">{today}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="text-lg font-semibold">{stats?.enviados_hoy || 0}</div>
              <div className="text-[11px] text-slate-400">Enviados hoy</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="text-lg font-semibold">{stats?.programados || 0}</div>
              <div className="text-[11px] text-slate-400">Programados</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="text-lg font-semibold">{stats?.total_contactos || 0}</div>
              <div className="text-[11px] text-slate-400">Contactos</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="text-lg font-semibold">{stats?.ia_atendido || 0}</div>
              <div className="text-[11px] text-slate-400">IA atendidos</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
