"use server";

import { createClient } from "@/lib/supabase/server";

export async function saveSatelliteRates(rates: { operation_id: string; satellite_rate_cop: number }[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autorizado." };

  // Upsert the rates for this satellite user
  const upsertData = rates.map((r) => ({
    satellite_user_id: user.id,
    operation_id: r.operation_id,
    satellite_rate_cop: r.satellite_rate_cop,
  }));

  const { error } = await supabase
    .from("satellite_operation_rates")
    .upsert(upsertData, { onConflict: "satellite_user_id, operation_id" });

  if (error) return { ok: false, error: error.message };

  return { ok: true };
}
