"use server";

import { createClient } from "@/lib/supabase/server";

export async function unlinkSatellite(satelliteId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id) return { ok: false, error: "No tienes una organización válida." };

  const { error } = await supabase
    .from("satellite_links")
    .delete()
    .eq("tenant_id", profile.tenant_id)
    .eq("satellite_user_id", satelliteId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
