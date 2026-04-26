-- PropFlow Database Schema
-- Run via: supabase db push

-- ─────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('admin', 'manager', 'viewer');
CREATE TYPE property_type AS ENUM ('apartment', 'house', 'commercial', 'condo');
CREATE TYPE unit_status AS ENUM ('occupied', 'vacant', 'maintenance');
CREATE TYPE lease_status AS ENUM ('active', 'expired', 'terminated', 'pending');
CREATE TYPE maintenance_priority AS ENUM ('urgent', 'normal', 'low');
CREATE TYPE maintenance_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE payment_status AS ENUM ('paid', 'pending', 'overdue', 'partial');

-- ─────────────────────────────────────────
-- PROFILES (extends Supabase auth.users)
-- ─────────────────────────────────────────

CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  role        user_role NOT NULL DEFAULT 'viewer',
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- PROPERTIES
-- ─────────────────────────────────────────

CREATE TABLE properties (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  address       TEXT NOT NULL,
  city          TEXT NOT NULL,
  state         TEXT NOT NULL,
  zip           TEXT NOT NULL,
  type          property_type NOT NULL DEFAULT 'apartment',
  total_units   INTEGER NOT NULL CHECK (total_units > 0),
  year_built    INTEGER,
  description   TEXT,
  image_url     TEXT,
  owner_id      UUID NOT NULL REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_properties_owner ON properties(owner_id);

-- ─────────────────────────────────────────
-- UNITS
-- ─────────────────────────────────────────

CREATE TABLE units (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_number   TEXT NOT NULL,
  floor         INTEGER,
  bedrooms      INTEGER NOT NULL DEFAULT 1,
  bathrooms     NUMERIC(3,1) NOT NULL DEFAULT 1.0,
  area_sqft     INTEGER,
  monthly_rent  NUMERIC(10,2) NOT NULL,
  status        unit_status NOT NULL DEFAULT 'vacant',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(property_id, unit_number)
);

CREATE INDEX idx_units_property ON units(property_id);
CREATE INDEX idx_units_status ON units(status);

-- ─────────────────────────────────────────
-- TENANTS
-- ─────────────────────────────────────────

CREATE TABLE tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  phone         TEXT,
  date_of_birth DATE,
  id_number     TEXT,
  emergency_contact_name  TEXT,
  emergency_contact_phone TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_email ON tenants(email);

-- ─────────────────────────────────────────
-- LEASES
-- ─────────────────────────────────────────

CREATE TABLE leases (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id       UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  monthly_rent  NUMERIC(10,2) NOT NULL,
  deposit       NUMERIC(10,2) NOT NULL DEFAULT 0,
  status        lease_status NOT NULL DEFAULT 'active',
  signed_at     TIMESTAMPTZ,
  document_url  TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date > start_date)
);

CREATE INDEX idx_leases_unit ON leases(unit_id);
CREATE INDEX idx_leases_tenant ON leases(tenant_id);
CREATE INDEX idx_leases_status ON leases(status);
CREATE INDEX idx_leases_end_date ON leases(end_date);

-- ─────────────────────────────────────────
-- MAINTENANCE REQUESTS
-- ─────────────────────────────────────────

CREATE TABLE maintenance_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id       UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  reported_by   UUID REFERENCES profiles(id),
  title         TEXT NOT NULL,
  description   TEXT NOT NULL,
  priority      maintenance_priority NOT NULL DEFAULT 'normal',
  status        maintenance_status NOT NULL DEFAULT 'open',
  assigned_to   TEXT,
  resolved_at   TIMESTAMPTZ,
  image_urls    TEXT[],
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_maintenance_unit ON maintenance_requests(unit_id);
CREATE INDEX idx_maintenance_status ON maintenance_requests(status);
CREATE INDEX idx_maintenance_priority ON maintenance_requests(priority);

-- ─────────────────────────────────────────
-- PAYMENTS
-- ─────────────────────────────────────────

CREATE TABLE payments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id      UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
  amount        NUMERIC(10,2) NOT NULL,
  due_date      DATE NOT NULL,
  paid_date     DATE,
  status        payment_status NOT NULL DEFAULT 'pending',
  method        TEXT,
  reference     TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_lease ON payments(lease_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_due_date ON payments(due_date);

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read their own, admins read all
CREATE POLICY "profiles_self" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_admin_all" ON profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Properties: owner or admin full access, others read
CREATE POLICY "properties_owner" ON properties
  FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "properties_read" ON properties
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager'))
  );

-- Units, Leases, Maintenance, Payments: auth users can read
CREATE POLICY "units_authenticated" ON units
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "units_write" ON units
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager'))
  );

CREATE POLICY "leases_authenticated" ON leases
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "leases_write" ON leases
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager'))
  );

CREATE POLICY "maintenance_read" ON maintenance_requests
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "maintenance_write" ON maintenance_requests
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "payments_read" ON payments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "payments_write" ON payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager'))
  );

-- ─────────────────────────────────────────
-- REALTIME SUBSCRIPTIONS
-- ─────────────────────────────────────────

-- Enable realtime on key tables
ALTER PUBLICATION supabase_realtime ADD TABLE maintenance_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE payments;
ALTER PUBLICATION supabase_realtime ADD TABLE leases;
ALTER PUBLICATION supabase_realtime ADD TABLE units;

-- ─────────────────────────────────────────
-- HELPER FUNCTIONS
-- ─────────────────────────────────────────

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated    BEFORE UPDATE ON profiles    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_properties_updated  BEFORE UPDATE ON properties  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_units_updated       BEFORE UPDATE ON units       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_tenants_updated     BEFORE UPDATE ON tenants     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_leases_updated      BEFORE UPDATE ON leases      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_maintenance_updated BEFORE UPDATE ON maintenance_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-update unit status when lease changes
CREATE OR REPLACE FUNCTION sync_unit_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' THEN
    UPDATE units SET status = 'occupied' WHERE id = NEW.unit_id;
  ELSIF NEW.status IN ('expired', 'terminated') THEN
    UPDATE units SET status = 'vacant' WHERE id = NEW.unit_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lease_sync_unit
  AFTER INSERT OR UPDATE OF status ON leases
  FOR EACH ROW EXECUTE FUNCTION sync_unit_status();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    'viewer'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─────────────────────────────────────────
-- SEED DATA (development)
-- ─────────────────────────────────────────

-- Uncomment to seed test data:
/*
INSERT INTO tenants (full_name, email, phone) VALUES
  ('Marcus Webb',    'marcus@example.com',  '+1-512-555-0101'),
  ('Priya Sharma',   'priya@example.com',   '+1-303-555-0102'),
  ('Jordan Lee',     'jordan@example.com',  '+1-786-555-0103'),
  ('Chloe Martin',   'chloe@example.com',   '+1-503-555-0104'),
  ('Dev Anand',      'dev@example.com',     '+1-206-555-0105');
*/
