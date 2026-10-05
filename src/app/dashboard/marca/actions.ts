"use server";

import { createClient } from "@/lib/supabase/server";

export async function updateTenantConfig(data: {
  name: string;
  nit_rut: string;
  admin_phone: string;
  admin_address: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "brand_admin" || !profile.tenant_id) {
    return { ok: false, error: "No tienes permisos para editar la marca." };
  }

  const { error } = await supabase
    .from("tenants")
    .update({
      name: data.name,
      nit_rut: data.nit_rut,
      admin_phone: data.admin_phone,
      admin_address: data.admin_address,
    })
    .eq("id", profile.tenant_id);

  if (error) return { ok: false, error: error.message };

  return { ok: true };
}
