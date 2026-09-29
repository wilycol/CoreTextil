-- ============================================================
-- CoreTextil SaaS · Parte 5: Nómina y liquidaciones por corte
-- Ejecutar después de 0001 -> 0002 -> 0003 -> 0004
-- ============================================================

-- Liquidaciones de nómina del satélite (semana / quincena)
create table if not exists public.payroll_runs (
    id uuid primary key default uuid_generate_v4(),
    satellite_user_id uuid not null references public.profiles(id) on delete cascade,
    period_start date not null,
    period_end date not null,
    total_cop numeric(12,2) not null default 0,
    total_units int not null default 0,
    operator_count int not null default 0,
    breakdown jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now(),
    constraint uk_payroll_period unique (satellite_user_id, period_start, period_end)
);

create index if not exists idx_payroll_satellite
    on public.payroll_runs (satellite_user_id, period_start desc);

alter table public.payroll_runs enable row level security;

create policy "payroll_all_own" on public.payroll_runs
    for all using (satellite_user_id = auth.uid())
    with check (satellite_user_id = auth.uid());

-- Liquidaciones de una orden de corte (las paga la marca por entregado)
create table if not exists public.order_liquidations (
    id uuid primary key default uuid_generate_v4(),
    order_id uuid not null references public.production_orders(id) on delete cascade,
    tenant_id uuid not null references public.tenants(id) on delete cascade,
    satellite_user_id uuid references public.profiles(id),
    units_delivered int not null,
    unit_price_cop numeric(10,2) not null,
    total_cop numeric(12,2) not null,
    created_by uuid not null references public.profiles(id),
    created_at timestamptz not null default now(),
    constraint uk_order_liquidation unique (order_id)
);

alter table public.order_liquidations enable row level security;

create policy "liquidations_tenant_all" on public.order_liquidations
    for all using (tenant_id = (public.current_profile()).tenant_id)
    with check (tenant_id = (public.current_profile()).tenant_id);

create policy "liquidations_satellite_read" on public.order_liquidations
    for select using (satellite_user_id = auth.uid());

-- El jefe de satélite puede ver los logs de destajo de sus operarios
-- (necesario para liquidar la nómina a un clic)
create policy "logs_read_team" on public.daily_production_logs
    for select using (
        exists (
            select 1 from public.profiles op
            where op.id = daily_production_logs.operator_id
              and op.satellite_owner_id = auth.uid()
        )
    );
