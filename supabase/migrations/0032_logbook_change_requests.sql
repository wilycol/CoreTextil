-- ============================================================
-- CoreTextil SaaS · Parte 32: Cuaderno Digital con doble confirmación
-- Corrección/eliminación de anotaciones de destajo, NO destructiva:
-- el operario solicita el cambio y el dueño del taller satélite
-- debe aprobarlo para que se aplique. Si lo rechaza, queda tal cual.
-- Ejecutar después de 0001..0031 en el SQL Editor.
-- ============================================================

-- El cambio puede ser: ajuste de piezas (edit_units) o borrado del registro (delete)
do $$ begin
  create type public.logbook_change_type as enum ('edit_units', 'delete');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.logbook_request_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

create table if not exists public.logbook_change_requests (
    id uuid primary key default uuid_generate_v4(),
    log_id uuid not null references public.daily_production_logs(id) on delete cascade,
    requested_by uuid not null references public.profiles(id) on delete cascade,
    approver_id uuid not null references public.profiles(id) on delete cascade,
    change_type public.logbook_change_type not null,
    -- 0 cuando es delete; > 0 con la cantidad CORRECTA para edit_units
    new_units int not null,
    reason text,
    status public.logbook_request_status not null default 'pending',
    decided_at timestamptz,
    decided_by uuid references public.profiles(id),
    created_at timestamptz not null default now()
);

create index if not exists idx_logbook_requests_log
    on public.logbook_change_requests (log_id);
-- Una sola solicitud pendiente por registro (evita colas dobles)
create unique index if not exists uk_logbook_requests_pending
    on public.logbook_change_requests (log_id) where status = 'pending';

alter table public.logbook_change_requests enable row level security;

drop policy if exists "logbook_requests_select_involved" on public.logbook_change_requests;
create policy "logbook_requests_select_involved" on public.logbook_change_requests
    for select using (
        requested_by = auth.uid()
        or approver_id = auth.uid()
    );

drop policy if exists "logbook_requests_insert_operator" on public.logbook_change_requests;
create policy "logbook_requests_insert_operator" on public.logbook_change_requests
    for insert with check (
        requested_by = auth.uid()
        and exists (
            select 1 from public.profiles op
            where op.id = auth.uid()
              and op.role = 'operator'
              and op.satellite_owner_id = logbook_change_requests.approver_id
        )
    );

drop policy if exists "logbook_requests_update_involved" on public.logbook_change_requests;
create policy "logbook_requests_update_involved" on public.logbook_change_requests
    for update using (
        approver_id = auth.uid()
        or (
            requested_by = auth.uid()
            and status = 'pending'
        )
    )
    with check (
        approver_id = auth.uid()
        or (
            requested_by = auth.uid()
            and status = 'pending'
        )
    );

-- ============================================================
-- RPC atómica de decisión (security definer; valida identidad internamente)
-- p_decision: 'approved' | 'rejected'
--  · approved + delete     → elimina la anotación
--  · approved + edit_units → ajusta units_completed y recalcula
--    earned_amount con la tarifa guardada en garment_operations
--  · rejected              → el log queda intacto
-- Re-valida el tope del atado al editar (no puede quedar sobre el cap).
-- ============================================================
create or replace function public.decide_logbook_change(
    p_request_id uuid,
    p_decision text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
    v_req public.logbook_change_requests%rowtype;
    v_log public.daily_production_logs%rowtype;
    v_rate numeric(10,2);
    v_new_earned numeric(10,2);
    v_cap int;
    v_other_done int;
begin
    if p_decision not in ('approved', 'rejected') then
        raise exception 'Decisión inválida: %', p_decision;
    end if;

    select * into v_req from public.logbook_change_requests
        where id = p_request_id;

    if v_req.id is null then
        raise exception 'Solicitud de cambio no encontrada';
    end if;

    if v_req.approver_id <> auth.uid() then
        raise exception 'Solo el dueño del taller acordado puede aprobar o rechazar';
    end if;

    if (select role from public.profiles where id = auth.uid()) <> 'satellite_owner' then
        raise exception 'Solo un dueño de taller satélite puede decidir solicitudes';
    end if;

    if v_req.status <> 'pending' then
        return json_build_object('ok', true, 'status', v_req.status, 'alreadyDecided', true);
    end if;

    if p_decision = 'approved' then
        select * into v_log from public.daily_production_logs
            where id = v_req.log_id;

        if v_log.id is null then
            -- El log fue borrado por otra vía; igual cerramos la solicitud
            update public.logbook_change_requests
                set status = 'approved', decided_at = now(), decided_by = auth.uid()
                where id = p_request_id;
            return json_build_object('ok', true, 'status', 'approved', 'logAlreadyGone', true);
        end if;

        if v_req.change_type = 'delete' then
            delete from public.daily_production_logs where id = v_log.id;
        else
            -- edit_units: validaciones
            if v_req.new_units is null or v_req.new_units <= 0 then
                raise exception 'La nueva cantidad debe ser mayor a 0';
            end if;

            select units_count into v_cap from public.order_bundles
                where id = v_log.bundle_id;
            if v_cap is null then
                raise exception 'Atado de la anotación ya no existe';
            end if;

            select coalesce(sum(units_completed), 0) into v_other_done
                from public.daily_production_logs
                where bundle_id = v_log.bundle_id
                  and operation_id = v_log.operation_id
                  and id <> v_log.id;

            if v_other_done + v_req.new_units > v_cap then
                raise exception 'El ajuste superaría el tope del atado (%/% ya registrados por otros)', v_other_done, v_cap;
            end if;

            select base_rate_cop into v_rate
                from public.garment_operations
                where id = v_log.operation_id;
            if v_rate is null then
                raise exception 'Operación de la anotación ya no existe';
            end if;

            v_new_earned := round(v_rate * v_req.new_units);
            update public.daily_production_logs
                set units_completed = v_req.new_units,
                    earned_amount = v_new_earned
                where id = v_log.id;
        end if;
    end if;

    update public.logbook_change_requests
        set status = p_decision::public.logbook_request_status,
            decided_at = now(),
            decided_by = auth.uid()
        where id = p_request_id;

    return json_build_object(
        'ok', true,
        'status', p_decision,
        'newUnits', coalesce(v_req.new_units, 0),
        'newEarned', coalesce(v_new_earned, 0)
    );
end;
$$;
