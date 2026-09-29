// Servicio compartido: marcación de producción con tope de atado
// (server action operario + endpoint API /api/v1/production/log-units).

import { createClient } from "@/lib/supabase/server";

export type LogUnitsResult =
  | {
      ok: true;
      earned: number;
      operation: string;
      bundleCode: string;
    }
  | { ok: false; error: string };

export async function logUnitsCore(
  input: {
    bundleId?: string;
    bundleCode?: string;
    operationId: string;
    units: number;
  },
  user: { id: string; role: string; satellite_owner_id: string | null }
): Promise<LogUnitsResult> {
  const supabase = await createClient();

  const safeUnits = Math.floor(Number(input.units));
  if (!Number.isFinite(safeUnits) || safeUnits <= 0 || safeUnits > 10_000) {
    return { ok: false, error: "Cantidad inválida." };
  }

  // Resuelve el atado por id o por código (la API acepta código del QR)
  let bundle: any = null;
  if (input.bundleId) {
    const { data } = await supabase
      .from("order_bundles")
      .select("id, order_id, bundle_code, size, units_count, production_orders!inner(satellite_user_id, garment_id)")
      .eq("id", input.bundleId)
      .single();
    bundle = data;
  } else if (input.bundleCode) {
    const { data } = await supabase
      .from("order_bundles")
      .select("id, order_id, bundle_code, size, units_count, production_orders!inner(satellite_user_id, garment_id)")
      .eq("bundle_code", input.bundleCode.trim())
      .single();
    bundle = data;
  } else {
    return { ok: false, error: "Indica bundleId o bundleCode." };
  }

  if (!bundle) return { ok: false, error: "Atado no encontrado." };

  // El atado debe pertenecer a mi taller
  const satelliteId =
    user.role === "operator" ? user.satellite_owner_id : user.id;
  if (
    !satelliteId ||
    (bundle as any).production_orders?.satellite_user_id !== satelliteId
  ) {
    return { ok: false, error: "Ese atado no pertenece a tu taller." };
  }

  const { data: op } = await supabase
    .from("garment_operations")
    .select("garment_id, operation_name, base_rate_cop")
    .eq("id", input.operationId)
    .single();

  if (!op) return { ok: false, error: "Operación no encontrada." };

  // La operación debe pertenecer a la prenda del atado
  if ((op as any).garment_id !== (bundle as any).production_orders?.garment_id) {
    return { ok: false, error: "Esa operación no pertenece a la prenda del atado." };
  }

  // Orden para tenant_id del log
  const { data: orderRow } = await supabase
    .from("production_orders")
    .select("id, tenant_id")
    .eq("id", (bundle as any).order_id)
    .single();
  if (!orderRow) return { ok: false, error: "Orden no encontrada." };

  const earned = Math.round(Number((op as any).base_rate_cop) * safeUnits);

  const { error: insertError } = await supabase
    .from("daily_production_logs")
    .insert({
      tenant_id: (orderRow as any).tenant_id,
      order_id: (bundle as any).order_id,
      bundle_id: (bundle as any).id,
      operation_id: input.operationId,
      operator_id: user.id,
      units_completed: safeUnits,
      earned_amount: earned,
    });

  if (insertError) {
    // El trigger enforce_bundle_cap (con FOR UPDATE) rechaza el exceso
    return { ok: false, error: insertError.message };
  }

  return {
    ok: true,
    earned,
    operation: (op as any).operation_name,
    bundleCode: (bundle as any).bundle_code,
  };
}
