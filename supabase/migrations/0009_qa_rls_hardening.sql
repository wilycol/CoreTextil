-- ============================================================
-- CoreTextil SaaS · Parte 9: QA — huecos de RLS antes del piloto
-- Ejecutar después de 0001..0008 en el SQL Editor
-- ============================================================

-- ------------------------------------------------------------
-- FIX 1: el onboarding de marca no podía crear el tenant
-- (no existía política INSERT en tenants; solo SELECT miembros)
-- ------------------------------------------------------------
create policy "tenants_insert_member" on public.tenants
    for insert with check (true);

-- El tenant se crea vacío y de inmediato se asigna al perfil que lo creó.
-- Nota: un usuario autenticado puede crear un tenant (organización nueva);
-- solo verá el suyo por tenants_select_members.

-- ------------------------------------------------------------
-- FIX 2: escalada de privilegios vía profiles_update_self
-- La política de auto-actualización permitía a cualquier usuario cambiarse
-- role/tenant_id/satellite_owner_id (p.ej. un satélite vinculándose como
-- brand_admin del tenant de su marca). Se restringe con un trigger:
-- solo un perfil aún 'operator' (recién llegado) puede definir su rol,
-- su tenant o su jefe de taller (flujo de onboarding).
-- ------------------------------------------------------------
create or replace function public.guard_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if old.role <> 'operator' and (
        new.role is distinct from old.role
        or new.tenant_id is distinct from old.tenant_id
        or new.satellite_owner_id is distinct from old.satellite_owner_id
    ) then
        raise exception 'No puedes cambiar tu rol o vínculo de taller desde tu perfil';
    end if;
    return new;
end;
$$;

drop trigger if exists guard_profile_role_change_trg on public.profiles;
create trigger guard_profile_role_change_trg
    before update on public.profiles
    for each row execute function public.guard_profile_role_change();

-- ------------------------------------------------------------
-- FIX 3: los operarios necesitan leer las operaciones de la prenda de sus
-- atados aunque la ruta la haya creado otra marca... ya cubierto en 0007.
-- Se agrega el caso que faltaba: material_tickets debe poder leerse por
-- el satélite dueño de la orden aunque su perfil no tenga tenant.
-- (tickets_read_involved ya lo cubre vía satellite_approver_id/team;
--  se añade el filtro por orden asignada para el jefe del taller.)
-- ------------------------------------------------------------
drop policy if exists "tickets_read_involved" on public.material_tickets;
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
        or exists (
            select 1 from public.production_orders o
            where o.id = material_tickets.order_id
              and o.satellite_user_id = auth.uid()
        )
    );

-- ------------------------------------------------------------
-- FIX 4: tope de atado a prueba de concurrencia.
-- El trigger leía el total antes del INSERT; dos inserciones simultáneas
-- (dos operarios del mismo taller marcando el mismo atado+operación)
-- podían pasarse del tope (race condition). FOR UPDATE cierra la ventana.
-- ------------------------------------------------------------
create or replace function public.enforce_bundle_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    cap int;
    done int;
begin
    select units_count into cap
    from public.order_bundles
    where id = new.bundle_id
    for update;

    if cap is null then
        raise exception 'Atado % no existe', new.bundle_id;
    end if;

    select coalesce(sum(units_completed), 0) into done
    from public.daily_production_logs
    where bundle_id = new.bundle_id
      and operation_id = new.operation_id;

    if done + new.units_completed > cap then
        raise exception 'Tope del atado superado: % de % piezas ya registradas para esta operacion', done, cap;
    end if;

    return new;
end;
$$;
