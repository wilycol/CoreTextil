-- ==============================================================================
-- Migración Fase 2: Sistema de Notificaciones In-App
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    body text NOT NULL,
    type text NOT NULL, -- 'order_proposed', 'order_negotiating', 'ticket_update', 'system_reminder'
    is_read boolean NOT NULL DEFAULT false,
    action_url text, -- Opcional, ruta a la que redirigir al hacer clic (ej. /dashboard/ordenes/123)
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- Opcional: Índice para búsquedas rápidas de notificaciones no leídas
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id) WHERE is_read = false;
