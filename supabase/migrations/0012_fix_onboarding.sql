-- ============================================================
-- CoreTextil SaaS · Parte 12: Fix Onboarding (Quitar rol por defecto)
-- ============================================================

-- Quitar el valor "operator" por defecto y permitir que el rol sea nulo al inicio
alter table public.profiles alter column role drop not null;
alter table public.profiles alter column role drop default;

-- Actualizar el trigger para que los nuevos usuarios de Google SSO arranquen sin rol (nulo)
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
        null -- <-- Antes decía 'operator'::public.user_role
    )
    on conflict (id) do nothing;

    return new;
end;
$$;

-- Resetear los roles de los usuarios que ya entraron para que puedan ver la pantalla de Onboarding
update public.profiles set role = null, tenant_id = null;
