-- Migración Fase 2: Ficha de Registro de Marcas (Onboarding B2B)
-- Agregamos campos adicionales a la tabla tenants para la configuración de la Marca

ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS admin_phone varchar(50),
ADD COLUMN IF NOT EXISTS admin_address text;
