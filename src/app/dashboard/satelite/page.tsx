import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import CostForm from "./CostForm";

export default async function SatellitePage() {
  const { profile } = await getSession();
  if (profile.role !== "satellite_owner") redirect("/dashboard");

  const supabase = await createClient();
  const { data: costProfile } = await supabase
    .from("satellite_cost_profiles")
    .select("*")
    .eq("satellite_user_id", profile.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">Mi taller satélite</h1>
      <p className="mt-1 text-slate-400">
        Registra tus costos fijos mensuales. Con esto calculamos tu costo fijo
        unitario (CFI) y el semáforo de rentabilidad antes de aceptar un corte.
      </p>
      <div className="mt-8">
        <CostForm initial={costProfile ?? null} />
      </div>
    </div>
  );
}
