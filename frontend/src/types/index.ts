// PropFlow — Shared TypeScript Types

export type UserRole = 'admin' | 'manager' | 'viewer';
export type PropertyType = 'apartment' | 'house' | 'commercial' | 'condo';
export type UnitStatus = 'occupied' | 'vacant' | 'maintenance';
export type LeaseStatus = 'active' | 'expired' | 'terminated' | 'pending';
export type MaintenancePriority = 'urgent' | 'normal' | 'low';
export type MaintenanceStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type PaymentStatus = 'paid' | 'pending' | 'overdue' | 'partial';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  type: PropertyType;
  total_units: number;
  year_built?: number;
  description?: string;
  image_url?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  // computed / joined
  units?: Unit[];
  occupancy_rate?: number;
  monthly_revenue?: number;
}

export interface Unit {
  id: string;
  property_id: string;
  unit_number: string;
  floor?: number;
  bedrooms: number;
  bathrooms: number;
  area_sqft?: number;
  monthly_rent: number;
  status: UnitStatus;
  created_at: string;
  updated_at: string;
  // joined
  property?: Property;
  current_lease?: Lease;
}

export interface Tenant {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  id_number?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // joined
  leases?: Lease[];
}

export interface Lease {
  id: string;
  unit_id: string;
  tenant_id: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  deposit: number;
  status: LeaseStatus;
  signed_at?: string;
  document_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // joined
  unit?: Unit;
  tenant?: Tenant;
  payments?: Payment[];
  days_until_expiry?: number;
}

export interface MaintenanceRequest {
  id: string;
  unit_id: string;
  reported_by?: string;
  title: string;
  description: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  assigned_to?: string;
  resolved_at?: string;
  image_urls?: string[];
  created_at: string;
  updated_at: string;
  // joined
  unit?: Unit;
  reporter?: Profile;
}

export interface Payment {
  id: string;
  lease_id: string;
  amount: number;
  due_date: string;
  paid_date?: string;
  status: PaymentStatus;
  method?: string;
  reference?: string;
  notes?: string;
  created_at: string;
  // joined
  lease?: Lease;
}

// API response wrappers
export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
}

// Dashboard metrics
export interface DashboardMetrics {
  total_properties: number;
  total_units: number;
  occupied_units: number;
  vacant_units: number;
  occupancy_rate: number;
  monthly_revenue: number;
  open_maintenance: number;
  urgent_maintenance: number;
  expiring_leases_30d: number;
  overdue_payments: number;
}

// Realtime event shapes
export interface RealtimeEvent {
  table: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}
