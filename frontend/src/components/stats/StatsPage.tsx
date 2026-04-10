import React, { useState, useEffect } from 'react';
import type { WeeklyChartDay } from '../../types';
import { dashboardService, type ConversionDay, type AdminKPIData } from '../../services/dashboardService';
import { salesService } from '../../services/sales';
import { toast } from '../ui/Toast';
import { ExportButton } from '../ui/ExportButton';
import { useAuthStore } from '../../stores/authStore';

interface AsesorMetrics {
  id: number;
  nombre: string;
  color: string;
  especialidad: string;
  local_tienda: string;
  en_turno: boolean;
  total_ventas: number;
  total_monto: number;
  ventas_hoy: number;
  monto_hoy: number;
  ventas_semana: number;
  monto_semana: number;
  ventas_mes: number;
  monto_mes: number;
  total_chats_atendidos: number;
  chats_activos: number;
  ticket_promedio: number;
  tasa_conversion: number;
}

interface Totales {
  total_ventas: number;
  total_monto: number;
  total_chats_atendidos: number;
  tasa_conversion_global: number;
  ticket_promedio_global: number;
}

export const StatsPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.rol === 'admin';

  const [totalConv, setTotalConv] = useState(0);
  const [totalVentas, setTotalVentas] = useState(0);
  const [tasaConv, setTasaConv] = useState('0%');
  const [totalContactos, setTotalContactos] = useState(0);
  const [tasaConvGlobal, setTasaConvGlobal] = useState('0%');
  const [weekly, setWeekly] = useState<WeeklyChartDay[]>([]);
  const [conversionDiaria, setConversionDiaria] = useState<ConversionDay[]>([]);
  const [exporting, setExporting] = useState(false);
  const [asesoresMetrics, setAsesoresMetrics] = useState<AsesorMetrics[]>([]);
  const [totales, setTotales] = useState<Totales | null>(null);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [adminKPI, setAdminKPI] = useState<AdminKPIData | null>(null);

  useEffect(() => {
    loadStats();
    dashboardService.conversionDiaria().then(setConversionDiaria).catch(() => {});
    if (isAdmin) {
      dashboardService.getAdminKPI().then(setAdminKPI).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const loadVentasPorAsesor = async () => {
    try {
      const res = await salesService.porAsesor(fechaDesde, fechaHasta);
      setAsesoresMetrics(res.data.asesores || []);
      setTotales(res.data.totales || null);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isAdmin) loadVentasPorAsesor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, fechaDesde, fechaHasta]);

  const setHoy = () => {
    const t = new Date().toISOString().slice(0, 10);
    setFechaDesde(t);
    setFechaHasta(t);
  };
  const setSemana = () => {
    const hoy = new Date();
    const hace7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    setFechaDesde(hace7.toISOString().slice(0, 10));
    setFechaHasta(hoy.toISOString().slice(0, 10));
  };
  const setMes = () => {
    const hoy = new Date();
    const primer = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    setFechaDesde(primer.toISOString().slice(0, 10));
    setFechaHasta(hoy.toISOString().slice(0, 10));
  };
  const setTodo = () => {
    setFechaDesde('');
    setFechaHasta('');
  };

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

      {/* Ventas por Vendedora (admin only) */}
      {isAdmin && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="font-semibold text-base">Ventas por Vendedora</h3>
            <div className="flex gap-2 items-center flex-wrap">
              <button className="btn btn-sec btn-sm text-xs" onClick={setHoy}>Hoy</button>
              <button className="btn btn-sec btn-sm text-xs" onClick={setSemana}>Semana</button>
              <button className="btn btn-sec btn-sm text-xs" onClick={setMes}>Mes</button>
              <button className="btn btn-sec btn-sm text-xs" onClick={setTodo}>Todo</button>
              <input
                type="date"
                className="text-xs border border-slate-200 rounded px-2 py-1"
                style={{ width: 140 }}
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
              <input
                type="date"
                className="text-xs border border-slate-200 rounded px-2 py-1"
                style={{ width: 140 }}
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </div>
          </div>

          {/* Summary KPI cards */}
          {totales && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="stat-card">
                <div className="stat-num">{totales.total_ventas}</div>
                <div className="stat-label">Ventas totales</div>
              </div>
              <div className="stat-card" style={{ borderLeftColor: '#22c55e' }}>
                <div className="stat-num">S/ {totales.total_monto.toFixed(2)}</div>
                <div className="stat-label">Monto total</div>
              </div>
              <div className="stat-card" style={{ borderLeftColor: '#f59e0b' }}>
                <div className="stat-num">{totales.tasa_conversion_global}%</div>
                <div className="stat-label">Tasa conversion</div>
              </div>
              <div className="stat-card">
                <div className="stat-num">S/ {totales.ticket_promedio_global.toFixed(2)}</div>
                <div className="stat-label">Ticket promedio</div>
              </div>
            </div>
          )}

          {/* Bar chart: monto por asesor */}
          <div className="card mb-4">
            <h4 className="font-medium text-sm mb-3">Monto de ventas por asesora</h4>
            <div className="space-y-2">
              {asesoresMetrics.length === 0 && (
                <div className="text-center text-xs text-slate-400 py-4">Sin datos</div>
              )}
              {asesoresMetrics.map((a) => {
                const maxMonto = Math.max(...asesoresMetrics.map((x) => x.total_monto), 1);
                const pct = (a.total_monto / maxMonto) * 100;
                return (
                  <div key={a.id} className="flex items-center gap-3">
                    <div style={{ width: 120 }} className="text-xs font-medium truncate">
                      {a.nombre}
                    </div>
                    <div className="flex-1 bg-slate-100 rounded-full h-6 relative overflow-hidden">
                      <div
                        style={{
                          width: `${pct}%`,
                          background: a.color,
                          minWidth: '2%',
                        }}
                        className="h-full rounded-full transition-all"
                      />
                      <div className="absolute inset-0 flex items-center px-3 text-[11px] font-semibold text-slate-700">
                        S/ {a.total_monto.toFixed(2)} &middot; {a.total_ventas} ventas
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed table */}
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Asesor</th>
                    <th>Estado</th>
                    <th>Local</th>
                    <th>Chats</th>
                    <th>Ventas</th>
                    <th>Monto total</th>
                    <th>Conversion</th>
                    <th>Ticket prom.</th>
                    <th>Hoy</th>
                    <th>Semana</th>
                    <th>Mes</th>
                  </tr>
                </thead>
                <tbody>
                  {asesoresMetrics.map((a) => {
                    const tasaColor =
                      a.tasa_conversion > 30
                        ? 'badge-green'
                        : a.tasa_conversion >= 10
                        ? 'badge-amber'
                        : 'badge-red';
                    return (
                      <tr key={a.id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <div
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                background: a.color,
                                color: '#fff',
                                fontSize: 10,
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {a.nombre.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs font-medium">{a.nombre}</span>
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: a.en_turno ? '#22c55e' : '#ef4444',
                              display: 'inline-block',
                            }}
                          />
                        </td>
                        <td className="text-xs">{a.local_tienda || '-'}</td>
                        <td className="text-xs">{a.total_chats_atendidos}</td>
                        <td className="text-xs font-semibold text-green-600">{a.total_ventas}</td>
                        <td className="text-xs font-semibold">S/ {a.total_monto.toFixed(2)}</td>
                        <td>
                          <span className={`badge ${tasaColor} text-[10px]`}>{a.tasa_conversion}%</span>
                        </td>
                        <td className="text-xs">S/ {a.ticket_promedio.toFixed(2)}</td>
                        <td className="text-xs">
                          {a.ventas_hoy} (S/{a.monto_hoy.toFixed(0)})
                        </td>
                        <td className="text-xs">
                          {a.ventas_semana} (S/{a.monto_semana.toFixed(0)})
                        </td>
                        <td className="text-xs">
                          {a.ventas_mes} (S/{a.monto_mes.toFixed(0)})
                        </td>
                      </tr>
                    );
                  })}
                  {asesoresMetrics.length === 0 && (
                    <tr>
                      <td colSpan={11} className="text-center text-xs text-slate-400 py-4">
                        Sin datos
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {isAdmin && adminKPI && (
        <>
          {/* Conversion funnel */}
          <div className="card mb-4">
            <h3 className="font-semibold text-sm mb-3">Embudo de Conversion</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Total */}
              <div style={{ padding: 16, background: '#fdf2f8', borderRadius: 12, border: '1px solid #fce7f3' }}>
                <div className="text-[11px] text-slate-500 uppercase font-semibold mb-2">Historico Total</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-600">Chats recibidos</span>
                    <span className="text-sm font-semibold">{adminKPI.funnel_total.chats_recibidos}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-600">Asignados</span>
                    <span className="text-sm font-semibold">{adminKPI.funnel_total.chats_asignados}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-600">Ventas cerradas</span>
                    <span className="text-sm font-semibold text-green-600">{adminKPI.funnel_total.ventas_cerradas}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-pink-200">
                    <span className="text-xs text-slate-600">Monto total</span>
                    <span className="text-sm font-bold text-green-700">S/ {Number(adminKPI.funnel_total.monto_total).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-600">Tasa de cierre</span>
                    <span className="badge badge-mint text-[11px]">{adminKPI.funnel_total.tasa_cierre}%</span>
                  </div>
                </div>
              </div>
              {/* Hoy */}
              <div style={{ padding: 16, background: '#fdf4ff', borderRadius: 12, border: '1px solid #fae8ff' }}>
                <div className="text-[11px] text-slate-500 uppercase font-semibold mb-2">Hoy</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-600">Chats</span>
                    <span className="text-sm font-semibold">{adminKPI.funnel_hoy.chats}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-600">Ventas</span>
                    <span className="text-sm font-semibold text-green-600">{adminKPI.funnel_hoy.ventas}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-purple-200">
                    <span className="text-xs text-slate-600">Monto</span>
                    <span className="text-sm font-bold text-green-700">S/ {Number(adminKPI.funnel_hoy.monto).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-600">Tasa</span>
                    <span className="badge badge-mint text-[11px]">{adminKPI.funnel_hoy.tasa}%</span>
                  </div>
                </div>
              </div>
              {/* Mes */}
              <div style={{ padding: 16, background: '#f9f0f4', borderRadius: 12, border: '1px solid #f0e4ea' }}>
                <div className="text-[11px] text-slate-500 uppercase font-semibold mb-2">Este Mes</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-600">Chats</span>
                    <span className="text-sm font-semibold">{adminKPI.funnel_mes.chats}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-600">Ventas</span>
                    <span className="text-sm font-semibold text-green-600">{adminKPI.funnel_mes.ventas}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                    <span className="text-xs text-slate-600">Monto</span>
                    <span className="text-sm font-bold text-green-700">S/ {Number(adminKPI.funnel_mes.monto).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-600">Tasa</span>
                    <span className="badge badge-mint text-[11px]">{adminKPI.funnel_mes.tasa}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* KPIs Administradora: Ventas por vendedora (detailed) */}
          <div className="card mb-4">
            <h3 className="font-semibold text-sm mb-3">KPIs Administradora - Ventas por Vendedora</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Vendedora</th>
                    <th>Estado</th>
                    <th>Hoy</th>
                    <th>Semana</th>
                    <th>Mes</th>
                    <th>Total</th>
                    <th>Tasa</th>
                  </tr>
                </thead>
                <tbody>
                  {adminKPI.advisors.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center text-xs text-slate-400 py-4">
                        Sin datos
                      </td>
                    </tr>
                  )}
                  {adminKPI.advisors.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div style={{
                            width: 24, height: 24, borderRadius: '50%', background: a.color,
                            color: '#fff', fontSize: 10, fontWeight: 600,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {a.nombre.substring(0,2).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-xs font-semibold">{a.nombre}</div>
                            <div className="text-[10px] text-slate-400">{a.especialidad || a.local_tienda || '-'}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={a.en_turno ? 'text-green-600' : 'text-slate-400'} style={{ fontSize: 11 }}>
                          {a.en_turno ? 'En turno' : 'Fuera'}
                        </span>
                      </td>
                      <td>
                        <div className="text-xs">{a.ventas_hoy}</div>
                        <div className="text-[10px] text-green-600">S/ {Number(a.monto_hoy).toFixed(0)}</div>
                      </td>
                      <td>
                        <div className="text-xs">{a.ventas_semana}</div>
                        <div className="text-[10px] text-green-600">S/ {Number(a.monto_semana).toFixed(0)}</div>
                      </td>
                      <td>
                        <div className="text-xs">{a.ventas_mes}</div>
                        <div className="text-[10px] text-green-600">S/ {Number(a.monto_mes).toFixed(0)}</div>
                      </td>
                      <td>
                        <div className="text-xs font-semibold">{a.ventas_total}</div>
                        <div className="text-[10px] text-green-700 font-semibold">S/ {Number(a.monto_total).toFixed(2)}</div>
                      </td>
                      <td>
                        <span className="badge badge-mint text-[10px]">{a.tasa_conversion}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
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
