-- ============================================================
-- Migration 0031: Fix guard_profile_role_change Trigger Function
-- Permite asignación de 'superadmin' y reseteo a 'operator' para Re-Onboarding
-- ============================================================

CREATE OR REPLACE FUNCTION public.guard_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 1. Permitir siempre si el nuevo rol es 'superadmin' o si se está reseteando a 'operator' para re-onboarding
    IF NEW.role = 'superadmin' OR NEW.role = 'operator' THEN
        RETURN NEW;
    END IF;

    -- 2. Si el usuario antiguo ya es superadmin, permite cualquier modificación
    IF OLD.role = 'superadmin' THEN
        RETURN NEW;
    END IF;

    -- 3. Bloqueo de escalada no autorizada para usuarios comunes ya registrados
    IF OLD.role <> 'operator' AND (
        NEW.role IS DISTINCT FROM OLD.role
        OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
        OR NEW.satellite_owner_id IS DISTINCT FROM OLD.satellite_owner_id
    ) THEN
        RAISE EXCEPTION 'No puedes cambiar tu rol o vínculo de taller sin pasar por el flujo oficial de re-onboarding.';
    END IF;

    RETURN NEW;
END;
$$;
