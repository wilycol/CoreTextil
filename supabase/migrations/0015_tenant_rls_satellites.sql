-- Permitir que los talleres satélite vean el nombre de las marcas a las que están vinculados
create policy "tenants_select_linked_satellites" on public.tenants
    for select using (
        exists (
            select 1 from public.satellite_links 
            where brand_tenant_id = tenants.id 
            and satellite_user_id = auth.uid()
        )
    );
