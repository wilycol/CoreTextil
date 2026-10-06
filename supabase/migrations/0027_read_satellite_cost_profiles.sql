-- ============================================================
-- CoreTextil SaaS · Parte 27: Permisos RLS SELECT para lectura del nombre comercial del Taller
-- Permite a los operarios del taller y marcas vinculadas leer la identidad del Taller Satélite
-- ============================================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'cost_profiles_read_team_or_public' AND tablename = 'satellite_cost_profiles'
    ) THEN
        CREATE POLICY "cost_profiles_read_team_or_public" 
        ON public.satellite_cost_profiles FOR SELECT 
        TO authenticated 
        USING (
            satellite_user_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.profiles p 
                WHERE p.id = auth.uid() AND p.satellite_owner_id = satellite_cost_profiles.satellite_user_id
            )
            OR EXISTS (
                SELECT 1 FROM public.satellite_links l 
                WHERE l.satellite_user_id = satellite_cost_profiles.satellite_user_id 
                  AND l.brand_tenant_id = (public.current_profile()).tenant_id
            )
        );
    END IF;
END $$;
