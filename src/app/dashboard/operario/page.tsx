import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import LogClient, { type MarkingData } from "./LogClient";

export default async function OperatorLogPage({
  searchParams,
}: {
  searchParams: Promise<{ bundle?: string }>;
}) {
  const { profile } = await getSession();
  const supabase = await createClient();
  const { bundle: bundleParam } = await searchParams;

  if (profile.role !== "operator" && profile.role !== "satellite_owner") {
    return (
      <p className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-slate-300">
        La marcación es para operarios y jefes de taller.
      </p>
    );
  }

  // Órdenes de mi satélite (operario: la de mi jefe; jefe: las mías)
  const satelliteId =
    profile.role === "operator" ? profile.satellite_owner_id : profile.id;

  const { data: orders } = await supabase
    .from("production_orders")
    .select("id, order_number, garment_id, unit_price_agreed, garments(name)")
    .eq("satellite_user_id", satelliteId)
    .order("created_at", { ascending: false });

  const orderRows = (orders ?? []) as any[];
  const orderIds = orderRows.map((o) => o.id);
  const garmentIds = [...new Set(orderRows.map((o) => o.garment_id))];

  const { data: bundles } = orderIds.length
    ? await supabase.from("order_bundles").select("*").in("order_id", orderIds)
    : { data: [] };

  const { data: ops } = garmentIds.length
    ? await supabase
        .from("garment_operations")
        .select("*")
        .in("garment_id", garmentIds)
        .order("step_order")
    : { data: [] };

  const { data: todayLogs } = await supabase
    .from("daily_production_logs")
    .select("bundle_id, operation_id, units_completed, earned_amount")
    .eq("operator_id", profile.id)
    .eq("logged_at", new Date().toISOString().slice(0, 10));

  // Avance por (atado, operación) — de todo el equipo, para el tope real
  const { data: allToday } = orderIds.length
    ? await supabase
        .from("daily_production_logs")
        .select("bundle_id, operation_id, units_completed")
        .in("order_id", orderIds)
    : { data: [] };

  const done: Record<string, number> = {};
  for (const l of (allToday ?? []) as any[]) {
    const key = `${l.bundle_id}:${l.operation_id}`;
    done[key] = (done[key] ?? 0) + Number(l.units_completed);
  }

  const walletToday = (todayLogs ?? [] as any[]).reduce(
    (acc, l) => acc + Number(l.earned_amount),
    0
  );
  const piecesToday = (todayLogs ?? [] as any[]).reduce(
    (acc, l) => acc + Number(l.units_completed),
    0
  );

  // Fetch team if the user is a satellite owner
  let operators: { id: string; full_name: string }[] = [];
  if (profile.role === "satellite_owner") {
    const { data: team } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("satellite_owner_id", profile.id)
      .eq("role", "operator");
    operators = (team ?? []) as any[];
  }

  const data: MarkingData = {
    role: profile.role,
    walletToday,
    piecesToday,
    orders: orderRows.map((o) => ({
      id: o.id,
      label: `${o.order_number} · ${(o.garments as any)?.name ?? ""}`,
      garmentId: o.garment_id,
    })),
    bundles: (bundles ?? [] as any[]).map((b) => ({
      id: b.id,
      orderId: b.order_id,
      code: b.bundle_code,
      size: b.size,
      color: b.color,
      units: b.units_count,
    })),
    operations: (ops ?? [] as any[]).map((o) => ({
      id: o.id,
      garmentId: o.garment_id,
      name: o.operation_name,
      machine: o.machine_type,
      rate: Number(o.base_rate_cop),
    })),
    done,
    operators,
  };

  return <LogClient data={data} preselectedCode={bundleParam ?? null} />;
}
