/**
 * PropFlow — Cloudflare Worker API
 *
 * Edge runtime backend. Handles all REST endpoints.
 * Deployed via: wrangler deploy
 *
 * Routes:
 *   GET  /api/dashboard/metrics
 *   GET  /api/properties
 *   POST /api/properties
 *   GET  /api/properties/:id
 *   PATCH /api/properties/:id
 *   DELETE /api/properties/:id
 *   GET  /api/units
 *   POST /api/units
 *   PATCH /api/units/:id
 *   DELETE /api/units/:id
 *   GET  /api/tenants
 *   POST /api/tenants
 *   PATCH /api/tenants/:id
 *   GET  /api/leases
 *   POST /api/leases
 *   PATCH /api/leases/:id
 *   POST /api/leases/:id/terminate
 *   GET  /api/maintenance
 *   POST /api/maintenance
 *   PATCH /api/maintenance/:id
 *   POST /api/maintenance/:id/resolve
 *   GET  /api/payments
 *   POST /api/payments
 *   POST /api/payments/:id/pay
 */

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  JWT_SECRET: string;
}

// ─── CORS ─────────────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function cors(res: Response): Response {
  const next = new Response(res.body, res);
  Object.entries(CORS_HEADERS).forEach(([k, v]) => next.headers.set(k, v));
  return next;
}

function json(data: unknown, status = 200): Response {
  return cors(new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  }));
}

function err(message: string, status = 400): Response {
  return json({ error: message }, status);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function getSupabaseUser(
  request: Request,
  env: Env
): Promise<{ id: string; email: string } | null> {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);

  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: env.SUPABASE_SERVICE_KEY,
    },
  });

  if (!res.ok) return null;
  return res.json();
}

// ─── Supabase REST helper ─────────────────────────────────────────────────────

