-- ============================================================
-- CoreTextil SaaS · Parte 8: Consumo de tela por talla
-- Ejecutar después de 0001..0007 en el SQL Editor
-- ============================================================

-- Factores de consumo por talla, en JSON: {"S":1,"M":1,"L":1.05,...}
-- La cantidad por prenda de garment_materials corresponde a la talla base
-- (factor 1). Las demás tallas multiplican ese consumo.
-- Si el objeto viene vacío ({}), la app usa los factores por defecto
-- (XS 0.95 · S 1 · M 1 · L 1.05 · XL 1.1 · XXL 1.2).
alter table public.garments
    add column if not exists size_factors jsonb not null default '{}'::jsonb;

comment on column public.garments.size_factors is
    'Multiplicador de consumo de materiales por talla (1 = talla base)';

-- Solo se acepta un objeto JSON (los valores se validan en la app: 0 < f <= 3)
alter table public.garments
    add constraint chk_garments_size_factors
    check (jsonb_typeof(size_factors) = 'object') not valid;

-- RLS: es una columna de garments; las políticas existentes de garments
-- (garments_tenant / garments_read_team) la cubren sin cambios.
