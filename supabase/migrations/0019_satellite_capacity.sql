-- Migración Fase 2: Configuración "Mi Taller" (Satélites)
-- Expandimos la tabla existente de costos para incluir la capacidad instalada

ALTER TABLE public.satellite_cost_profiles
ADD COLUMN IF NOT EXISTS commercial_name text,
ADD COLUMN IF NOT EXISTS max_operators integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS available_machines text[] DEFAULT '{}';

-- Asegurarnos de que el trigger touch_updated_at esté asociado a esta tabla (por si no lo estaba)
DROP TRIGGER IF EXISTS update_satellite_cost_profiles_modtime ON public.satellite_cost_profiles;

CREATE TRIGGER update_satellite_cost_profiles_modtime
BEFORE UPDATE ON public.satellite_cost_profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