async function supabase(
  env: Env,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(`${env.SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      Prefer: 'return=representation',
      ...(options.headers as Record<string, string> ?? {}),
    },
  });
}

// ─── Router ───────────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

    // Auth check (skip for OPTIONS)
    const user = await getSupabaseUser(request, env);
    if (!user) return err('Unauthorized', 401);

    try {
      // ── Dashboard ──────────────────────────────────────────────────────────
      if (pathname === '/api/dashboard/metrics' && method === 'GET') {
        return handleDashboardMetrics(env);
      }

      // ── Properties ────────────────────────────────────────────────────────
      if (pathname === '/api/properties') {
        if (method === 'GET') return handleListProperties(url, env);
        if (method === 'POST') return handleCreateProperty(request, env, user.id);
      }
      const propMatch = pathname.match(/^\/api\/properties\/([^/]+)$/);
      if (propMatch) {
        const id = propMatch[1];
        if (method === 'GET') return handleGetProperty(id, env);
        if (method === 'PATCH') return handleUpdateProperty(id, request, env);
        if (method === 'DELETE') return handleDeleteProperty(id, env);
      }

      // ── Units ─────────────────────────────────────────────────────────────
      if (pathname === '/api/units') {
        if (method === 'GET') return handleListUnits(url, env);
        if (method === 'POST') return handleCreateUnit(request, env);
      }
      const unitMatch = pathname.match(/^\/api\/units\/([^/]+)$/);
      if (unitMatch) {
        const id = unitMatch[1];
        if (method === 'PATCH') return handleUpdateUnit(id, request, env);
        if (method === 'DELETE') return handleDeleteUnit(id, env);
      }

      // ── Tenants ───────────────────────────────────────────────────────────
      if (pathname === '/api/tenants') {
        if (method === 'GET') return handleListTenants(url, env);
        if (method === 'POST') return handleCreateTenant(request, env);
      }
      const tenantMatch = pathname.match(/^\/api\/tenants\/([^/]+)$/);
      if (tenantMatch) {
        const id = tenantMatch[1];
        if (method === 'PATCH') return handleUpdateTenant(id, request, env);
      }

      // ── Leases ────────────────────────────────────────────────────────────
      if (pathname === '/api/leases') {
        if (method === 'GET') return handleListLeases(url, env);
        if (method === 'POST') return handleCreateLease(request, env);
      }
      const leaseMatch = pathname.match(/^\/api\/leases\/([^/]+)(\/terminate)?$/);
      if (leaseMatch) {
        const id = leaseMatch[1];
        if (leaseMatch[2] && method === 'POST') return handleTerminateLease(id, env);
        if (method === 'PATCH') return handleUpdateLease(id, request, env);
      }

      // ── Maintenance ───────────────────────────────────────────────────────
      if (pathname === '/api/maintenance') {
        if (method === 'GET') return handleListMaintenance(url, env);
        if (method === 'POST') return handleCreateMaintenance(request, env, user.id);
      }
      const maintMatch = pathname.match(/^\/api\/maintenance\/([^/]+)(\/resolve)?$/);
      if (maintMatch) {
        const id = maintMatch[1];
        if (maintMatch[2] && method === 'POST') return handleResolveMaintenance(id, env);
        if (method === 'PATCH') return handleUpdateMaintenance(id, request, env);
      }

      // ── Payments ──────────────────────────────────────────────────────────
      if (pathname === '/api/payments') {
        if (method === 'GET') return handleListPayments(url, env);
        if (method === 'POST') return handleCreatePayment(request, env);
      }
      const payMatch = pathname.match(/^\/api\/payments\/([^/]+)\/pay$/);
      if (payMatch && method === 'POST') {
        return handleMarkPaid(payMatch[1], request, env);
      }

      return err('Not found', 404);
    } catch (e: any) {
      console.error('[Worker] Unhandled error:', e);
      return err(e.message || 'Internal server error', 500);
    }
  },
};

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function handleDashboardMetrics(env: Env): Promise<Response> {
  const [unitsRes, maintRes, leasesRes, paymentsRes] = await Promise.all([
    supabase(env, '/units?select=id,status,monthly_rent,property_id'),
    supabase(env, '/maintenance_requests?select=id,status,priority&status=in.(open,in_progress)'),
    supabase(env, '/leases?select=id,end_date,status&status=eq.active'),
    supabase(env, '/payments?select=id,status&status=eq.overdue'),
  ]);

  const units = await unitsRes.json() as any[];
  const maint = await maintRes.json() as any[];
  const leases = await leasesRes.json() as any[];
  const payments = await paymentsRes.json() as any[];

  const occupied = units.filter((u: any) => u.status === 'occupied');
  const monthlyRevenue = occupied.reduce((acc: number, u: any) => acc + Number(u.monthly_rent), 0);

  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 86400000);
  const expiringLeases = leases.filter((l: any) => new Date(l.end_date) <= in30Days);

  // Count unique properties
  const propertyIds = new Set(units.map((u: any) => u.property_id));

  return json({
    data: {
      total_properties: propertyIds.size,
      total_units: units.length,
      occupied_units: occupied.length,
      vacant_units: units.length - occupied.length,
      occupancy_rate: units.length > 0 ? (occupied.length / units.length) * 100 : 0,
      monthly_revenue: monthlyRevenue,
      open_maintenance: maint.length,
      urgent_maintenance: maint.filter((m: any) => m.priority === 'urgent').length,
      expiring_leases_30d: expiringLeases.length,
      overdue_payments: payments.length,
    },
  });
}

// Properties
async function handleListProperties(url: URL, env: Env): Promise<Response> {
  const page = Number(url.searchParams.get('page') ?? 1);
  const perPage = Number(url.searchParams.get('per_page') ?? 20);
  const offset = (page - 1) * perPage;

  const res = await supabase(
    env,
    `/properties?select=*,units(*)&order=created_at.desc&limit=${perPage}&offset=${offset}`
  );
  const data = await res.json();
  return json({ data, page, per_page: perPage, total: data.length });
}

async function handleGetProperty(id: string, env: Env): Promise<Response> {
  const res = await supabase(env, `/properties?id=eq.${id}&select=*,units(*)`);
  const data = await res.json() as any[];
  if (!data.length) return err('Property not found', 404);
  return json({ data: data[0] });
}

async function handleCreateProperty(request: Request, env: Env, ownerId: string): Promise<Response> {
  const body = await request.json() as any;
  const res = await supabase(env, '/properties', {
    method: 'POST',
    body: JSON.stringify({ ...body, owner_id: ownerId }),
  });
  const data = await res.json();
  return json({ data }, res.status);
}

async function handleUpdateProperty(id: string, request: Request, env: Env): Promise<Response> {
  const body = await request.json() as any;
  delete body.id; delete body.owner_id; delete body.created_at;
  const res = await supabase(env, `/properties?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return json({ data });
}

async function handleDeleteProperty(id: string, env: Env): Promise<Response> {
  await supabase(env, `/properties?id=eq.${id}`, { method: 'DELETE' });
  return json({ success: true });
}

// Units
async function handleListUnits(url: URL, env: Env): Promise<Response> {
  const propId = url.searchParams.get('property_id');
  const filter = propId ? `&property_id=eq.${propId}` : '';
  const res = await supabase(env, `/units?select=*,property:properties(id,name)${filter}&order=unit_number.asc`);
  const data = await res.json();
  return json({ data, total: data.length });
}

async function handleCreateUnit(request: Request, env: Env): Promise<Response> {
  const body = await request.json();
  const res = await supabase(env, '/units', { method: 'POST', body: JSON.stringify(body) });
  const data = await res.json();
  return json({ data }, res.status);
}

async function handleUpdateUnit(id: string, request: Request, env: Env): Promise<Response> {
  const body = await request.json() as any;
  delete body.id; delete body.created_at;
  const res = await supabase(env, `/units?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(body) });
  const data = await res.json();
  return json({ data });
}

async function handleDeleteUnit(id: string, env: Env): Promise<Response> {
  await supabase(env, `/units?id=eq.${id}`, { method: 'DELETE' });
  return json({ success: true });
}

// Tenants
async function handleListTenants(url: URL, env: Env): Promise<Response> {
  const res = await supabase(env, '/tenants?select=*,leases(id,status,end_date,unit:units(unit_number,property:properties(name)))&order=full_name.asc');
  const data = await res.json();
  return json({ data, total: data.length });
}

async function handleCreateTenant(request: Request, env: Env): Promise<Response> {
  const body = await request.json();
  const res = await supabase(env, '/tenants', { method: 'POST', body: JSON.stringify(body) });
  const data = await res.json();
  return json({ data }, res.status);
}

async function handleUpdateTenant(id: string, request: Request, env: Env): Promise<Response> {
  const body = await request.json() as any;
  delete body.id; delete body.created_at;
  const res = await supabase(env, `/tenants?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(body) });
  const data = await res.json();
  return json({ data });
}

