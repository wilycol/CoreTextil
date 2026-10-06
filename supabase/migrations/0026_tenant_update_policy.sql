-- ============================================================
-- CoreTextil SaaS · Parte 26: Política RLS de actualización para Marca (Tenants)
-- Permite a los miembros de la marca (tenant) actualizar su información corporativa
-- ============================================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'tenants_update_members' AND tablename = 'tenants'
    ) THEN
        CREATE POLICY "tenants_update_members" 
        ON public.tenants FOR UPDATE 
        TO authenticated 
        USING ( id = (public.current_profile()).tenant_id )
        WITH CHECK ( id = (public.current_profile()).tenant_id );
    END IF;
END $$;
