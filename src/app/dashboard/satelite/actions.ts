"use server";

import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

export async function saveCostProfile(input: {
  rent_monthly: number;
  energy_monthly: number;
  consumables_monthly: number;
  maintenance_monthly: number;
  estimated_monthly_units: number;
}): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };

  const { error } = await supabase
    .from("satellite_cost_profiles")
    .upsert(
      { satellite_user_id: user.id, ...input },
      { onConflict: "satellite_user_id" }
    );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
