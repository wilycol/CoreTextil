-- Migración Fase 2: Perfil Completo del Operario
CREATE TABLE IF NOT EXISTS public.operator_profiles (
  id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone_whatsapp text,
  years_of_experience integer DEFAULT 0,
  specialties text[] DEFAULT '{}',
  machines text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.operator_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operarios pueden ver su propio perfil"
  ON public.operator_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Jefes de satélite pueden ver los perfiles de sus operarios"
  ON public.operator_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = operator_profiles.id 
      AND p.satellite_owner_id = auth.uid()
    )
  );

CREATE POLICY "Operarios pueden actualizar su propio perfil"
  ON public.operator_profiles FOR ALL
  USING (auth.uid() = id);

-- Trigger de Updated At (usando la función existente)
CREATE TRIGGER update_operator_profiles_modtime
BEFORE UPDATE ON public.operator_profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
