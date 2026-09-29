-- ============================================================
-- CoreTextil SaaS · Parte 11: Storage Buckets e Imágenes Múltiples
-- ============================================================

-- 1. Crear el bucket público para las imágenes de prendas (garments)
insert into storage.buckets (id, name, public) 
values ('garments', 'garments', true)
on conflict (id) do nothing;

-- 2. Políticas de Seguridad (RLS) para el Storage
-- Permitir a los usuarios autenticados subir imágenes al bucket 'garments'
create policy "Usuarios autenticados pueden subir imagenes" 
on storage.objects for insert 
to authenticated 
with check ( bucket_id = 'garments' );

-- Permitir a todo el mundo (o usuarios de la app) leer las imágenes
create policy "Cualquiera puede leer imagenes de garments" 
on storage.objects for select 
to public 
using ( bucket_id = 'garments' );

-- 3. Modificar la tabla prendas (garments) para soportar hasta 5+ imágenes
-- Ya teníamos front_image_url y ai_exploded_image_url. 
-- Agregamos un arreglo para las vistas extra (espalda, internas, accesorios).
alter table public.garments 
add column if not exists additional_images text[] default array[]::text[];
