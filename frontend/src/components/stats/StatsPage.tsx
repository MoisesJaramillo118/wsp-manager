import React, { useState, useEffect } from 'react';
import {
  dashboardService,
  type ConversionDay,
  type AdminKPIData,
  type DashboardData,
} from '../../services/dashboardService';
import { salesService } from '../../services/sales';
import { ExportButton } from '../ui/ExportButton';
import { useAuthStore } from '../../stores/authStore';
import { toast } from '../ui/Toast';

type Periodo = 'hoy' | 'semana' | 'mes' | 'total';

const PERIODO_LABELS: Record<Periodo, string> = {
  hoy: 'Hoy',
  semana: 'Semana',
  mes: 'Mes',
  total: 'Total',
};

const PERIODOS: Periodo[] = ['hoy', 'semana', 'mes', 'total'];

const fmtSoles = (n: number) =>
  `S/ ${Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const StatsPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.rol === 'admin';

  const [adminKPI, setAdminKPI] = useState<AdminKPIData | null>(null);
  const [conversionDiaria, setConversionDiaria] = useState<ConversionDay[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardData | null>(null);
  const [periodoEmbudo, setPeriodoEmbudo] = useState<Periodo>('mes');
  const [periodoVendedoras, setPeriodoVendedoras] = useState<Periodo>('mes');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      const [stats, conversion] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.conversionDiaria(),
      ]);
      setDashboardStats(stats);
      setConversionDiaria(conversion);
      if (isAdmin) {
        const kpi = await dashboardService.getAdminKPI();
        setAdminKPI(kpi);
      }
    } catch {
      toast('Error cargando estadisticas', false);
    }
  };

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

  // Section 1: top stat cards
  const totalConversaciones = dashboardStats?.total_conversaciones ?? 0;
  const totalVentasCerradas = dashboardStats?.total_ventas_cerradas ?? 0;
  const funnelTotal = adminKPI?.funnel.total;
  const montoTotal = funnelTotal?.monto_total ?? 0;
  const ticketPromedioTotal = funnelTotal?.ticket_promedio ?? 0;
  const tasaCierreTotal = funnelTotal?.tasa_cierre ?? dashboardStats?.tasa_conversion_global ?? 0;

  // Section 2: funnel data
  const funnelData = adminKPI?.funnel[periodoEmbudo];
  const fRec = funnelData?.chats_recibidos ?? 0;
  const fAsig = funnelData?.chats_asignados ?? 0;
  const fVen = funnelData?.ventas_cerradas ?? 0;
  const pctAsig = fRec > 0 ? Math.round((fAsig / fRec) * 100) : 0;
  const pctVen = fRec > 0 ? Math.round((fVen / fRec) * 100) : 0;

  // Section 3: ranking de vendedoras (sorted by monto for selected period)
  const getAdvisorPeriodFields = (a: AdminKPIData['advisors'][number], p: Periodo) => {
    if (p === 'hoy') {
      return { ventas: a.ventas_hoy, monto: a.monto_hoy, ticket: a.ticket_promedio_hoy };
    }
    if (p === 'semana') {
      return { ventas: a.ventas_semana, monto: a.monto_semana, ticket: a.ticket_promedio_semana };
    }
    if (p === 'mes') {
      return { ventas: a.ventas_mes, monto: a.monto_mes, ticket: a.ticket_promedio_mes };
    }
    return { ventas: a.ventas_total, monto: a.monto_total, ticket: a.ticket_promedio_total };
  };

  const advisorsSorted = adminKPI
    ? [...adminKPI.advisors].sort((a, b) => {
        const ma = getAdvisorPeriodFields(a, periodoVendedoras).monto;
        const mb = getAdvisorPeriodFields(b, periodoVendedoras).monto;
        return mb - ma;
      })
    : [];

  const tasaColor = (tasa: number) => {
    if (tasa > 30) return '#22c55e';
    if (tasa >= 10) return '#f6ad55';
    return '#ef6b6b';
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <h2 className="text-xl font-semibold">Estadisticas</h2>
        <ExportButton onClick={handleExport} loading={exporting} />
      </div>

      {/* Section 1: 5 stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        <div className="stat-card">
          <div className="stat-num">{totalConversaciones}</div>
          <div className="stat-label">Conversaciones</div>
          <div className="text-[10px] text-slate-400 mt-1">clientes unicos</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{totalVentasCerradas}</div>
          <div className="stat-label">Ventas cerradas</div>
          <div className="text-[10px] text-slate-400 mt-1">del total historico</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#22c55e' }}>
          <div className="stat-num">{fmtSoles(montoTotal)}</div>
          <div className="stat-label">Monto total</div>
          <div className="text-[10px] text-slate-400 mt-1">S/ acumulado</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#f59e0b' }}>
          <div className="stat-num">{fmtSoles(ticketPromedioTotal)}</div>
          <div className="stat-label">Ticket promedio</div>
          <div className="text-[10px] text-slate-400 mt-1">por venta</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#ec4899' }}>
          <div className="stat-num">{tasaCierreTotal}%</div>
          <div className="stat-label">Tasa conversion</div>
          <div className="text-[10px] text-slate-400 mt-1">ventas / chats recibidos</div>
        </div>
      </div>

      {/* Section 2: Embudo de Conversion */}
      {isAdmin && adminKPI && (
        <div className="card mb-5">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <h3 className="font-semibold text-sm">Embudo de Conversion</h3>
            <div className="flex gap-1">
              {PERIODOS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriodoEmbudo(p)}
                  className="text-xs px-3 py-1 rounded"
                  style={{
                    background: periodoEmbudo === p ? '#ec4899' : '#f3f4f6',
                    color: periodoEmbudo === p ? '#fff' : '#374151',
                    fontWeight: periodoEmbudo === p ? 600 : 500,
                  }}
                >
                  {PERIODO_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {/* Chats recibidos */}
            <div
              style={{
                width: '100%',
                height: 32,
                background: '#f0e4ea',
                borderRadius: 6,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: '#ec4899',
                  transition: 'width 0.3s',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#fff',
                }}
              >
                Chats recibidos: {fRec} (100%)
              </div>
            </div>

            {/* Asignados */}
            <div
              style={{
                width: '100%',
                height: 32,
                background: '#f0e4ea',
                borderRadius: 6,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${pctAsig}%`,
                  height: '100%',
                  background: '#ec4899',
                  transition: 'width 0.3s',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: pctAsig > 50 ? '#fff' : '#374151',
                }}
              >
                Asignados: {fAsig} ({pctAsig}%)
              </div>
            </div>

            {/* Ventas cerradas */}
            <div
              style={{
                width: '100%',
                height: 32,
                background: '#f0e4ea',
                borderRadius: 6,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${pctVen}%`,
                  height: '100%',
                  background: '#ec4899',
                  transition: 'width 0.3s',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: pctVen > 50 ? '#fff' : '#374151',
                }}
              >
                Ventas cerradas: {fVen} ({pctVen}%)
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t border-slate-100">
            <div className="text-xs">
              <span className="text-slate-500">Monto total: </span>
              <span className="font-semibold text-green-700">{fmtSoles(funnelData?.monto_total ?? 0)}</span>
            </div>
            <div className="text-xs">
              <span className="text-slate-500">Ticket promedio: </span>
              <span className="font-semibold">{fmtSoles(funnelData?.ticket_promedio ?? 0)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Section 3: Ranking de Vendedoras */}
      {isAdmin && adminKPI && (
        <div className="card mb-5">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <h3 className="font-semibold text-sm">Ranking de Vendedoras</h3>
            <div className="flex gap-1">
              {PERIODOS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriodoVendedoras(p)}
                  className="text-xs px-3 py-1 rounded"
                  style={{
                    background: periodoVendedoras === p ? '#ec4899' : '#f3f4f6',
                    color: periodoVendedoras === p ? '#fff' : '#374151',
                    fontWeight: periodoVendedoras === p ? 600 : 500,
                  }}
                >
                  {PERIODO_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Vendedora</th>
                  <th>Estado</th>
                  <th>Chats</th>
                  <th>Ventas</th>
                  <th>Monto</th>
                  <th>Ticket</th>
                  <th>Tasa</th>
                </tr>
              </thead>
              <tbody>
                {advisorsSorted.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-xs text-slate-400 py-4">
                      Sin datos
                    </td>
                  </tr>
                )}
                {advisorsSorted.map((a) => {
                  const f = getAdvisorPeriodFields(a, periodoVendedoras);
                  const initials = a.nombre.substring(0, 2).toUpperCase();
                  return (
                    <tr key={a.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              background: a.color || '#ec4899',
                              color: '#fff',
                              fontSize: 11,
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div className="text-xs font-semibold">{a.nombre}</div>
                            <div className="text-[10px] text-slate-400">
                              {a.especialidad || a.local_tienda || '-'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: a.en_turno ? '#22c55e' : '#9ca3af',
                              display: 'inline-block',
                            }}
                          />
                          <span
                            className="text-[11px]"
                            style={{ color: a.en_turno ? '#16a34a' : '#9ca3af' }}
                          >
                            {a.en_turno ? 'En turno' : 'Fuera'}
                          </span>
                        </div>
                      </td>
                      <td className="text-xs">{a.chats_atendidos_total}</td>
                      <td className="text-xs font-semibold text-green-600">{f.ventas}</td>
                      <td className="text-xs font-semibold">{fmtSoles(f.monto)}</td>
                      <td className="text-xs">{fmtSoles(f.ticket)}</td>
                      <td>
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded"
                          style={{
                            background: `${tasaColor(a.tasa_conversion)}22`,
                            color: tasaColor(a.tasa_conversion),
                          }}
                        >
                          {a.tasa_conversion}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 4: Tendencia Diaria */}
      <div className="card mb-4">
        <h3 className="font-semibold text-sm mb-3">Tendencia Diaria (ultimos 30 dias)</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Chats</th>
                <th>Ventas</th>
                <th style={{ minWidth: 200 }}>Tasa</th>
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
                const barWidth = Math.min(row.tasa * 2, 100);
                const color = tasaColor(row.tasa);
                return (
                  <tr key={row.fecha}>
                    <td className="font-medium text-xs">{row.fecha}</td>
                    <td className="text-xs">{row.chats_nuevos}</td>
                    <td className="text-xs text-green-600 font-medium">{row.ventas}</td>
                    <td>
                      <div
                        style={{
                          width: '100%',
                          height: 20,
                          background: '#f3f4f6',
                          borderRadius: 4,
                          position: 'relative',
                          overflow: 'hidden',
                          minWidth: 180,
                        }}
                      >
                        <div
                          style={{
                            width: `${barWidth}%`,
                            height: '100%',
                            background: color,
                            transition: 'width 0.3s',
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0 8px',
                            fontSize: 10,
                            fontWeight: 600,
                            color: barWidth > 40 ? '#fff' : '#374151',
                          }}
                        >
                          {row.tasa}%
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
