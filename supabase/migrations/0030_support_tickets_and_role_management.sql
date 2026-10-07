-- ============================================================
-- Migration 0030: Support Tickets, Feedback, SuperAdmin & Role Management
-- ============================================================

-- 1. Añadir 'superadmin' al enum public.user_role si no existe
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'superadmin';

-- 2. Tabla de Tickets de Soporte / Feedback Hub
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_name VARCHAR(150),
    user_email VARCHAR(255) NOT NULL,
    role VARCHAR(50),
    type VARCHAR(50) NOT NULL DEFAULT 'bug' CHECK (type IN ('bug', 'feature_request', 'improvement', 'question')),
    severity VARCHAR(50) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    page_url TEXT,
    attachment_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para support_tickets
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios leen sus propios tickets"
ON public.support_tickets FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin'
));

CREATE POLICY "Usuarios insertan tickets"
ON public.support_tickets FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "SuperAdmins actualizan tickets"
ON public.support_tickets FOR UPDATE
TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin'
));

-- 3. Tabla de Feedbacks de Salida (Offboarding)
CREATE TABLE IF NOT EXISTS public.exit_feedbacks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_email VARCHAR(255) NOT NULL,
    previous_role VARCHAR(50),
    reason TEXT NOT NULL,
    comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para exit_feedbacks
ALTER TABLE public.exit_feedbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cualquier autenticado inserta exit_feedback"
ON public.exit_feedbacks FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "SuperAdmins leen exit_feedbacks"
ON public.exit_feedbacks FOR SELECT
TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin'
));
