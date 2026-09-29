-- ============================================================
-- CoreTextil SaaS · Parte 1/3: Tablas (Supabase / PostgreSQL)
-- Ejecutar en orden: 0001 → 0002 → 0003 en el SQL Editor
-- ============================================================

create extension if not exists "uuid-ossp";

-- Tenants (Marcas o Talleres principales)
create table if not exists public.tenants (
    id uuid primary key default uuid_generate_v4(),
    name varchar(150) not null,
    nit_rut varchar(50),
    created_at timestamptz not null default now()
);

-- Perfiles: 1 a 1 con auth.users (Google SSO)
create type public.user_role as enum ('brand_admin', 'designer', 'cutter', 'satellite_owner', 'operator');

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    tenant_id uuid references public.tenants(id) on delete set null,
    google_id varchar(255) unique not null,
    email varchar(255) unique not null,
    full_name varchar(150) not null,
    role public.user_role not null default 'operator',
    satellite_owner_id uuid references public.profiles(id),
    created_at timestamptz not null default now()
);

-- Vínculos marca ↔ satélite (base del control monomarca vs multi-marca)
create table if not exists public.satellite_links (
    id uuid primary key default uuid_generate_v4(),
    satellite_user_id uuid not null references public.profiles(id) on delete cascade,
    brand_tenant_id uuid not null references public.tenants(id) on delete cascade,
    created_at timestamptz not null default now(),
    constraint uk_satellite_brand unique (satellite_user_id, brand_tenant_id)
);

-- Costos fijos del taller satélite
create table if not exists public.satellite_cost_profiles (
    id uuid primary key default uuid_generate_v4(),
    satellite_user_id uuid unique not null references public.profiles(id) on delete cascade,
    rent_monthly numeric(12,2) not null default 0,
    energy_monthly numeric(12,2) not null default 0,
    consumables_monthly numeric(12,2) not null default 0,
    maintenance_monthly numeric(12,2) not null default 0,
    estimated_monthly_units int not null default 1000,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Catálogo de prendas (ADN de prenda)
create table if not exists public.garments (
    id uuid primary key default uuid_generate_v4(),
    tenant_id uuid not null references public.tenants(id) on delete cascade,
    reference_code varchar(50) not null,
    name varchar(150) not null,
    front_image_url text,
    ai_exploded_image_url text,
    total_sam_minutes numeric(6,2),
    suggested_retail_price numeric(10,2),
    created_at timestamptz not null default now(),
    constraint uk_tenant_garment_ref unique (tenant_id, reference_code)
);

create table if not exists public.garment_parts (
    id uuid primary key default uuid_generate_v4(),
    garment_id uuid not null references public.garments(id) on delete cascade,
    part_code varchar(30) not null,
    name varchar(100) not null,
    material_type varchar(50),
    color_type varchar(50),
    svg_hotspot_coords jsonb,
    created_at timestamptz not null default now()
);

create table if not exists public.garment_operations (
    id uuid primary key default uuid_generate_v4(),
    garment_id uuid not null references public.garments(id) on delete cascade,
    step_order int not null,
    operation_name varchar(150) not null,
    machine_type varchar(50) not null,
    base_rate_cop numeric(10,2) not null,
    sam_minutes numeric(5,2),
    created_at timestamptz not null default now()
);

-- Órdenes de producción y atados
create type public.order_status as enum ('draft', 'cutting', 'dispatched', 'in_progress', 'completed');

create table if not exists public.production_orders (
    id uuid primary key default uuid_generate_v4(),
    tenant_id uuid not null references public.tenants(id) on delete cascade,
    order_number varchar(50) unique not null,
    garment_id uuid not null references public.garments(id),
    satellite_user_id uuid references public.profiles(id),
    unit_price_agreed numeric(10,2) not null,
    total_units int not null,
    status public.order_status not null default 'draft',
    created_at timestamptz not null default now()
);

create table if not exists public.order_bundles (
    id uuid primary key default uuid_generate_v4(),
    order_id uuid not null references public.production_orders(id) on delete cascade,
    bundle_code varchar(60) unique not null,
    size varchar(10) not null,
    color varchar(50) not null,
    units_count int not null,
    created_at timestamptz not null default now()
);

-- Logs diarios de destajo (tope estricto por atado y operación)
create table if not exists public.daily_production_logs (
    id uuid primary key default uuid_generate_v4(),
    tenant_id uuid not null references public.tenants(id) on delete cascade,
    order_id uuid not null references public.production_orders(id),
    bundle_id uuid not null references public.order_bundles(id),
    operation_id uuid not null references public.garment_operations(id),
    operator_id uuid not null references public.profiles(id),
    units_completed int not null check (units_completed > 0),
    earned_amount numeric(10,2) not null,
    logged_at date not null default current_date,
    created_at timestamptz not null default now()
);

-- Tickets de faltantes y reposición
create type public.ticket_reason as enum ('missing_piece', 'damaged_fabric', 'shortage_supplies');
create type public.ticket_status as enum ('pending_satellite', 'approved_satellite', 'in_cutting_room', 'dispatched', 'resolved', 'cancelled');

create table if not exists public.material_tickets (
    id uuid primary key default uuid_generate_v4(),
    tenant_id uuid not null references public.tenants(id) on delete cascade,
    order_id uuid not null references public.production_orders(id),
    bundle_id uuid not null references public.order_bundles(id),
    part_id uuid references public.garment_parts(id),
    operator_id uuid not null references public.profiles(id),
    satellite_approver_id uuid references public.profiles(id),
    quantity_needed int not null check (quantity_needed > 0),
    reason public.ticket_reason not null,
    status public.ticket_status not null default 'pending_satellite',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Índices de apoyo
create index if not exists idx_garments_tenant on public.garments (tenant_id);
create index if not exists idx_orders_tenant on public.production_orders (tenant_id);
create index if not exists idx_orders_satellite on public.production_orders (satellite_user_id);
create index if not exists idx_bundles_order on public.order_bundles (order_id);
create index if not exists idx_logs_bundle_op on public.daily_production_logs (bundle_id, operation_id);
create index if not exists idx_logs_operator_date on public.daily_production_logs (operator_id, logged_at);
create index if not exists idx_tickets_status on public.material_tickets (status);
create index if not exists idx_links_satellite on public.satellite_links (satellite_user_id);
create index if not exists idx_links_tenant on public.satellite_links (brand_tenant_id);
