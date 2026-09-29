-- ============================================================
-- CoreTextil SaaS · Parte 3/3: Row Level Security por tenant
-- Ejecutar en orden: 0001 -> 0002 -> 0003 en el SQL Editor
-- ============================================================

alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.satellite_links enable row level security;
alter table public.satellite_cost_profiles enable row level security;
alter table public.garments enable row level security;
alter table public.garment_parts enable row level security;
alter table public.garment_operations enable row level security;
alter table public.production_orders enable row level security;
alter table public.order_bundles enable row level security;
alter table public.daily_production_logs enable row level security;
alter table public.material_tickets enable row level security;

-- Tenants: visibles para sus miembros (necesario para onboarding)
create policy "tenants_select_members" on public.tenants
    for select using (id = (public.current_profile()).tenant_id);

-- Perfiles: cada usuario ve su perfil, sus operarios y los de su jefe
create policy "profiles_select_self_and_team" on public.profiles
    for select using (
        id = auth.uid()
        or satellite_owner_id = auth.uid()
        or id = (public.current_profile()).satellite_owner_id
        or tenant_id = (public.current_profile()).tenant_id
    );

create policy "profiles_update_self" on public.profiles
    for update using (id = auth.uid());

create policy "profiles_owner_creates_operators" on public.profiles
    for insert with check (satellite_owner_id = auth.uid());

-- Enlaces marca-satélite: la marca los crea; ambos lados los leen
create policy "links_read_both" on public.satellite_links
    for select using (
        satellite_user_id = auth.uid()
        or brand_tenant_id = (public.current_profile()).tenant_id
    );

create policy "links_insert_brand" on public.satellite_links
    for insert with check (brand_tenant_id = (public.current_profile()).tenant_id);

-- Costos fijos: solo el dueño del satélite
create policy "cost_profiles_all_own" on public.satellite_cost_profiles
    for all using (satellite_user_id = auth.uid())
    with check (satellite_user_id = auth.uid());

-- Prendas: la marca dueña, o un satélite que ya produce esa prenda
create policy "garments_tenant" on public.garments
    for all using (
        tenant_id = (public.current_profile()).tenant_id
        or exists (
            select 1 from public.production_orders o
            where o.garment_id = garments.id
              and o.satellite_user_id = auth.uid()
        )
    )
    with check (tenant_id = (public.current_profile()).tenant_id);

create policy "garment_parts_tenant" on public.garment_parts
    for all using (
        exists (
            select 1 from public.garments g
            join public.production_orders o on o.garment_id = g.id
            where g.id = garment_parts.garment_id
              and (g.tenant_id = (public.current_profile()).tenant_id
                   or o.satellite_user_id = auth.uid())
        )
    )
    with check (
        exists (
            select 1 from public.garments g
            where g.id = garment_parts.garment_id
              and g.tenant_id = (public.current_profile()).tenant_id
        )
    );

create policy "garment_operations_tenant" on public.garment_operations
    for all using (
        exists (
            select 1 from public.garments g
            join public.production_orders o on o.garment_id = g.id
            where g.id = garment_operations.garment_id
              and (g.tenant_id = (public.current_profile()).tenant_id
                   or o.satellite_user_id = auth.uid())
        )
    )
    with check (
        exists (
            select 1 from public.garments g
            where g.id = garment_operations.garment_id
              and g.tenant_id = (public.current_profile()).tenant_id
        )
    );

-- Órdenes: la marca dueña o el satélite asignado
create policy "orders_tenant_or_satellite" on public.production_orders
    for select using (
        tenant_id = (public.current_profile()).tenant_id
        or satellite_user_id = auth.uid()
    );

create policy "orders_tenant_write" on public.production_orders
    for insert with check (tenant_id = (public.current_profile()).tenant_id);

create policy "orders_tenant_update" on public.production_orders
    for update using (tenant_id = (public.current_profile()).tenant_id);

-- Atados: vía su orden
create policy "bundles_via_order" on public.order_bundles
    for all using (
        exists (select 1 from public.production_orders o
                where o.id = order_id
                  and (o.tenant_id = (public.current_profile()).tenant_id
                       or o.satellite_user_id = auth.uid()))
    )
    with check (
        exists (select 1 from public.production_orders o
                where o.id = order_id
                  and (o.tenant_id = (public.current_profile()).tenant_id
                       or o.satellite_user_id = auth.uid()))
    );

-- Logs: operario inserta lo suyo; marca/satélite lee lo propio
create policy "logs_insert_own" on public.daily_production_logs
    for insert with check (operator_id = auth.uid());

create policy "logs_read_tenant" on public.daily_production_logs
    for select using (
        tenant_id = (public.current_profile()).tenant_id
        or operator_id = auth.uid()
    );

-- Tickets: operario crea; involucrados leen y actualizan
create policy "tickets_insert_operator" on public.material_tickets
    for insert with check (operator_id = auth.uid());

create policy "tickets_read_involved" on public.material_tickets
    for select using (
        tenant_id = (public.current_profile()).tenant_id
        or operator_id = auth.uid()
        or satellite_approver_id = auth.uid()
        or exists (
            select 1 from public.profiles op
            where op.id = material_tickets.operator_id
              and op.satellite_owner_id = auth.uid()
        )
    );

create policy "tickets_update_involved" on public.material_tickets
    for update using (
        tenant_id = (public.current_profile()).tenant_id
        or satellite_approver_id = auth.uid()
        or (
            exists (select 1 from public.profiles p
                    where p.id = auth.uid() and p.role = 'satellite_owner')
            and exists (select 1 from public.production_orders o
                        where o.id = material_tickets.order_id
                          and o.satellite_user_id = auth.uid())
        )
    );
