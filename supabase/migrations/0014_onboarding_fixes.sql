-- Permitir que cualquier usuario autenticado cree su propia organización (Marca) durante el onboarding
create policy "tenants_insert_authenticated" on public.tenants
    for insert with check (auth.role() = 'authenticated');
