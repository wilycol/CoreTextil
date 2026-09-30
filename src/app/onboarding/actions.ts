"use server";

import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

export async function completeOnboarding(
  role: "brand_admin" | "satellite_owner" | "operator",
  satelliteOwnerEmail?: string
): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada. Vuelve a entrar." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, role")
    .eq("id", user.id)
    .single();

  // Ya está onboardedo (marca con tenant o satélite con rol asignado)
  if (profile?.role === "brand_admin" || profile?.role === "satellite_owner") {
    return { ok: true };
  }

  if (role === "brand_admin") {
    // Generamos el ID aquí para evitar el error de RLS al hacer .select()
    const tenantId = crypto.randomUUID();
    
    const { error: tenantError } = await supabase
      .from("tenants")
      .insert({ id: tenantId, name: "Mi marca" });

    if (tenantError) {
      console.error(tenantError);
      return { ok: false, error: "No se pudo crear la organización: " + tenantError.message };
    }

    const { error } = await supabase
      .from("profiles")
      .update({ role: "brand_admin", tenant_id: tenantId })
      .eq("id", user.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  if (role === "satellite_owner") {
    const { error } = await supabase
      .from("profiles")
      .update({ role: "satellite_owner" })
      .eq("id", user.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  if (role === "operator") {
    const { error } = await supabase
      .from("profiles")
      .update({ role: "operator", satellite_owner_id: null })
      .eq("id", user.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  return { ok: false, error: "Rol no válido" };
}
