-- ============================================================
-- Migration 0035: Rol factory_admin (Fábrica Integrada / Ciclo Completo)
-- Permite que una fábrica con diseño, mesa de corte y planta de costura
-- propia opere de forma unificada bajo un mismo tenant y usuario.
-- ============================================================

-- 1. Añadir 'factory_admin' al enum public.user_role si no existe
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'factory_admin';

-- 2. Helper: ¿el usuario actual es factory_admin?
CREATE OR REPLACE FUNCTION public.current_is_factory_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role::text = 'factory_admin'
    );
$$;

-- 3. Actualizar búsqueda de taller/satélite por email para incluir factory_admin
CREATE OR REPLACE FUNCTION public.find_satellite_by_email(target_email text)
RETURNS TABLE (id uuid, full_name varchar, email varchar)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT p.id, p.full_name, p.email
    FROM public.profiles p
    WHERE lower(p.email) = lower(target_email)
      AND p.role::text IN ('satellite_owner', 'factory_admin');
$$;

