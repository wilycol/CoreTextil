import { getApiUser, ok, fail } from "@/lib/api/http";
import { createClient } from "@/lib/supabase/server";
import { fixedUnitCost, profitabilityLight } from "@/lib/costing";
import type { OpLite } from "@/app/dashboard/satelite/simulador/page";

export const dynamic = "force-dynamic";

// POST /api/v1/satellite/calculate-yield
// Desglose de costos fijos (CFI), destajo por máquina y semáforo de rentabilidad.
// Body: { orderId } o { unitPrice, garmentId }
export async function POST(request: Request) {
  const profile = await getApiUser();
  if (!profile) return fail("Sesión expirada.", 401);
  if (profile.role !== "satellite_owner" && profile.role !== "operator") {
    return fail("Solo talleres satélite calculan rentabilidad.", 403);
  }

  const satelliteId =
    profile.role === "operator" ? profile.satellite_owner_id : profile.id;

  let unitPrice: number | null = null;
  let garmentId: string | null = null;

  try {
    const body = await request.json();
    if (body?.orderId) {
      const supabase = await createClient();
      const { data: order } = await supabase
        .from("production_orders")
        .select("unit_price_agreed, garment_id")
        .eq("id", String(body.orderId))
        .single();
      if (!order) return fail("Orden no encontrada.", 404);
      unitPrice = Number(order.unit_price_agreed);
      garmentId = (order as any).garment_id;
    } else if (body?.unitPrice && body?.garmentId) {
      unitPrice = Number(body.unitPrice);
      garmentId = String(body.garmentId);
    }
  } catch {
    return fail("Cuerpo de la petición inválido.");
  }

  if (!unitPrice || !garmentId) {
    return fail("Envía orderId, o unitPrice + garmentId.");
  }

  const supabase = await createClient();

  // Costos fijos del taller (RLS: solo los suyos)
  const { data: costProfile } = await supabase
    .from("satellite_cost_profiles")
    .select("*")
    .eq("satellite_user_id", satelliteId)
    .maybeSingle();

  const cfi = costProfile ? fixedUnitCost(costProfile as any) : null;

  const { data: ops } = await supabase
    .from("garment_operations")
    .select("operation_name, machine_type, base_rate_cop")
    .eq("garment_id", garmentId)
    .order("step_order");

  const operations = (ops ?? []) as OpLite[];
  const pool = operations.reduce((a, o) => a + Number(o.base_rate_cop), 0);

  const byMachine: Record<string, number> = {};
  for (const o of operations) {
    byMachine[o.machine_type] =
      (byMachine[o.machine_type] ?? 0) + Number(o.base_rate_cop);
  }

  // Sin costos fijos registrados no hay simulación (mismo criterio que la UI)
  if (cfi === null) {
    return ok({
      hasCostProfile: false,
      cfi: null,
      workerPoolCop: pool,
      byMachine,
      operations,
      unitPriceCop: unitPrice,
      netPerUnitCop: null,
      netMarginPct: null,
      light: null,
      note: "Registra tus costos fijos en /dashboard/satelite para simular.",
    });
  }

  const net = unitPrice - cfi - pool;
  const marginPct = unitPrice > 0 ? (net / unitPrice) * 100 : 0;

  return ok({
    hasCostProfile: true,
    cfi: Math.round(cfi),
    workerPoolCop: pool,
    byMachine,
    operations,
    unitPriceCop: unitPrice,
    netPerUnitCop: Math.round(net),
    netMarginPct: Number(marginPct.toFixed(1)),
    light: profitabilityLight(marginPct),
  });
}
