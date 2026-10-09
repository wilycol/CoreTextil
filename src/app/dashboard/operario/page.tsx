import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import LogClient, { type MarkingData, type LogRow, type ChangeRequestRow } from "./LogClient";

export default async function OperatorLogPage({
  searchParams,
}: {
  searchParams: Promise<{ bundle?: string }>;
}) {
  const { profile } = await getSession();
  const supabase = await createClient();
  const { bundle: bundleParam } = await searchParams;

  // Superadmin tiene vista omnipresente: ve el cuaderno como si fuera jefe de taller
  const isSuperAdmin = profile.role === "superadmin";

  if (profile.role !== "operator" && profile.role !== "satellite_owner" && !isSuperAdmin) {
    return (
      <p className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-slate-300">
        La marcación es para operarios y jefes de taller.
      </p>
    );
  }

  // Órdenes: operario → las de mi jefe; superadmin → supervisa todas las órdenes
  const satelliteId =
    profile.role === "operator"
      ? profile.satellite_owner_id
      : isSuperAdmin
        ? null // sin filtro por satélite (RLS de superadmin las permite)
        : profile.id;

  let ordersQuery = supabase
    .from("production_orders")
    .select("id, order_number, garment_id, unit_price_agreed, garments(name)")
    .order("created_at", { ascending: false });
  if (satelliteId !== null) ordersQuery = ordersQuery.eq("satellite_user_id", satelliteId);

  const { data: orders } = await ordersQuery.limit(50);

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

  // Fetch team if the user is a satellite owner (superadmin: todo el equipo)
  let operators: { id: string; full_name: string }[] = [];
  if (profile.role === "satellite_owner" || isSuperAdmin) {
    const { data: team } = isSuperAdmin
      ? await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("role", "operator")
          .not("satellite_owner_id", "is", null)
          .limit(200)
      : await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("satellite_owner_id", profile.id)
          .eq("role", "operator");
    operators = (team ?? []) as any[];
  }

  // ============================================================
  // Cuaderno Digital: historial de anotaciones y solicitudes de cambio
  // ============================================================
  // Últimos 200 logs de producción del taller (propios, o del equipo si es jefe)
  const logsQuery = supabase
    .from("daily_production_logs")
    .select(
      "id, logged_at, units_completed, earned_amount, bundle_id, operation_id, operator_id, " +
        "order_bundles(bundle_code, size, color), " +
        "garment_operations(operation_name, machine_type, base_rate_cop)"
    )
    .order("logged_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  const { data: rawLogs } =
    profile.role === "operator"
      ? await logsQuery.eq("operator_id", profile.id)
      : isSuperAdmin
        ? await logsQuery
        : orderIds.length
          ? await logsQuery.in("order_id", orderIds)
          : { data: [] };

  // Nombres de operarios del equipo (para mostrar quién anotó)
  const operatorNameMap = new Map<string, string>();
  operatorNameMap.set(profile.id, profile.full_name);
  for (const t of operators) operatorNameMap.set(t.id, t.full_name);

  const logRows: LogRow[] = ((rawLogs ?? []) as any[]).map((l) => ({
    id: l.id,
    loggedAt: l.logged_at,
    units: Number(l.units_completed),
    earned: Number(l.earned_amount),
    bundleCode: l.order_bundles?.bundle_code ?? null,
    size: l.order_bundles?.size ?? null,
    color: l.order_bundles?.color ?? null,
    operationName: l.garment_operations?.operation_name ?? null,
    machine: l.garment_operations?.machine_type ?? null,
    rate: l.garment_operations ? Number(l.garment_operations.base_rate_cop) : null,
    operatorId: l.operator_id,
    operatorName: operatorNameMap.get(l.operator_id) ?? null,
    isMine: l.operator_id === profile.id,
  }));

  // Solicitudes de cambio: las mías (operario) o las de mi equipo (dueño)
  let pendingRequests: ChangeRequestRow[] = [];
  let recentRequests: ChangeRequestRow[] = [];

  const reqSelect =
    "id, log_id, requested_by, change_type, new_units, reason, status, decided_at, created_at";

  if (profile.role === "satellite_owner" || isSuperAdmin) {
    let reqsQuery = supabase
      .from("logbook_change_requests")
      .select(reqSelect + ", daily_production_logs(bundle_code)")
      .order("created_at", { ascending: false })
      .limit(50);
    if (!isSuperAdmin) reqsQuery = reqsQuery.eq("approver_id", profile.id);
    const { data: reqs } = await reqsQuery;
    const reqRows = ((reqs ?? []) as any[]).map((r) => ({
      id: r.id,
      logId: r.log_id,
      changeType: r.change_type,
      newUnits: Number(r.new_units),
      reason: r.reason,
      status: r.status,
      createdAt: r.created_at,
      requestedByName: operatorNameMap.get(r.requested_by) ?? "Operario",
      bundleCode: r.daily_production_logs?.bundle_code ?? null,
      currentUnits: null as number | null,
    }));
    pendingRequests = reqRows.filter((r) => r.status === "pending");
    recentRequests = reqRows.filter((r) => r.status !== "pending");
  } else if (profile.role === "operator") {
    const { data: reqs } = await supabase
      .from("logbook_change_requests")
      .select(reqSelect)
      .eq("requested_by", profile.id)
      .order("created_at", { ascending: false })
      .limit(50);
    const reqRows = ((reqs ?? []) as any[]).map((r) => ({
      id: r.id,
      logId: r.log_id,
      changeType: r.change_type,
      newUnits: Number(r.new_units),
      reason: r.reason,
      status: r.status,
      createdAt: r.created_at,
      requestedByName: profile.full_name,
      bundleCode: null,
      currentUnits: logRows.find((l) => l.id === r.log_id)?.units ?? null,
    }));
    pendingRequests = reqRows.filter((r) => r.status === "pending");
    recentRequests = reqRows.filter((r) => r.status !== "pending");
  }

  const data: MarkingData = {
    role: isSuperAdmin ? "satellite_owner" : profile.role,
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
    isAffiliated: !!satelliteId || isSuperAdmin,
    logbookLogs: logRows,
    pendingRequests,
    recentRequests,
  };

  return (
    <LogClient
      data={data}
      preselectedCode={bundleParam ?? null}
      manualKeySuffix={profile.id}
    />
  );
}
