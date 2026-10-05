-- Fix infinite recursion on profiles table

-- 1. Create a security definer function that bypasses RLS to check roles
CREATE OR REPLACE FUNCTION public.is_satellite_owner(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM profiles WHERE id = uid AND role = 'satellite_owner'
  );
$$;

-- 2. Drop the recursive policy from 0021
DROP POLICY IF EXISTS "Jefes de satélite pueden ver profiles de operarios libres" ON public.profiles;

-- 3. Recreate it using the new function
CREATE POLICY "Jefes de satélite pueden ver profiles de operarios libres"
  ON public.profiles FOR SELECT
  USING (
    public.is_satellite_owner(auth.uid())
    AND
    role = 'operator'
    AND satellite_owner_id IS NULL
  );

-- 4. Fix the operator_profiles policy
DROP POLICY IF EXISTS "Jefes de satélite pueden ver operarios libres" ON public.operator_profiles;

CREATE POLICY "Jefes de satélite pueden ver operarios libres"
  ON public.operator_profiles FOR SELECT
  USING (
    public.is_satellite_owner(auth.uid())
    AND
    EXISTS (
      SELECT 1 FROM public.profiles op
      WHERE op.id = operator_profiles.id 
      AND op.role = 'operator'
      AND op.satellite_owner_id IS NULL
    )
  );
