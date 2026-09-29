"use server";

import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

export async function savePayroll(
  periodStart: string,
  periodEnd: string
): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };

  // FIX QA: formato ISO estricto, orden coherente y tope de rango (1 año)
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (!iso.test(periodStart ?? "") || !iso.test(periodEnd ?? "")) {
    return { ok: false, error: "Rango de fechas inválido." };
  }
  if (periodStart > periodEnd) {
    return { ok: false, error: "La fecha inicial no puede ser posterior a la final." };
  }
  const days =
    (new Date(periodEnd).getTime() - new Date(periodStart).getTime()) / 86_400_000;
  if (days > 366) {
    return { ok: false, error: "El periodo no puede superar un año." };
  }

  // Operarios del taller
  const { data: team } = await supabase
    .from("profiles")
    .select("id")
    .eq("satellite_owner_id", user.id);

  const teamIds = (team ?? []).map((t: any) => t.id);
  if (teamIds.length === 0) {
    return { ok: false, error: "No tienes operarios vinculados." };
  }

  // Logs del periodo de mi equipo (RLS: logs_read_team)
  const { data: logs, error: logsError } = await supabase
    .from("daily_production_logs")
    .select("operator_id, units_completed, earned_amount")
    .gte("logged_at", periodStart)
    .lte("logged_at", periodEnd);

  if (logsError) return { ok: false, error: logsError.message };

  const teamSet = new Set(teamIds);
  const perOperator = new Map<
    string,
    { name: string; units: number; total: number }
  >();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", teamIds);
  const nameById = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name]));

  for (const l of (logs ?? []) as any[]) {
    if (!teamSet.has(l.operator_id)) continue;
    const cur = perOperator.get(l.operator_id) ?? {
      name: nameById.get(l.operator_id) ?? "Operario",
      units: 0,
      total: 0,
    };
    perOperator.set(l.operator_id, {
      ...cur,
      units: cur.units + Number(l.units_completed),
      total: cur.total + Number(l.earned_amount),
    });
  }

  const breakdown = [...perOperator.entries()].map(([operatorId, v]) => ({
    operatorId,
    name: v.name,
    units: v.units,
    total: v.total,
  }));

  if (breakdown.length === 0) {
    return { ok: false, error: "No hay destajo registrado en ese periodo." };
  }

  const totalCop = breakdown.reduce((a, b) => a + b.total, 0);
  const totalUnits = breakdown.reduce((a, b) => a + b.units, 0);

  const { error: upsertError } = await supabase
    .from("payroll_runs")
    .upsert(
      {
        satellite_user_id: user.id,
        period_start: periodStart,
        period_end: periodEnd,
        total_cop: totalCop,
        total_units: totalUnits,
        operator_count: breakdown.length,
        breakdown,
      },
      { onConflict: "satellite_user_id,period_start,period_end" }
    );

  if (upsertError) return { ok: false, error: upsertError.message };
  return { ok: true };
}
