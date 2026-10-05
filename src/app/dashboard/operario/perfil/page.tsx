import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProfileClient from "./ProfileClient";

export default async function OperarioPerfilPage() {
  const { profile } = await getSession();
  const supabase = await createClient();

  if (profile.role !== "operator") {
    redirect("/dashboard");
  }

  // Fetch the existing operator profile if it exists
  const { data: opProfile } = await supabase
    .from("operator_profiles")
    .select("*")
    .eq("id", profile.id)
    .single();

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-100">Mi Perfil Técnico</h1>
        <p className="mt-1 text-slate-400">
          Completa tu hoja de vida textil. Esto te permitirá acceder a mejores oportunidades y optimizar tu rendimiento en el taller.
        </p>
      </div>

      <ProfileClient initialData={opProfile} />
    </div>
  );
}
