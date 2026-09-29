"use server";

import { createClient } from "@/lib/supabase/server";

export async function createInviteLink() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile) throw new Error("Perfil no encontrado");

  let target_role = "";
  if (profile.role === "brand_admin" || profile.role === "designer" || profile.role === "cutter") {
    target_role = "satellite";
  } else if (profile.role === "satellite_owner") {
    target_role = "operator";
  } else {
    throw new Error("Tu rol no permite generar invitaciones.");
  }

  const { data: invite, error } = await supabase
    .from("invitations")
    .insert({
      inviter_id: user.id,
      brand_tenant_id: profile.tenant_id,
      target_role,
    })
    .select("token")
    .single();

  if (error || !invite) throw new Error(error?.message || "Error al crear la invitación");
  
  return invite.token;
}

export async function acceptInviteAction(token: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_invitation", { invite_token: token });
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