// Leases
async function handleListLeases(url: URL, env: Env): Promise<Response> {
  const status = url.searchParams.get('status');
  const expiringDays = url.searchParams.get('expiring_days');

  let filter = status ? `&status=eq.${status}` : '';

  const res = await supabase(
    env,
    `/leases?select=*,unit:units(id,unit_number,property:properties(id,name)),tenant:tenants(id,full_name,email)${filter}&order=end_date.asc`
  );
  let data = await res.json() as any[];

  // Add days_until_expiry
  const now = Date.now();
  data = data.map((l) => ({
    ...l,
    days_until_expiry: Math.ceil((new Date(l.end_date).getTime() - now) / 86400000),
  }));

  // Filter by expiring_days if provided
  if (expiringDays) {
    const days = Number(expiringDays);
    data = data.filter((l) => l.days_until_expiry >= 0 && l.days_until_expiry <= days);
  }

  return json({ data, total: data.length });
}

async function handleCreateLease(request: Request, env: Env): Promise<Response> {
  const body = await request.json();
  const res = await supabase(env, '/leases', { method: 'POST', body: JSON.stringify(body) });
  const data = await res.json();
  return json({ data }, res.status);
}

async function handleUpdateLease(id: string, request: Request, env: Env): Promise<Response> {
  const body = await request.json() as any;
  delete body.id; delete body.created_at;
  const res = await supabase(env, `/leases?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(body) });
  const data = await res.json();
  return json({ data });
}

async function handleTerminateLease(id: string, env: Env): Promise<Response> {
  const res = await supabase(env, `/leases?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'terminated' }),
  });
  const data = await res.json();
  return json({ data });
}

// Maintenance
async function handleListMaintenance(url: URL, env: Env): Promise<Response> {
  const status = url.searchParams.get('status');
  const priority = url.searchParams.get('priority');
  let filter = '';
  if (status) filter += `&status=eq.${status}`;
  if (priority) filter += `&priority=eq.${priority}`;

  const res = await supabase(
    env,
    `/maintenance_requests?select=*,unit:units(id,unit_number,property:properties(id,name))${filter}&order=created_at.desc`
  );
  const data = await res.json();
  return json({ data, total: data.length });
}

async function handleCreateMaintenance(request: Request, env: Env, userId: string): Promise<Response> {
  const body = await request.json() as any;
  const res = await supabase(env, '/maintenance_requests', {
    method: 'POST',
    body: JSON.stringify({ ...body, reported_by: userId }),
  });
  const data = await res.json();
  return json({ data }, res.status);
}

async function handleUpdateMaintenance(id: string, request: Request, env: Env): Promise<Response> {
  const body = await request.json() as any;
  delete body.id; delete body.created_at;
  const res = await supabase(env, `/maintenance_requests?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return json({ data });
}

async function handleResolveMaintenance(id: string, env: Env): Promise<Response> {
  const res = await supabase(env, `/maintenance_requests?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'resolved', resolved_at: new Date().toISOString() }),
  });
  const data = await res.json();
  return json({ data });
}

// Payments
async function handleListPayments(url: URL, env: Env): Promise<Response> {
  const leaseId = url.searchParams.get('lease_id');
  const filter = leaseId ? `&lease_id=eq.${leaseId}` : '';
  const res = await supabase(env, `/payments?select=*${filter}&order=due_date.desc`);
  const data = await res.json();
  return json({ data, total: data.length });
}

async function handleCreatePayment(request: Request, env: Env): Promise<Response> {
  const body = await request.json();
  const res = await supabase(env, '/payments', { method: 'POST', body: JSON.stringify(body) });
  const data = await res.json();
  return json({ data }, res.status);
}

async function handleMarkPaid(id: string, request: Request, env: Env): Promise<Response> {
  const { method } = await request.json() as any;
  const res = await supabase(env, `/payments?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: 'paid',
      paid_date: new Date().toISOString().split('T')[0],
      method: method ?? 'manual',
    }),
  });
  const data = await res.json();
  return json({ data });
}
