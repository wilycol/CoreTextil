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
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .insert({ name: "Mi marca" })
      .select("id")
      .single();

    if (tenantError || !tenant) {
      return { ok: false, error: "No se pudo crear la organización." };
    }

    const { error } = await supabase
      .from("profiles")
      .update({ role: "brand_admin", tenant_id: tenant.id })
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

  // Operario: se vincula al satélite de su jefe por email
  if (!satelliteOwnerEmail) {
    return { ok: false, error: "Escribe el email del jefe de tu taller." };
  }

  const { data: owner, error: ownerError } = await supabase
    .rpc("find_satellite_by_email", { target_email: satelliteOwnerEmail })
    .maybeSingle();

  if (ownerError || !owner) {
    return {
      ok: false,
      error:
        "No encontramos un taller satélite con ese email. Pide a tu jefe que entre a CoreTextil primero.",
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role: "operator", satellite_owner_id: (owner as any).id })
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
