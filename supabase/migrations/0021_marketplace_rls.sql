-- Migración Fase 2: Marketplace de Operarios (Agentes Libres)
-- Permitir a los Jefes de Satélite ver los perfiles de los operarios que no tienen jefe asignado

CREATE POLICY "Jefes de satélite pueden ver operarios libres"
  ON public.operator_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles me
      WHERE me.id = auth.uid() AND me.role = 'satellite_owner'
    )
    AND
    EXISTS (
      SELECT 1 FROM public.profiles op
      WHERE op.id = operator_profiles.id 
      AND op.role = 'operator'
      AND op.satellite_owner_id IS NULL
    )
  );

-- También necesitamos que puedan ver el `profiles` general de esos operarios libres
CREATE POLICY "Jefes de satélite pueden ver profiles de operarios libres"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles me
      WHERE me.id = auth.uid() AND me.role = 'satellite_owner'
    )
    AND
    role = 'operator'
    AND satellite_owner_id IS NULL
  );
