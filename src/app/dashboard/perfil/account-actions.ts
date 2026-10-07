"use server";

import { createClient } from "@/lib/supabase/server";

export async function exportUserData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: opProfile } = await supabase
    .from("operator_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const { data: costProfile } = await supabase
    .from("satellite_cost_profiles")
    .select("*")
    .eq("satellite_user_id", user.id)
    .maybeSingle();

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    account: {
      email: user.email,
      id: user.id,
    },
    profile,
    operatorProfile: opProfile || null,
    satelliteCostProfile: costProfile || null,
  };

  return { ok: true, data: exportPayload };
}

export async function resetUserRole(confirmationText: string) {
  if (confirmationText.trim() !== "CAMBIAR ROL") {
    return { ok: false, error: "Debes escribir exactamente 'CAMBIAR ROL' para confirmar." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Sesión expirada" };

  // Limpiar relaciones de rol y desvincular sin romper historial
  const { error } = await supabase
    .from("profiles")
    .update({
      role: "operator", // Se resetea temporalmente a operator para permitir el re-onboarding
      satellite_owner_id: null,
      tenant_id: null,
    })
    .eq("id", user.id);

  if (error) {
    console.error("Error al resetear rol:", error);
    return { ok: false, error: error.message };
  }

  return { ok: true, redirectTo: "/onboarding" };
}

export async function deleteUserAccount(
  confirmationText: string,
  exitReason: string,
  exitComments?: string
) {
  if (confirmationText.trim() !== "ELIMINAR MI CUENTA") {
    return { ok: false, error: "Debes escribir exactamente 'ELIMINAR MI CUENTA' para confirmar." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Sesión no válida" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, email")
    .eq("id", user.id)
    .single();

  // Guardar feedback de salida
  await supabase.from("exit_feedbacks").insert({
    user_email: user.email || profile?.email || "desconocido",
    previous_role: profile?.role || "desconocido",
    reason: exitReason || "Sin motivo especificado",
    comments: exitComments || null,
  });

  // Borrar perfil (en Postgres auth.users trigger se encarga o borramos profiles)
  const { error: deleteError } = await supabase
    .from("profiles")
    .delete()
    .eq("id", user.id);

  if (deleteError) {
    console.error("Error al eliminar perfil:", deleteError);
  }

  // Cerrar sesión
  await supabase.auth.signOut();

  return { ok: true };
}
