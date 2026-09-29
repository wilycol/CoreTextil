// Servicio compartido: ficha resumida del atado ("qué coser") con los
// materiales recalculados a la talla y las unidades del atado.
// Lo usan la server action del escáner y la API GET /api/v1/bundles/[code]/sheet.

import { createClient } from "@/lib/supabase/server";
import { sanitizeSizeFactors, scaleBundleMaterials } from "@/lib/sizeFactors";

export type BundleSheet = {
  garmentName: string;
  referenceCode: string;
  size: string;
  units: number;
  totalSamMinutes: number | null;
  destajoTotalCop: number;
  materialsCostCop: number;
  materialsCostForBundle: number;
  operations: {
    step_order: number;
    operation_name: string;
    machine_type: string;
    base_rate_cop: number;
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
      "id, size, units_count, production_orders(garment_id, garments(name, reference_code, total_sam_minutes, size_factors))"
    )
    .eq("bundle_code", code)
    .single();

  if (!bundle) return { ok: false, error: "Atado no encontrado." };

  const order: any = (bundle as any).production_orders;
  const garment: any = order?.garments;
  if (!garment) {
    return { ok: false, error: "La prenda del atado no está disponible." };
  }

  const [{ data: ops }, { data: mats }] = await Promise.all([
    supabase
      .from("garment_operations")
      .select("step_order, operation_name, machine_type, base_rate_cop")
      .eq("garment_id", order.garment_id)
      .order("step_order"),
    supabase
      .from("garment_materials")
      .select("name, unit, quantity_per_garment, unit_cost_cop")
      .eq("garment_id", order.garment_id)
      .order("name"),
  ]);

  const operations = (ops ?? []) as BundleSheet["operations"];
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
