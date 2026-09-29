-- ============================================================
-- CoreTextil SaaS · Parte 6: Snapshot de nombres para reportes
-- Ejecutar después de 0001 -> 0002 -> 0003 -> 0004 -> 0005
-- ============================================================

-- Los reportes contables deben sobrevivir aunque un satélite se desvincule:
-- la liquidación guarda el nombre del taller al momento de pagar.
alter table public.order_liquidations
    add column if not exists satellite_name text;

-- Nombre visible de cualquier perfil (para liquidadas del histórico)
create or replace function public.profile_display_name(p_profile_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
    select full_name from public.profiles where id = p_profile_id;
$$;
