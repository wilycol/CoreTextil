-- Migration: 0017_ai_vision_worker.sql
-- Description: AI Vision Worker Status Tracker table for Fenix Auto-Wake orchestration

CREATE TABLE IF NOT EXISTS public.ai_vision_worker (
  id INT PRIMARY KEY DEFAULT 1,
  cloudflare_url TEXT,
  status VARCHAR(20) DEFAULT 'offline', -- 'offline', 'booting', 'online'
  last_ping TIMESTAMP WITH TIME ZONE
);

-- Insert the default row so we always update id=1
INSERT INTO public.ai_vision_worker (id, status) VALUES (1, 'offline') ON CONFLICT DO NOTHING;
