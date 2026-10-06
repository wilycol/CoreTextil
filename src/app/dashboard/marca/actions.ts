"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateTenantConfig(data: {
  name: string;
  nit_rut: string;
  admin_phone: string;
  admin_address: string;
  logo_url?: string | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.tenant_id) {
    return { ok: false, error: "No se encontró la organización o marca asociada." };
  }

  const payload: any = {
    name: data.name,
    nit_rut: data.nit_rut,
    admin_phone: data.admin_phone,
    admin_address: data.admin_address,
  };

  if (data.logo_url !== undefined) {
    payload.logo_url = data.logo_url;
  }

  const { error } = await supabase
    .from("tenants")
    .update(payload)
    .eq("id", profile.tenant_id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/marca");
  return { ok: true };
}
