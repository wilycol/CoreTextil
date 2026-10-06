-- Migración: Identidad Visual (Logos & Avatares de Perfil)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.satellite_cost_profiles ADD COLUMN IF NOT EXISTS logo_url text;

-- Bucket público 'avatars' para almacenamiento de logos y fotos de perfil
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de seguridad RLS para el bucket de avatares
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Usuarios autenticados pueden subir avatares' AND tablename = 'objects'
    ) THEN
        CREATE POLICY "Usuarios autenticados pueden subir avatares" 
        ON storage.objects FOR INSERT 
        TO authenticated 
        WITH CHECK ( bucket_id = 'avatars' );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Cualquiera puede leer avatares' AND tablename = 'objects'
    ) THEN
        CREATE POLICY "Cualquiera puede leer avatares" 
        ON storage.objects FOR SELECT 
        TO public 
        USING ( bucket_id = 'avatars' );
    END IF;
END $$;
