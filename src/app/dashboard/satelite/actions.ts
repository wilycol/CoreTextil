"use server";

import { createClient } from "@/lib/supabase/server";

export async function updateTallerConfig(data: {
  commercial_name: string;
  max_operators: number;
  available_machines: string[];
  rent_monthly: number;
  energy_monthly: number;
  consumables_monthly: number;
  maintenance_monthly: number;
  estimated_monthly_units: number;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada" };

  // Check if cost profile exists
  const { data: existingProfile } = await supabase
    .from("satellite_cost_profiles")
    .select("id")
    .eq("satellite_user_id", user.id)
    .single();

  if (existingProfile) {
    const { error } = await supabase
      .from("satellite_cost_profiles")
      .update({
        commercial_name: data.commercial_name,
        max_operators: data.max_operators,
        available_machines: data.available_machines,
        rent_monthly: data.rent_monthly,
        energy_monthly: data.energy_monthly,
        consumables_monthly: data.consumables_monthly,
        maintenance_monthly: data.maintenance_monthly,
        estimated_monthly_units: data.estimated_monthly_units,
      })
      .eq("satellite_user_id", user.id);

    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("satellite_cost_profiles")
      .insert({
        satellite_user_id: user.id,
        commercial_name: data.commercial_name,
        max_operators: data.max_operators,
        available_machines: data.available_machines,
        rent_monthly: data.rent_monthly,
        energy_monthly: data.energy_monthly,
        consumables_monthly: data.consumables_monthly,
        maintenance_monthly: data.maintenance_monthly,
        estimated_monthly_units: data.estimated_monthly_units,
      });

    if (error) return { ok: false, error: error.message };
  }

  return { ok: true };
}
