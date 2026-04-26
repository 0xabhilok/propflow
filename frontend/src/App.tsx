import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import DashboardPage from './pages/Dashboard';
import PropertiesPage from './pages/Properties';
import MaintenancePage from './pages/Maintenance';

type Page = 'dashboard' | 'properties' | 'tenants' | 'leases' | 'maintenance' | 'payments';

const NAV_ITEMS: { id: Page; label: string; icon: JSX.Element }[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".9" />
        <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".5" />
        <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".5" />
        <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".3" />
      </svg>
    ),
  },
  {
    id: 'properties',
    label: 'Properties',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
        <path d="M2 7l6-5 6 5v7H10V9H6v5H2V7z" fill="currentColor" opacity=".8" />
      </svg>
    ),
  },
  {
    id: 'tenants',
    label: 'Tenants',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="5" r="3" fill="currentColor" opacity=".8" />
        <path d="M2 14c0-3.3 2.7-5 6-5s6 1.7 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity=".8" />
      </svg>
    ),
  },
  {
    id: 'leases',
    label: 'Leases',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="1" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.2" fill="none" opacity=".8" />
        <path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity=".8" />
      </svg>
    ),
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
        <path d="M10 2l1 3-2 2-3-1L4 8l1 3-1 2 2-1 3 1 2-2-1-3 2-2-3-1z" stroke="currentColor" strokeWidth="1.2" fill="none" opacity=".8" />
      </svg>
    ),
  },
  {
    id: 'payments',
    label: 'Payments',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="4" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.2" fill="none" opacity=".8" />
        <path d="M1 7h14" stroke="currentColor" strokeWidth="1.2" opacity=".8" />
      </svg>
    ),
  },
];

function LoginScreen({ onLogin }: { onLogin: (e: string, p: string) => Promise<void> }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onLogin(email, password);
    } catch (err: any) {
      setError(err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center">
      <div className="w-full max-w-sm bg-[#161a22] border border-white/7 rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-400 flex items-center justify-center text-sm font-bold text-white">
            PF
          </div>
          <div>
            <p className="text-base font-semibold text-white">PropFlow</p>
            <p className="text-[11px] text-gray-500 font-mono">property management</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 font-mono block mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors"
              placeholder="admin@example.com"
              required
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 font-mono block mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors"
              placeholder="••••••••"
              required
            />
          </div>
          {error && <p className="text-xs text-red-400 font-mono">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const { session, profile, loading, signIn, signOut } = useAuth();
  const [page, setPage] = useState<Page>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center">
        <div className="text-gray-500 text-sm font-mono">Loading…</div>
      </div>
    );
  }

  if (!session) {
    return <LoginScreen onLogin={signIn} />;
  }

  const PageComponent = {
    dashboard: DashboardPage,
    properties: PropertiesPage,
    maintenance: MaintenancePage,
    tenants: () => <ComingSoon name="Tenants" />,
    leases: () => <ComingSoon name="Leases" />,
    payments: () => <ComingSoon name="Payments" />,
  }[page];

  return (
    <div className="flex h-screen bg-[#0d0f14] font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[220px] min-w-[220px] bg-[#161a22] border-r border-white/7 flex flex-col">
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-white/5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-400 flex items-center justify-center text-xs font-bold text-white">
            PF
          </div>
          <div>
            <p className="text-sm font-semibold text-white tracking-tight">PropFlow</p>
            <p className="text-[10px] text-gray-500 font-mono">v2.4 · edge</p>
          </div>
        </div>

        <nav className="flex-1 py-4 space-y-0.5 px-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all ${
                page === item.id
                  ? 'bg-blue-500/10 text-blue-400 border-l-2 border-blue-500 rounded-l-none pl-[10px]'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'
              }`}
            >
              <span className={page === item.id ? 'text-blue-400' : 'text-gray-600'}>
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-emerald-400 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
              {profile?.full_name?.slice(0, 2).toUpperCase() ?? 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-200 truncate">{profile?.full_name ?? 'User'}</p>
              <p className="text-[10px] text-gray-500 font-mono capitalize">{profile?.role ?? 'viewer'} · RBAC</p>
            </div>
            <button
              onClick={signOut}
              className="text-gray-600 hover:text-gray-400 transition-colors text-xs"
              title="Sign out"
            >
              ⎋
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {/* Topbar */}
        <div className="sticky top-0 z-10 h-14 bg-[#161a22] border-b border-white/7 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-white capitalize">
              {NAV_ITEMS.find((n) => n.id === page)?.label}
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Supabase Realtime
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-xs text-gray-400 border border-white/10 rounded-lg hover:bg-white/5 transition-colors font-mono">
              Export
            </button>
          </div>
        </div>

        <PageComponent />
      </main>
    </div>
  );
}

function ComingSoon({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-center h-64 text-gray-500 text-sm font-mono">
      {name} — coming soon
    </div>
  );
}
