-- ============================================================
-- CoreTextil SaaS · Parte 7: Materiales + acceso del equipo satélite
-- Ejecutar después de 0001..0006
-- ============================================================

-- ------------------------------------------------------------
-- Materiales por prenda (tela, insumos) con costo unitario real
-- ------------------------------------------------------------
create table if not exists public.garment_materials (
    id uuid primary key default uuid_generate_v4(),
    garment_id uuid not null references public.garments(id) on delete cascade,
    name varchar(120) not null,
    unit varchar(20) not null default 'unidad',
    quantity_per_garment numeric(10,2) not null default 1,
    unit_cost_cop numeric(10,2) not null default 0,
    created_at timestamptz not null default now()
);

create index if not exists idx_materials_garment
    on public.garment_materials (garment_id);

alter table public.garment_materials enable row level security;

create policy "materials_tenant" on public.garment_materials
    for all using (
        exists (
            select 1 from public.garments g
            where g.id = garment_materials.garment_id
              and g.tenant_id = public.current_profile().tenant_id
        )
    )
    with check (
        exists (
            select 1 from public.garments g
            where g.id = garment_materials.garment_id
              and g.tenant_id = public.current_profile().tenant_id
        )
    );

-- ------------------------------------------------------------
-- Helper: satélite efectivo del usuario (dueño u operario)
-- ------------------------------------------------------------
create or replace function public.current_satellite_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
    select coalesce(
        case
            when p.role = 'operator' then p.satellite_owner_id
            when p.role = 'satellite_owner' then p.id
        end
    )
    from public.profiles p
    where p.id = auth.uid();
$$;

-- ------------------------------------------------------------
-- Acceso del equipo del satélite: órdenes y atados de su taller
-- (sin esto, los OPERARIOS no podían verlas para marcar)
-- ------------------------------------------------------------
create policy "orders_read_team" on public.production_orders
    for select using (satellite_user_id = public.current_satellite_id());

create policy "bundles_read_team" on public.order_bundles
    for all using (
        exists (
            select 1 from public.production_orders o
            where o.id = order_bundles.order_id
              and o.satellite_user_id = public.current_satellite_id()
        )
    );

-- Prendas/operaciones/piezas: visibles para el equipo del satélite que
-- tiene asignada una orden de esa prenda
create policy "garments_read_team" on public.garments
    for select using (
        exists (
            select 1 from public.production_orders o
            where o.garment_id = garments.id
              and o.satellite_user_id = public.current_satellite_id()
        )
    );

create policy "garment_parts_read_team" on public.garment_parts
    for select using (
        exists (
            select 1 from public.production_orders o
            join public.garment_parts gp on gp.garment_id = o.garment_id
            where gp.id = garment_parts.id
              and o.satellite_user_id = public.current_satellite_id()
        )
    );

create policy "garment_operations_read_team" on public.garment_operations
    for select using (
        exists (
            select 1 from public.production_orders o
            join public.garment_operations go_ on go_.garment_id = o.garment_id
            where go_.id = garment_operations.id
              and o.satellite_user_id = public.current_satellite_id()
        )
    );

-- Materiales: el satélite que confecciona la prenda consulta los consumos
create policy "materials_read_team" on public.garment_materials
    for select using (
        exists (
            select 1 from public.production_orders o
            where o.garment_id = garment_materials.garment_id
              and o.satellite_user_id = public.current_satellite_id()
        )
    );
