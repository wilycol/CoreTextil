-- ============================================================
-- CoreTextil SaaS · Parte 13: Sistema de Invitaciones Únicas
-- ============================================================

create type public.invite_target_role as enum ('satellite', 'operator');

create table if not exists public.invitations (
    id uuid primary key default uuid_generate_v4(),
    token uuid unique not null default uuid_generate_v4(),
    inviter_id uuid not null references public.profiles(id) on delete cascade,
    brand_tenant_id uuid references public.tenants(id) on delete cascade, -- Necesario si es invitacion a Satélite
    target_role public.invite_target_role not null,
    is_used boolean not null default false,
    used_by_user_id uuid references public.profiles(id),
    used_at timestamptz,
    expires_at timestamptz not null default (now() + interval '7 days'),
    created_at timestamptz not null default now()
);

-- Indices para búsqueda rápida
create index if not exists idx_invitations_token on public.invitations (token);
create index if not exists idx_invitations_inviter on public.invitations (inviter_id);

-- RLS
alter table public.invitations enable row level security;

-- Quien invita puede ver y crear sus invitaciones
create policy "Usuarios pueden ver las invitaciones que crearon"
    on public.invitations for select
    to authenticated
    using (inviter_id = auth.uid());

create policy "Usuarios pueden insertar invitaciones"
    on public.invitations for insert
    to authenticated
    with check (inviter_id = auth.uid());

-- Cualquier usuario publico puede LEER una invitación usando el token (para mostrarle quién lo invita)
create policy "Cualquiera puede leer una invitacion publica activa"
    on public.invitations for select
    to public
    using (token is not null and not is_used and expires_at > now());

-- Función Segura para "Quemar" y Aceptar el Token
create or replace function public.accept_invitation(invite_token uuid)
returns boolean
language plpgsql
security definer -- Corre con privilegios de admin por dentro
set search_path = public
as $$
declare
    v_invite record;
    v_user_id uuid;
begin
    v_user_id := auth.uid();
    if v_user_id is null then
        raise exception 'Debes iniciar sesión para aceptar la invitación.';
    end if;

    -- Buscar la invitacion y bloquearla temporalmente (para evitar carrera/doble uso)
    select * into v_invite from public.invitations
    where token = invite_token for update;

    if not found then
        raise exception 'La invitación no existe o el enlace es incorrecto.';
    end if;

    if v_invite.is_used then
        raise exception 'Este enlace es de un solo uso y ya fue utilizado.';
    end if;

    if v_invite.expires_at < now() then
        raise exception 'Este enlace de invitación ha expirado.';
    end if;

    -- LOGICA: SI ES UNA INVITACIÓN DE MARCA HACIA SATELITE
    if v_invite.target_role = 'satellite' then
        -- Se inscribe en el vinculo B2B
        insert into public.satellite_links (satellite_user_id, brand_tenant_id)
        values (v_user_id, v_invite.brand_tenant_id)
        on conflict do nothing;
        
        -- Si no tenia rol, le ponemos satellite_owner
        update public.profiles 
        set role = coalesce(role, 'satellite_owner'::public.user_role)
        where id = v_user_id;

    -- LOGICA: SI ES UNA INVITACIÓN DE SATELITE HACIA OPERARIO
    elsif v_invite.target_role = 'operator' then
        -- Se asigna el jefe al operario
        update public.profiles 
        set role = coalesce(role, 'operator'::public.user_role),
            satellite_owner_id = v_invite.inviter_id
        where id = v_user_id;
    end if;

    -- Quemar el token definitivamente
    update public.invitations
    set is_used = true,
        used_by_user_id = v_user_id,
        used_at = now()
    where id = v_invite.id;

    return true;
end;
$$;
