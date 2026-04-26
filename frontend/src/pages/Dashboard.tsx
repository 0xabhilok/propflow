import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { useRealtime } from '../hooks/useRealtime';
import type { DashboardMetrics, MaintenanceRequest, Lease } from '../types';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [maintenance, setMaintenance] = useState<MaintenanceRequest[]>([]);
  const [expiringLeases, setExpiringLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [m, maint, leases] = await Promise.all([
        api.dashboard.metrics(),
        api.maintenance.list({ status: 'open' }),
        api.leases.list({ expiring_days: '60' } as any),
      ]);
      setMetrics(m.data);
      setMaintenance(maint.data);
      setExpiringLeases(leases.data);
    } catch (err) {
      console.error('[Dashboard] load error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Realtime: re-fetch metrics when any key table changes
  useRealtime({ table: 'maintenance_requests', onChange: load });
  useRealtime({ table: 'leases', onChange: load });
  useRealtime({ table: 'payments', onChange: load });
  useRealtime({ table: 'units', onChange: load });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Loading dashboard…
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-white tracking-tight">Overview</h1>

      {/* Metric Cards */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Properties"
            value={metrics.total_properties}
            color="blue"
          />
          <MetricCard
            label="Occupancy"
            value={`${metrics.occupancy_rate.toFixed(1)}%`}
            sub={`${metrics.occupied_units}/${metrics.total_units} units`}
            color="green"
          />
          <MetricCard
            label="Monthly Revenue"
            value={`$${(metrics.monthly_revenue / 1000).toFixed(1)}k`}
            color="amber"
          />
          <MetricCard
            label="Open Tickets"
            value={metrics.open_maintenance}
            sub={`${metrics.urgent_maintenance} urgent`}
            color="red"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Open Maintenance */}
        <section className="bg-[#161a22] border border-white/7 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/7">
            <h2 className="text-sm font-semibold text-white">Open Maintenance</h2>
            <span className="text-xs text-blue-400 cursor-pointer font-mono">View all →</span>
          </div>
          <ul>
            {maintenance.slice(0, 5).map((req) => (
              <li
                key={req.id}
                className="flex items-start gap-3 px-5 py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
              >
                <PriorityDot priority={req.priority} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate">{req.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Unit {req.unit?.unit_number ?? '—'} · {req.unit?.property?.name ?? '—'}
                  </p>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${priorityBadge(req.priority)}`}>
                  {req.priority}
                </span>
              </li>
            ))}
            {maintenance.length === 0 && (
              <li className="px-5 py-6 text-center text-sm text-gray-500">No open tickets</li>
            )}
          </ul>
        </section>

        {/* Expiring Leases */}
        <section className="bg-[#161a22] border border-white/7 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/7">
            <h2 className="text-sm font-semibold text-white">Expiring Leases</h2>
            <span className="text-xs text-blue-400 cursor-pointer font-mono">Manage →</span>
          </div>
          <ul>
            {expiringLeases.slice(0, 5).map((lease) => {
              const days = lease.days_until_expiry ?? 0;
              return (
                <li
                  key={lease.id}
                  className="flex items-center gap-3 px-5 py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">
                      {lease.tenant?.full_name ?? '—'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Unit {lease.unit?.unit_number ?? '—'} · {lease.end_date}
                    </p>
                  </div>
                  <span className={`text-xs font-mono font-medium ${days < 30 ? 'text-red-400' : days < 60 ? 'text-amber-400' : 'text-gray-500'}`}>
                    {days}d
                  </span>
                </li>
              );
            })}
            {expiringLeases.length === 0 && (
              <li className="px-5 py-6 text-center text-sm text-gray-500">No leases expiring soon</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, color }: {
  label: string;
  value: string | number;
  sub?: string;
  color: 'blue' | 'green' | 'amber' | 'red';
}) {
  const accent = {
    blue: 'from-blue-500',
    green: 'from-emerald-400',
    amber: 'from-amber-400',
    red: 'from-red-400',
  }[color];

  return (
    <div className={`relative bg-[#161a22] border border-white/7 rounded-xl p-4 overflow-hidden`}>
      <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${accent} to-transparent`} />
      <p className="text-[11px] font-mono uppercase tracking-widest text-gray-500 mb-2">{label}</p>
      <p className="text-3xl font-semibold tracking-tight text-white leading-none">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1.5">{sub}</p>}
    </div>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  const color = priority === 'urgent' ? 'bg-red-400' : priority === 'normal' ? 'bg-blue-400' : 'bg-gray-500';
  return <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${color}`} />;
}

function priorityBadge(priority: string) {
  return {
    urgent: 'bg-red-400/10 text-red-400 border-red-400/20',
    normal: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
    low: 'bg-white/5 text-gray-500 border-white/10',
  }[priority] ?? '';
}
