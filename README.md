# PropFlow — Real-time Property Management Dashboard

A full-stack serverless property management platform built with:

- **Frontend**: React + TypeScript, Tailwind CSS → deployed on **Cloudflare Pages**
- **Backend**: Cloudflare Workers (Edge Runtime, <50ms cold start)
- **Database**: Supabase (PostgreSQL + Auth + Realtime + Edge Functions)
- **Real-time**: Supabase Realtime subscriptions for live dashboard updates

---

## Project Structure

```
propflow/
├── frontend/          # React + TypeScript app (Cloudflare Pages)
│   └── src/
│       ├── components/    # Reusable UI components
│       ├── pages/         # Route-level pages
│       ├── hooks/         # Custom React hooks (useRealtime, useAuth)
│       ├── lib/           # Supabase client, API helpers
│       └── types/         # Shared TypeScript types
├── worker/            # Cloudflare Worker (REST API backend)
│   └── src/
│       └── index.ts       # Main worker entry point
├── supabase/
│   └── migrations/        # SQL schema migrations
└── wrangler.toml          # Cloudflare Workers config
```

---

## Quick Start

### 1. Supabase Setup

```bash
# Install Supabase CLI
npm install -g supabase

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push
```

### 2. Cloudflare Worker

```bash
cd worker
npm install
# Set secrets
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_KEY
# Deploy
wrangler deploy
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Fill in your Supabase + Worker URLs
npm run dev
```

### 4. Deploy Frontend to Cloudflare Pages

```bash
cd frontend
npm run build
wrangler pages deploy dist
```

---

## Environment Variables

### Frontend (`.env.local`)
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_WORKER_URL=https://propflow-api.your-subdomain.workers.dev
```

### Worker (Wrangler Secrets)
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret
```

---

## Features

- **Properties** — CRUD, occupancy tracking, unit management
- **Tenants** — Onboarding, profiles, linked to units
- **Leases** — Start/end dates, renewal workflows, expiry alerts
- **Maintenance** — Ticket creation, priority levels, status tracking
- **Role-based Access Control** — Admin, Manager, Viewer roles via Supabase RLS
- **Real-time Updates** — Live dashboard via Supabase Realtime subscriptions
- **Auth** — Supabase Auth (email/password + magic link)
