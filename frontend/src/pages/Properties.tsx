import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { useRealtime } from '../hooks/useRealtime';
import type { Property } from '../types';

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'occupied' | 'vacant'>('all');

  const load = useCallback(async () => {
    try {
      const res = await api.properties.list();
      setProperties(res.data);
    } catch (err) {
      console.error('[Properties] load error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useRealtime({ table: 'units', onChange: load });
  useRealtime({ table: 'properties', onChange: load });

  const filtered = properties.filter((p) => {
    if (filter === 'all') return true;
    const occ = p.units?.some((u) => u.status === 'occupied');
    return filter === 'occupied' ? occ : !occ;
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Properties</h1>
        <button className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors">
          + Add Property
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'occupied', 'vacant'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-mono border transition-colors ${
              filter === f
                ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                : 'border-white/10 text-gray-500 hover:text-gray-300'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#161a22] border border-white/7 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/7 bg-white/[0.02]">
              {['Property', 'Type', 'Units', 'Occupancy', 'Revenue/mo', 'Status'].map((h) => (
                <th key={h} className="text-left text-[10px] font-mono uppercase tracking-widest text-gray-500 px-5 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
              : filtered.map((p) => <PropertyRow key={p.id} property={p} />)
            }
          </tbody>
        </table>
        {!loading && filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-500">No properties found</div>
        )}
      </div>
    </div>
  );
}

function PropertyRow({ property: p }: { property: Property }) {
  const occupied = p.units?.filter((u) => u.status === 'occupied').length ?? 0;
  const total = p.total_units;
  const pct = total > 0 ? Math.round((occupied / total) * 100) : 0;
  const revenue = p.units?.reduce((acc, u) => acc + (u.status === 'occupied' ? u.monthly_rent : 0), 0) ?? 0;
  const healthy = pct >= 80;

  return (
    <tr className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
      <td className="px-5 py-3.5">
        <p className="text-sm font-medium text-gray-200">{p.name}</p>
        <p className="text-xs text-gray-500 mt-0.5">{p.address}, {p.city} {p.state}</p>
      </td>
      <td className="px-5 py-3.5">
        <span className="text-xs font-mono text-gray-400 capitalize">{p.type}</span>
      </td>
      <td className="px-5 py-3.5">
        <span className="text-xs font-mono text-gray-400">{occupied}/{total}</span>
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2">
          <div className="w-20 h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs font-mono text-gray-400">{pct}%</span>
        </div>
      </td>
      <td className="px-5 py-3.5">
        <span className="text-xs font-mono text-gray-300">${revenue.toLocaleString()}</span>
      </td>
      <td className="px-5 py-3.5">
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
          healthy
            ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
            : pct >= 60
            ? 'bg-amber-400/10 text-amber-400 border-amber-400/20'
            : 'bg-red-400/10 text-red-400 border-red-400/20'
        }`}>
          {healthy ? 'Healthy' : pct >= 60 ? 'Partial' : 'Vacant'}
        </span>
      </td>
    </tr>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-white/5">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-5 py-3.5">
          <div className="h-3 bg-white/5 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
        </td>
      ))}
    </tr>
  );
}
