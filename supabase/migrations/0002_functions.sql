-- ============================================================
-- CoreTextil SaaS · Parte 2/3: Funciones y triggers
-- Ejecutar en orden: 0001 -> 0002 -> 0003 en el SQL Editor
-- ============================================================

-- Busqueda de satelite por email (para asignar ordenes)
create or replace function public.find_satellite_by_email(target_email text)
returns table (id uuid, full_name varchar, email varchar)
language sql
stable
security definer
set search_path = public
as $$
    select p.id, p.full_name, p.email
    from public.profiles p
    where lower(p.email) = lower(target_email)
      and p.role = 'satellite_owner';
$$;

-- Perfil del usuario autenticado (helper para RLS)
create or replace function public.current_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
    select * from public.profiles where id = auth.uid();
$$;

-- Perfil automatico al registrarse con Google SSO
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, google_id, email, full_name, role)
    values (
        new.id,
        coalesce(new.raw_user_meta_data ->> 'sub', new.id::text),
        new.email,
        coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', new.email),
        'operator'::public.user_role
    )
    on conflict (id) do nothing;

    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- updated_at automatico
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists touch_satellite_cost_profiles on public.satellite_cost_profiles;
create trigger touch_satellite_cost_profiles
    before update on public.satellite_cost_profiles
    for each row execute function public.touch_updated_at();

drop trigger if exists touch_material_tickets on public.material_tickets;
create trigger touch_material_tickets
    before update on public.material_tickets
    for each row execute function public.touch_updated_at();

-- Tope estricto: no reportar mas piezas que el atado (RF-05)
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
    where id = new.bundle_id;

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

drop trigger if exists bundle_cap_check on public.daily_production_logs;
create trigger bundle_cap_check
    before insert on public.daily_production_logs
    for each row execute function public.enforce_bundle_cap();
