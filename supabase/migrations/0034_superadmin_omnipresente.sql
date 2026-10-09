-- ============================================================
-- Migration 0034: SuperAdmin omnipresente (cierre RLS)
-- El rol 'superadmin' debe poder acceder a TODOS los módulos de
-- la aplicación (cuaderno digital, marcación, nómina, solicitudes
-- de corrección, tickets, órdenes, atados...). Con las políticas
-- anteriores quedaba ciego en varias tablas del flujo textil.
-- Los demás roles no cambian: solo se RELAJA para superadmin.
-- ============================================================

-- Helper: ¿el usuario actual es superadmin?
create or replace function public.current_is_superadmin()
returns boolean
language sql
stable
set search_path = public
as $$
    select exists (
        select 1 from public.profiles
        where id = auth.uid() and role::text = 'superadmin'
    );
$$;

-- daily_production_logs ------------------------------------------------
drop policy if exists "logs_read_superadmin" on public.daily_production_logs;
create policy "logs_read_superadmin" on public.daily_production_logs
    for select using (public.current_is_superadmin());
-- (escritura sigue limitada al operario dueño del registro)

-- production_orders ----------------------------------------------------
drop policy if exists "orders_read_superadmin" on public.production_orders;
create policy "orders_read_superadmin" on public.production_orders
    for select using (public.current_is_superadmin());

-- order_bundles (via orden) -------------------------------------------
drop policy if exists "bundles_read_superadmin" on public.order_bundles;
create policy "bundles_read_superadmin" on public.order_bundles
    for select using (public.current_is_superadmin());

-- garments y operaciones (catálogo global para supervisión) ------------
drop policy if exists "garments_read_superadmin" on public.garments;
create policy "garments_read_superadmin" on public.garments
    for select using (public.current_is_superadmin());

drop policy if exists "garment_operations_read_superadmin" on public.garment_operations;
create policy "garment_operations_read_superadmin" on public.garment_operations
    for select using (public.current_is_superadmin());

drop policy if exists "garment_parts_read_superadmin" on public.garment_parts;
create policy "garment_parts_read_superadmin" on public.garment_parts
    for select using (public.current_is_superadmin());

-- logbook_change_requests (solicitudes de corrección) -------------------
drop policy if exists "logbook_requests_read_superadmin" on public.logbook_change_requests;
create policy "logbook_requests_read_superadmin" on public.logbook_change_requests
    for select using (public.current_is_superadmin());

drop policy if exists "logbook_requests_update_superadmin" on public.logbook_change_requests;
create policy "logbook_requests_update_superadmin" on public.logbook_change_requests
    for update using (public.current_is_superadmin())
    with check (public.current_is_superadmin());

-- payroll_runs (nómina de todos los talleres) --------------------------
drop policy if exists "payroll_read_superadmin" on public.payroll_runs;
create policy "payroll_read_superadmin" on public.payroll_runs
    for select using (public.current_is_superadmin());

-- satellite_cost_profiles (CFI/simulador, lectura) ----------------------
drop policy if exists "cost_profiles_read_superadmin" on public.satellite_cost_profiles;
create policy "cost_profiles_read_superadmin" on public.satellite_cost_profiles
    for select using (public.current_is_superadmin());

-- material_tickets (lectura global) ------------------------------------
drop policy if exists "tickets_read_superadmin" on public.material_tickets;
create policy "tickets_read_superadmin" on public.material_tickets
    for select using (public.current_is_superadmin());

-- tenants (supervisión de todas las marcas) ----------------------------
drop policy if exists "tenants_read_superadmin" on public.tenants;
create policy "tenants_read_superadmin" on public.tenants
    for select using (public.current_is_superadmin());
