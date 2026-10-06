-- ============================================================
-- CoreTextil SaaS · Parte 29: RLS para adición de operaciones de confección por Satélites
-- Permite a los talleres satélite asignados añadir/editar operaciones de ensamble (ej: despeluzado, empacado)
-- ============================================================

DROP POLICY IF EXISTS "garment_operations_tenant" ON public.garment_operations;

CREATE POLICY "garment_operations_tenant" ON public.garment_operations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.garments g
            LEFT JOIN public.production_orders o ON o.garment_id = g.id
            WHERE g.id = garment_operations.garment_id
              AND (g.tenant_id = (public.current_profile()).tenant_id
                   OR o.satellite_user_id = auth.uid())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.garments g
            LEFT JOIN public.production_orders o ON o.garment_id = g.id
            WHERE g.id = garment_operations.garment_id
              AND (g.tenant_id = (public.current_profile()).tenant_id
                   OR o.satellite_user_id = auth.uid())
        )
    );
