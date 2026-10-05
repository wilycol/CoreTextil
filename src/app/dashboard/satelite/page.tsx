import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TallerClient from "./TallerClient";
import Link from "next/link";

export default async function MiTallerPage() {
  const { profile } = await getSession();
  const supabase = await createClient();

  if (profile.role !== "satellite_owner") {
    redirect("/dashboard");
  }

  const { data: costProfile } = await supabase
    .from("satellite_cost_profiles")
    .select("*")
    .eq("satellite_user_id", profile.id)
    .single();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Configuración "Mi Taller"</h1>
          <p className="mt-1 text-slate-400">
            Formaliza tu organización. Define tu capacidad instalada y costos fijos.
          </p>
        </div>
        <Link
          href="/dashboard/satelite/simulador"
          className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-500"
        >
          Simulador de Rentabilidad
        </Link>
      </div>

      <TallerClient initialData={costProfile} />
    </div>
  );
}
