// Servicio compartido: liquidación de órdenes (server action + API).
// Entregadas = atados cuya ruta completa alcanzó 100% (mismo criterio en UI y API).

import { createClient } from "@/lib/supabase/server";

export type LiquidateResult =
  | { ok: true; totalCop: number; units: number }
  | { ok: false; error: string };

export async function computeDeliveredUnits(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orderId: string,
  garmentId: string
): Promise<number> {
  const [{ data: bundles }, { data: ops }, { data: logs }] = await Promise.all([
    supabase
      .from("order_bundles")
      .select("id, units_count")
      .eq("order_id", orderId),
    supabase.from("garment_operations").select("id").eq("garment_id", garmentId),
    supabase
      .from("daily_production_logs")
      .select("bundle_id, operation_id, units_completed")
      .eq("order_id", orderId),
  ]);

  const totalOps = ops?.length ?? 0;
  if (totalOps === 0) return 0;

  const acc: Record<string, Record<string, number>> = {};
  for (const l of (logs ?? []) as any[]) {
    acc[l.bundle_id] ??= {};
    acc[l.bundle_id][l.operation_id] =
      (acc[l.bundle_id][l.operation_id] ?? 0) + Number(l.units_completed);
  }

  let delivered = 0;
  for (const b of (bundles ?? []) as any[]) {
    const perOp = acc[b.id] ?? {};
    const opsDone = Object.values(perOp).filter(
      (u) => u >= Number(b.units_count)
    ).length;
    if (opsDone >= totalOps) delivered += Number(b.units_count);
  }
  return delivered;
}

export async function liquidateOrderCore(
  orderId: string,
  user: { id: string; tenant_id: string | null }
): Promise<LiquidateResult> {
  const supabase = await createClient();

  if (!user.tenant_id) {
    return { ok: false, error: "Solo las marcas liquidan órdenes." };
  }

  const { data: order } = await supabase
    .from("production_orders")
    .select(
      "id, tenant_id, garment_id, unit_price_agreed, total_units, status, satellite_user_id"
    )
    .eq("id", orderId)
    .single();

  if (!order) return { ok: false, error: "Orden no encontrada." };
  if ((order as any).tenant_id !== user.tenant_id) {
    return { ok: false, error: "Esa orden no es de tu marca." };
  }

  // Ya liquidada (unique por orden)
  const { data: existing } = await supabase
    .from("order_liquidations")
    .select("id, total_cop")
    .eq("order_id", orderId)
    .maybeSingle();
  if (existing) {
    return {
      ok: false,
      error: `Esta orden ya fue liquidada por ${existing.total_cop} COP.`,
    };
  }

  const delivered = await computeDeliveredUnits(
    supabase,
    orderId,
    (order as any).garment_id
  );
  if (delivered <= 0) {
    return { ok: false, error: "Aún no hay piezas entregadas que liquidar." };
  }

  const unitPrice = Number((order as any).unit_price_agreed);
  const totalCop = Math.round(delivered * unitPrice);

  // Snapshot del nombre del satélite (los reportes sobreviven a desvinculaciones)
  let satelliteName: string | null = null;
  const satId = (order as any).satellite_user_id;
  if (satId) {
    const { data: nameData } = await supabase
      .rpc("profile_display_name", { p_profile_id: satId })
      .maybeSingle();
    satelliteName =
      typeof nameData === "string" ? nameData : ((nameData as any)?.full_name ?? null);
  }

  const { error: insertError } = await supabase
    .from("order_liquidations")
    .insert({
      order_id: orderId,
      tenant_id: user.tenant_id,
      satellite_user_id: satId,
      satellite_name: satelliteName,
      units_delivered: delivered,
      unit_price_cop: unitPrice,
      total_cop: totalCop,
      created_by: user.id,
    });

  if (insertError) return { ok: false, error: insertError.message };

  // El lote quedó saldado: marca la orden como completada
  await supabase
    .from("production_orders")
    .update({ status: "completed" })
    .eq("id", orderId);

  return { ok: true, totalCop, units: delivered };
}
