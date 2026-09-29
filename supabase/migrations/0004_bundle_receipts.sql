-- ============================================================
-- CoreTextil SaaS · Parte 4: Recepción de atados vía escáner QR
-- Ejecutar después de 0001 -> 0002 -> 0003 en el SQL Editor
-- ============================================================

-- Una recepción por atado (idempotente: re-escanear no duplica)
create table if not exists public.satellite_bundle_receipts (
    id uuid primary key default uuid_generate_v4(),
    bundle_id uuid not null references public.order_bundles(id) on delete cascade,
    order_id uuid not null references public.production_orders(id) on delete cascade,
    satellite_user_id uuid not null references public.profiles(id) on delete cascade,
    received_by uuid not null references public.profiles(id) on delete cascade,
    received_at timestamptz not null default now(),
    note text,
    constraint uk_bundle_receipt unique (bundle_id)
);

create index if not exists idx_receipts_satellite
    on public.satellite_bundle_receipts (satellite_user_id, received_at desc);

alter table public.satellite_bundle_receipts enable row level security;

-- El dueño del satélite o sus operarios registran y ven las recepciones
create policy "receipts_insert_own_satellite" on public.satellite_bundle_receipts
    for insert with check (
        satellite_user_id = auth.uid()
        or exists (
            select 1 from public.profiles op
            where op.id = auth.uid()
              and op.satellite_owner_id = satellite_bundle_receipts.satellite_user_id
        )
    );

create policy "receipts_read_own_satellite" on public.satellite_bundle_receipts
    for select using (
        satellite_user_id = auth.uid()
        or exists (
            select 1 from public.profiles op
            where op.id = auth.uid()
              and op.satellite_owner_id = satellite_bundle_receipts.satellite_user_id
        )
    );

-- RPC atómica: valida que el atado pertenezca al taller de quien escanea,
-- registra la recepción (una sola vez) y pasa la orden a "En ensamble".
create or replace function public.receive_bundle_by_code(p_bundle_code text, p_note text default null)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
    v_bundle public.order_bundles%rowtype;
    v_order public.production_orders%rowtype;
    v_profile public.profiles%rowtype;
    v_satellite uuid;
    v_already boolean := false;
begin
    select * into v_profile from public.profiles where id = auth.uid();

    if v_profile.id is null then
        raise exception 'Debes estar autenticado para recibir atados';
    end if;

    if v_profile.role = 'operator' then
        v_satellite := v_profile.satellite_owner_id;
    else
        v_satellite := v_profile.id;
    end if;

    if v_satellite is null then
        raise exception 'Tu cuenta no está vinculada a un taller satélite';
    end if;

    select * into v_bundle from public.order_bundles where bundle_code = p_bundle_code;

    if v_bundle.id is null then
        raise exception 'Código de atado no encontrado: %', p_bundle_code;
    end if;

    select * into v_order from public.production_orders where id = v_bundle.order_id;

    if v_order.satellite_user_id is null then
        raise exception 'Ese atado aún no está asignado a ningún taller';
    end if;

    if v_order.satellite_user_id <> v_satellite then
        raise exception 'Ese atado no pertenece a tu taller';
    end if;

    insert into public.satellite_bundle_receipts
        (bundle_id, order_id, satellite_user_id, received_by, note)
    values
        (v_bundle.id, v_bundle.order_id, v_satellite, auth.uid(), p_note)
    on conflict (bundle_id) do nothing;

    if not found then
        v_already := true;
    end if;

    if v_order.status = 'dispatched' then
        update public.production_orders set status = 'in_progress' where id = v_order.id;
    end if;

    return json_build_object(
        'bundleId', v_bundle.id,
        'bundleCode', v_bundle.bundle_code,
        'size', v_bundle.size,
        'color', v_bundle.color,
        'units', v_bundle.units_count,
        'orderId', v_order.id,
        'orderNumber', v_order.order_number,
        'alreadyReceived', v_already
    );
end;
$$;
