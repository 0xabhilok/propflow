import { supabase } from './supabase';
import type {
  Property, Unit, Tenant, Lease,
  MaintenanceRequest, Payment, DashboardMetrics,
  PaginatedResponse, ApiResponse,
} from '../types';

const WORKER_URL = import.meta.env.VITE_WORKER_URL as string;

// ─── Auth header helper ───────────────────────────────────────────────────────

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${WORKER_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const api = {
  dashboard: {
    metrics: (): Promise<ApiResponse<DashboardMetrics>> =>
      request('/api/dashboard/metrics'),
  },

  // ─── Properties ─────────────────────────────────────────────────────────────

  properties: {
    list: (params?: { page?: number; per_page?: number }): Promise<PaginatedResponse<Property>> => {
      const q = new URLSearchParams(params as Record<string, string>);
      return request(`/api/properties?${q}`);
    },
    get: (id: string): Promise<ApiResponse<Property>> =>
      request(`/api/properties/${id}`),
    create: (body: Partial<Property>): Promise<ApiResponse<Property>> =>
      request('/api/properties', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: Partial<Property>): Promise<ApiResponse<Property>> =>
      request(`/api/properties/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: string): Promise<void> =>
      request(`/api/properties/${id}`, { method: 'DELETE' }),
  },

  // ─── Units ───────────────────────────────────────────────────────────────────

  units: {
    list: (propertyId?: string): Promise<PaginatedResponse<Unit>> => {
      const q = propertyId ? `?property_id=${propertyId}` : '';
      return request(`/api/units${q}`);
    },
    get: (id: string): Promise<ApiResponse<Unit>> =>
      request(`/api/units/${id}`),
    create: (body: Partial<Unit>): Promise<ApiResponse<Unit>> =>
      request('/api/units', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: Partial<Unit>): Promise<ApiResponse<Unit>> =>
      request(`/api/units/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: string): Promise<void> =>
      request(`/api/units/${id}`, { method: 'DELETE' }),
  },

  // ─── Tenants ─────────────────────────────────────────────────────────────────

  tenants: {
    list: (): Promise<PaginatedResponse<Tenant>> =>
      request('/api/tenants'),
    get: (id: string): Promise<ApiResponse<Tenant>> =>
      request(`/api/tenants/${id}`),
    create: (body: Partial<Tenant>): Promise<ApiResponse<Tenant>> =>
      request('/api/tenants', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: Partial<Tenant>): Promise<ApiResponse<Tenant>> =>
      request(`/api/tenants/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: string): Promise<void> =>
      request(`/api/tenants/${id}`, { method: 'DELETE' }),
  },

  // ─── Leases ───────────────────────────────────────────────────────────────────

  leases: {
    list: (params?: { status?: string; expiring_days?: number }): Promise<PaginatedResponse<Lease>> => {
      const q = new URLSearchParams(params as Record<string, string>);
      return request(`/api/leases?${q}`);
    },
    get: (id: string): Promise<ApiResponse<Lease>> =>
      request(`/api/leases/${id}`),
    create: (body: Partial<Lease>): Promise<ApiResponse<Lease>> =>
      request('/api/leases', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: Partial<Lease>): Promise<ApiResponse<Lease>> =>
      request(`/api/leases/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    terminate: (id: string): Promise<ApiResponse<Lease>> =>
      request(`/api/leases/${id}/terminate`, { method: 'POST' }),
  },

  // ─── Maintenance ─────────────────────────────────────────────────────────────

  maintenance: {
    list: (params?: { status?: string; priority?: string }): Promise<PaginatedResponse<MaintenanceRequest>> => {
      const q = new URLSearchParams(params as Record<string, string>);
      return request(`/api/maintenance?${q}`);
    },
    get: (id: string): Promise<ApiResponse<MaintenanceRequest>> =>
      request(`/api/maintenance/${id}`),
    create: (body: Partial<MaintenanceRequest>): Promise<ApiResponse<MaintenanceRequest>> =>
      request('/api/maintenance', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: Partial<MaintenanceRequest>): Promise<ApiResponse<MaintenanceRequest>> =>
      request(`/api/maintenance/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    resolve: (id: string): Promise<ApiResponse<MaintenanceRequest>> =>
      request(`/api/maintenance/${id}/resolve`, { method: 'POST' }),
  },

  // ─── Payments ─────────────────────────────────────────────────────────────────

  payments: {
    list: (leaseId?: string): Promise<PaginatedResponse<Payment>> => {
      const q = leaseId ? `?lease_id=${leaseId}` : '';
      return request(`/api/payments${q}`);
    },
    create: (body: Partial<Payment>): Promise<ApiResponse<Payment>> =>
      request('/api/payments', { method: 'POST', body: JSON.stringify(body) }),
    markPaid: (id: string, method: string): Promise<ApiResponse<Payment>> =>
      request(`/api/payments/${id}/pay`, { method: 'POST', body: JSON.stringify({ method }) }),
  },
};

export default api;
