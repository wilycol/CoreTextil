import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import NominaClient, { type NominaData } from "./NominaClient";

export default async function NominaPage() {
  const { profile } = await getSession();
  if (profile.role !== "satellite_owner") redirect("/dashboard");

  const supabase = await createClient();

  // Operarios de mi taller
  const { data: team } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("satellite_owner_id", profile.id);

  const teamRows = (team ?? []) as { id: string; full_name: string }[];

  // Destajo acumulado del periodo en curso (desde el lunes de esta semana)
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const mondayIso = monday.toISOString().slice(0, 10);

  // Destajo del equipo (FIX QA: ventana amplia para que cualquier periodo
  // custom del cliente se pueda calcular; el cliente filtra por rango)
  const yearAgo = new Date(today);
  yearAgo.setFullYear(today.getFullYear() - 1);
  const { data: logs } = await supabase
    .from("daily_production_logs")
    .select("operator_id, units_completed, earned_amount, logged_at")
    .gte("logged_at", yearAgo.toISOString().slice(0, 10));

  // Historial reciente de liquidaciones guardadas
  const { data: history } = await supabase
    .from("payroll_runs")
    .select("*")
    .order("period_start", { ascending: false })
    .limit(6);

  const data: NominaData = {
    team: teamRows,
    entries: (logs ?? [] as any[]).map((l) => ({
      operatorId: l.operator_id,
      units: Number(l.units_completed),
      earned: Number(l.earned_amount),
      loggedAt: String(l.logged_at),
    })),
    history: (history ?? [] as any[]).map((h) => ({
      periodStart: h.period_start,
      periodEnd: h.period_end,
      total: Number(h.total_cop),
      units: h.total_units,
      operatorCount: h.operator_count,
    })),
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">Liquidación de nómina</h1>
      <p className="mt-1 text-slate-400">
        El destajo de tus operarios, liquidado a un clic. Elige el periodo,
        revisa el desglose y guarda la liquidación como comprobante.
      </p>
      <div className="mt-8">
        <NominaDataOrEmpty data={data} />
      </div>
    </div>
  );
}

function NominaDataOrEmpty({ data }: { data: NominaData }) {
  if (data.team.length === 0) {
    return (
      <p className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-slate-300">
        Aún no tienes operarios vinculados. Ellos entran con Google y se
        vinculan a tu taller escribiendo tu email ({""}
        <span className="text-cyan-300">onboarding → Soy operario</span>).
      </p>
    );
  }
  return <NominaClient data={data} />;
}
