"use server";

import { createClient } from "@/lib/supabase/server";

export async function updateOperatorProfile(data: {
  phone_whatsapp: string;
  years_of_experience: number;
  specialties: string[];
  machines: string[];
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada" };

  const { error } = await supabase
    .from("operator_profiles")
    .upsert({
      id: user.id,
      phone_whatsapp: data.phone_whatsapp,
      years_of_experience: data.years_of_experience,
      specialties: data.specialties,
      machines: data.machines,
    });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
