import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { useRealtime } from '../hooks/useRealtime';
import type { MaintenanceRequest, MaintenancePriority, MaintenanceStatus } from '../types';

const PRIORITY_ORDER: Record<MaintenancePriority, number> = { urgent: 0, normal: 1, low: 2 };

export default function MaintenancePage() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<MaintenanceStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<MaintenancePriority | 'all'>('all');

  const load = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      const res = await api.maintenance.list(params as any);
      const sorted = [...res.data].sort(
        (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      );
      setRequests(sorted);
    } catch (err) {
      console.error('[Maintenance] load error', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter]);

  useEffect(() => { load(); }, [load]);
  useRealtime({ table: 'maintenance_requests', onChange: load });

  const handleResolve = async (id: string) => {
    await api.maintenance.resolve(id);
    load();
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Maintenance Requests</h1>
        <button className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors">
          + New Request
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1.5 items-center">
          <span className="text-xs text-gray-500 font-mono">Status:</span>
          {(['all', 'open', 'in_progress', 'resolved'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-mono border transition-colors ${
                statusFilter === s
                  ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                  : 'border-white/10 text-gray-500 hover:text-gray-300'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 items-center">
          <span className="text-xs text-gray-500 font-mono">Priority:</span>
          {(['all', 'urgent', 'normal', 'low'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-mono border transition-colors ${
                priorityFilter === p
                  ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                  : 'border-white/10 text-gray-500 hover:text-gray-300'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Request Cards */}
      <div className="space-y-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-[#161a22] border border-white/7 rounded-xl animate-pulse" />
            ))
          : requests.map((req) => (
              <RequestCard key={req.id} request={req} onResolve={handleResolve} />
            ))
        }
        {!loading && requests.length === 0 && (
          <div className="py-16 text-center text-sm text-gray-500">No matching requests</div>
        )}
      </div>
    </div>
  );
}

function RequestCard({ request: r, onResolve }: {
  request: MaintenanceRequest;
  onResolve: (id: string) => void;
}) {
  const priColor = {
    urgent: { dot: 'bg-red-400', badge: 'bg-red-400/10 text-red-400 border-red-400/20' },
    normal: { dot: 'bg-blue-400', badge: 'bg-blue-400/10 text-blue-400 border-blue-400/20' },
    low: { dot: 'bg-gray-500', badge: 'bg-white/5 text-gray-500 border-white/10' },
  }[r.priority];

  const statusColor = {
    open: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
    in_progress: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
    resolved: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
    closed: 'bg-white/5 text-gray-500 border-white/10',
  }[r.status];

  const age = Math.floor((Date.now() - new Date(r.created_at).getTime()) / 3600000);
  const ageStr = age < 1 ? 'just now' : age < 24 ? `${age}h ago` : `${Math.floor(age / 24)}d ago`;

  return (
    <div className="bg-[#161a22] border border-white/7 rounded-xl px-5 py-4 flex items-start gap-4 hover:border-white/12 transition-colors">
      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ${priColor.dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-200">{r.title}</p>
            <p className="text-xs text-gray-500 mt-1 line-clamp-1">{r.description}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0 items-center">
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${priColor.badge}`}>
              {r.priority}
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${statusColor}`}>
              {r.status.replace('_', ' ')}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-2">
          <span className="text-xs text-gray-600 font-mono">
            Unit {r.unit?.unit_number ?? '—'} · {r.unit?.property?.name ?? '—'}
          </span>
          <span className="text-xs text-gray-600 font-mono">{ageStr}</span>
          {r.assigned_to && (
            <span className="text-xs text-gray-600 font-mono">→ {r.assigned_to}</span>
          )}
          {r.status === 'open' || r.status === 'in_progress' ? (
            <button
              onClick={() => onResolve(r.id)}
              className="ml-auto text-xs text-emerald-400 font-mono hover:text-emerald-300 transition-colors"
            >
              Mark resolved →
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
