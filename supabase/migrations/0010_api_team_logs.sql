-- ============================================================
-- CoreTextil SaaS · Parte 10: API v1 y lectura de equipo
-- Ejecutar después de 0001..0009 en el SQL Editor
-- ============================================================

-- La API v1 reutiliza las mismas reglas que la app (sesión por cookies).
-- Ajuste de permisos: los logs son visibles para TODO el equipo del taller
-- (el operario necesita el avance de sus compañeros para respetar el tope
-- compartido por atado+operación en la UI de marcación).
drop policy if exists "logs_read_tenant" on public.daily_production_logs;
create policy "logs_read_tenant" on public.daily_production_logs
    for select using (
        tenant_id = (public.current_profile()).tenant_id
        or operator_id = auth.uid()
        or exists (
            select 1 from public.profiles op
            where op.id = daily_production_logs.operator_id
              and op.satellite_owner_id = auth.uid()
        )
        or exists (
            select 1 from public.profiles me
            where me.id = auth.uid()
              and me.satellite_owner_id = daily_production_logs.operator_id
        )
        or exists (
            select 1 from public.production_orders o
            where o.id = daily_production_logs.order_id
              and o.satellite_user_id = public.current_satellite_id()
        )
    );
