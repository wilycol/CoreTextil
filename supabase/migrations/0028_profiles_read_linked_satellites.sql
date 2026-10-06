-- ============================================================
-- CoreTextil SaaS · Parte 28: Permisos RLS SELECT para perfiles de satélites vinculados
-- Permite a las marcas leer el nombre, correo y avatar de los talleres satélite vinculados a su red
-- ============================================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'profiles_read_linked_satellites' AND tablename = 'profiles'
    ) THEN
        CREATE POLICY "profiles_read_linked_satellites" 
        ON public.profiles FOR SELECT 
        TO authenticated 
        USING (
            EXISTS (
                SELECT 1 FROM public.satellite_links l 
                WHERE l.satellite_user_id = profiles.id 
                  AND l.brand_tenant_id = (public.current_profile()).tenant_id
            )
        );
    END IF;
END $$;
