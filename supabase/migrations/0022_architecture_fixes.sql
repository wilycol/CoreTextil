-- ==============================================================================
-- Migración Fase 2: Parches Estructurales de Arquitectura
-- Soluciona:
-- 1. Autonomía Financiera del Taller (satellite_operation_rates)
-- 2. Estados de Negociación en Órdenes (assignment_status)
-- 3. Mapeo Piezas vs Operaciones (operation_parts)
-- 4. Dependencias en Serie de Procesos (prerequisite_operation_id)
-- 5. Prevención de Doble Facturación (Trigger en daily_production_logs)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Autonomía Financiera (El Taller decide su destajo)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.satellite_operation_rates (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    satellite_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    operation_id uuid NOT NULL REFERENCES public.garment_operations(id) ON DELETE CASCADE,
    satellite_rate_cop numeric(10,2) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (satellite_user_id, operation_id)
);

CREATE TRIGGER update_satellite_operation_rates_modtime
BEFORE UPDATE ON public.satellite_operation_rates
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.satellite_operation_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Satellites can manage their own rates"
    ON public.satellite_operation_rates FOR ALL
    USING (auth.uid() = satellite_user_id);


-- ------------------------------------------------------------------------------
-- 2. Negociación de Órdenes de Producción
-- ------------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE public.order_assignment_status AS ENUM ('proposed', 'accepted', 'rejected', 'negotiating');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.production_orders
ADD COLUMN IF NOT EXISTS assignment_status public.order_assignment_status NOT NULL DEFAULT 'proposed';


-- ------------------------------------------------------------------------------
-- 3 & 4. Mapeo Piezas vs Operaciones y Secuencia Lógica (Grafo de Procesos)
-- ------------------------------------------------------------------------------
-- Agregar dependencia previa para operaciones en serie
ALTER TABLE public.garment_operations
ADD COLUMN IF NOT EXISTS prerequisite_operation_id uuid REFERENCES public.garment_operations(id) ON DELETE SET NULL;

-- Tabla intermedia para saber qué piezas (Parts) requiere cada operación
CREATE TABLE IF NOT EXISTS public.operation_parts (
    operation_id uuid NOT NULL REFERENCES public.garment_operations(id) ON DELETE CASCADE,
    part_id uuid NOT NULL REFERENCES public.garment_parts(id) ON DELETE CASCADE,
    PRIMARY KEY (operation_id, part_id)
);


-- ------------------------------------------------------------------------------
-- 5. Prevención de Doble Facturación en Atados (Race Condition)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_bundle_operation_capacity()
RETURNS TRIGGER AS $$
DECLARE
    bundle_qty INT;
    current_total INT;
BEGIN
    -- Obtener la cantidad total del atado
    SELECT quantity INTO bundle_qty FROM public.order_bundles WHERE id = NEW.bundle_id;
    
    -- Sumar las unidades ya reportadas para ESA operación en ESE atado (ignorando el registro actual si es un UPDATE)
    SELECT COALESCE(SUM(units_completed), 0) INTO current_total 
    FROM public.daily_production_logs 
    WHERE bundle_id = NEW.bundle_id AND operation_id = NEW.operation_id AND id != NEW.id;
    
    -- Verificar si la suma excede la cantidad del atado
    IF (current_total + NEW.units_completed) > bundle_qty THEN
        RAISE EXCEPTION 'Fraude o Error detectado: La cantidad reportada (% + %) supera el total de prendas del atado (%)', current_total, NEW.units_completed, bundle_qty;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_bundle_capacity ON public.daily_production_logs;
CREATE TRIGGER enforce_bundle_capacity
BEFORE INSERT OR UPDATE ON public.daily_production_logs
FOR EACH ROW EXECUTE FUNCTION public.check_bundle_operation_capacity();
