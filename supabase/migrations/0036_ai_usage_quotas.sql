-- ============================================================
-- CoreTextil SaaS · Migración 0036: Cuotas y Auditoría de IA
-- ============================================================

-- 1. Helper para verificar si el usuario actual es superadmin
CREATE OR REPLACE FUNCTION public.current_is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role::text = 'superadmin'
    );
$$;

-- 2. Tabla de auditoría y cuotas de uso de IA
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
    action_type varchar(50) NOT NULL DEFAULT 'vision_explode',
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Habilitar RLS
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own ai usage logs" ON public.ai_usage_logs;
CREATE POLICY "Users can insert their own ai usage logs"
ON public.ai_usage_logs FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view their own ai usage logs" ON public.ai_usage_logs;
CREATE POLICY "Users can view their own ai usage logs"
ON public.ai_usage_logs FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Superadmin can manage all ai usage logs" ON public.ai_usage_logs;
CREATE POLICY "Superadmin can manage all ai usage logs"
ON public.ai_usage_logs FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role::text = 'superadmin'
    )
);

-- 4. Helper para consultar uso semanal acumulado
CREATE OR REPLACE FUNCTION public.get_weekly_ai_usage(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT count(*)::integer
    FROM public.ai_usage_logs
    WHERE user_id = p_user_id
      AND created_at >= date_trunc('week', now());
$$;
