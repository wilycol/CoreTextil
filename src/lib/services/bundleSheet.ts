// Servicio compartido: ficha resumida del atado ("qué coser") con los
// materiales recalculados a la talla y las unidades del atado.
// Lo usan la server action del escáner y la API GET /api/v1/bundles/[code]/sheet.

import { createClient } from "@/lib/supabase/server";
import { sanitizeSizeFactors, scaleBundleMaterials } from "@/lib/sizeFactors";

export type BundleSheet = {
  bundleId: string;
  bundleCode: string;
  orderId: string;
  garmentName: string;
  referenceCode: string;
  size: string;
  units: number;
  totalSamMinutes: number | null;
  destajoTotalCop: number;
  materialsCostCop: number;
  materialsCostForBundle: number;
  operations: {
    id: string;
    step_order: number;
    operation_name: string;
    machine_type: string;
    base_rate_cop: number;
    sam_minutes?: number | null;
    units_completed: number;
    prerequisite_operation_id?: string | null;
  }[];
  materials: {
    name: string;
    unit: string;
    quantity_per_garment: number;
    unit_cost_cop: number;
    quantity_for_bundle: number;
    cost_for_bundle: number;
  }[];
};

export async function getBundleSheetCore(
  bundleCode: string
): Promise<{ ok: true; sheet: BundleSheet } | { ok: false; error: string }> {
  const supabase = await createClient();

  const code = bundleCode.trim();
  if (!code) return { ok: false, error: "Código vacío." };

  const { data: bundle } = await supabase
    .from("order_bundles")
    .select(
      "id, order_id, size, units_count, production_orders(garment_id, garments(name, reference_code, total_sam_minutes, size_factors))"
    )
    .eq("bundle_code", code)
    .single();

  if (!bundle) return { ok: false, error: "Atado no encontrado." };

  const order: any = (bundle as any).production_orders;
  const garment: any = order?.garments;
  if (!garment) {
    return { ok: false, error: "La prenda del atado no está disponible." };
  }

  const [{ data: ops }, { data: mats }, { data: logs }] = await Promise.all([
    supabase
      .from("garment_operations")
      .select("id, step_order, operation_name, machine_type, base_rate_cop, sam_minutes, prerequisite_operation_id")
      .eq("garment_id", order.garment_id)
      .order("step_order"),
    supabase
      .from("garment_materials")
      .select("name, unit, quantity_per_garment, unit_cost_cop")
      .eq("garment_id", order.garment_id)
      .order("name"),
    supabase
      .from("daily_production_logs")
      .select("operation_id, units_completed")
      .eq("bundle_id", bundle.id),
  ]);

  const completedMap: Record<string, number> = {};
  for (const l of (logs ?? []) as any[]) {
    completedMap[l.operation_id] = (completedMap[l.operation_id] ?? 0) + Number(l.units_completed);
  }

  const operations = (ops ?? []).map((o: any) => ({
    id: o.id,
    step_order: o.step_order,
    operation_name: o.operation_name,
    machine_type: o.machine_type,
    base_rate_cop: Number(o.base_rate_cop),
    sam_minutes: o.sam_minutes ? Number(o.sam_minutes) : null,
    units_completed: completedMap[o.id] ?? 0,
    prerequisite_operation_id: o.prerequisite_operation_id ?? null,
  }));

  const materials = (mats ?? []).map((m: any) => ({
    name: m.name,
    unit: m.unit,
    quantity_per_garment: Number(m.quantity_per_garment),
    unit_cost_cop: Number(m.unit_cost_cop),
  }));

  const sizeFactors = sanitizeSizeFactors(garment.size_factors);
  const scaled = scaleBundleMaterials(
    materials,
    sizeFactors,
    String((bundle as any).size ?? ""),
    Number((bundle as any).units_count ?? 0)
  );

  return {
    ok: true,
    sheet: {
      bundleId: bundle.id,
      bundleCode: code,
      orderId: (bundle as any).order_id ?? "",
      garmentName: garment.name,
      referenceCode: garment.reference_code,
      size: String((bundle as any).size ?? ""),
      units: Number((bundle as any).units_count ?? 0),
      totalSamMinutes:
        garment.total_sam_minutes != null
          ? Number(garment.total_sam_minutes)
          : null,
      destajoTotalCop: operations.reduce(
        (a, o) => a + Number(o.base_rate_cop),
        0
      ),
      materialsCostCop: scaled.materialsCostCop,
      materialsCostForBundle: scaled.materialsCostForBundle,
      operations,
      materials: scaled.materials,
    },
  };
}
