"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateOperatorProfile(data: {
  phone_whatsapp: string;
  years_of_experience: number;
  specialties: string[];
  machines: string[];
  avatar_url?: string | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada" };

  // Update operator profile details
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

  // If avatar_url is provided, update profiles table as well
  if (data.avatar_url !== undefined) {
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({ avatar_url: data.avatar_url })
      .eq("id", user.id);

    if (profileErr) return { ok: false, error: profileErr.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/operario/perfil");
  revalidatePath("/dashboard/talento");
  return { ok: true };
}
