"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sanitizeSizeFactors } from "@/lib/sizeFactors";

type Result = { ok: true } | { ok: false; error: string };

export async function addMaterial(
  garmentId: string,
  input: {
    name: string;
    unit: string;
    quantity_per_garment: number;
    unit_cost_cop: number;
  }
): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };

  // La prenda debe ser del tenant de la marca
  const { data: garment } = await supabase
    .from("garments")
    .select("id, tenant_id")
    .eq("id", garmentId)
    .single();

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!garment) return { ok: false, error: "Prenda no encontrada." };
  if ((garment as any).tenant_id !== (profile as any)?.tenant_id) {
    return { ok: false, error: "Esa prenda no es de tu marca." };
  }

  if (!input.name.trim() || input.quantity_per_garment <= 0 || input.unit_cost_cop < 0) {
    return { ok: false, error: "Datos del material inválidos." };
  }

  const { error } = await supabase.from("garment_materials").insert({
    garment_id: garmentId,
    name: input.name.trim().slice(0, 120),
    unit: input.unit.trim().slice(0, 20) || "unidad",
    quantity_per_garment: input.quantity_per_garment,
    unit_cost_cop: input.unit_cost_cop,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteMaterial(materialId: string): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };

  // Verifica propiedad vía tenant de la prenda
  const { data: material } = await supabase
    .from("garment_materials")
    .select("id, garments(tenant_id)")
    .eq("id", materialId)
    .single();

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!material) return { ok: false, error: "Material no encontrado." };
  const tenant = (material as any).garments?.tenant_id;
  if (tenant !== (profile as any)?.tenant_id) {
    return { ok: false, error: "Ese material no es de tu marca." };
  }

  const { error } = await supabase
    .from("garment_materials")
    .delete()
    .eq("id", materialId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ------------------------------------------------------------
// Datos para el PDF de la ficha técnica (los arma el cliente)
// ------------------------------------------------------------
export type TechSheetPdfData = {
  name: string;
  referenceCode: string;
  totalSamMinutes: number | null;
  suggestedRetailPrice: number | null;
  parts: { part_code: string; name: string; material_type: string | null }[];
  operations: {
    step_order: number;
    operation_name: string;
    machine_type: string;
    sam_minutes: number | null;
    base_rate_cop: number;
  }[];
  materials: {
    name: string;
    unit: string;
    quantity_per_garment: number;
    unit_cost_cop: number;
  }[];
  sizeFactors: Record<string, number>;
};

export async function getTechSheetPdfData(
  garmentId: string
): Promise<{ ok: true; data: TechSheetPdfData } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };

  const { data: garment } = await supabase
    .from("garments")
    .select("*")
    .eq("id", garmentId)
    .single();
  if (!garment) return { ok: false, error: "Prenda no encontrada." };
  const g = garment as any;

  const [{ data: parts }, { data: ops }, { data: materials }] = await Promise.all([
    supabase
      .from("garment_parts")
      .select("part_code, name, material_type")
      .eq("garment_id", garmentId)
      .order("part_code"),
    supabase
      .from("garment_operations")
      .select("step_order, operation_name, machine_type, sam_minutes, base_rate_cop")
      .eq("garment_id", garmentId)
      .order("step_order"),
    supabase
      .from("garment_materials")
      .select("name, unit, quantity_per_garment, unit_cost_cop")
      .eq("garment_id", garmentId)
      .order("name"),
  ]);

  return {
    ok: true,
    data: {
      name: g.name,
      referenceCode: g.reference_code,
      totalSamMinutes: g.total_sam_minutes != null ? Number(g.total_sam_minutes) : null,
      suggestedRetailPrice:
        g.suggested_retail_price != null ? Number(g.suggested_retail_price) : null,
      parts: (parts ?? []) as TechSheetPdfData["parts"],
      operations: (ops ?? []).map((o: any) => ({
        step_order: o.step_order,
        operation_name: o.operation_name,
        machine_type: o.machine_type,
        sam_minutes: o.sam_minutes != null ? Number(o.sam_minutes) : null,
        base_rate_cop: Number(o.base_rate_cop),
      })),
      materials: (materials ?? []).map((m: any) => ({
        name: m.name,
        unit: m.unit,
        quantity_per_garment: Number(m.quantity_per_garment),
        unit_cost_cop: Number(m.unit_cost_cop),
      })),
      sizeFactors: sanitizeSizeFactors(g.size_factors),
    },
  };
}

// Factores de consumo por talla (solo la marca dueña de la prenda)
export async function saveSizeFactors(
  garmentId: string,
  factors: Record<string, number>
): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };

  const { data: garment } = await supabase
    .from("garments")
    .select("id, tenant_id")
    .eq("id", garmentId)
    .single();

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!garment) return { ok: false, error: "Prenda no encontrada." };
  if ((garment as any).tenant_id !== (profile as any)?.tenant_id) {
    return { ok: false, error: "Esa prenda no es de tu marca." };
  }

  // Claves y valores saneados; vacío = volver a los defaults
  const clean = sanitizeSizeFactors(factors);
  const { error } = await supabase
    .from("garments")
    .update({ size_factors: clean })
    .eq("id", garmentId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/prendas/${garmentId}`);
  return { ok: true };
}

// Acción de formulario (✕ en cada fila de la ficha)
export async function deleteMaterialAction(formData: FormData): Promise<void> {
  const materialId = String(formData.get("materialId") ?? "");
  const garmentId = String(formData.get("garmentId") ?? "");
  if (!materialId) return;
  await deleteMaterial(materialId);
  if (garmentId) revalidatePath(`/dashboard/prendas/${garmentId}`);
}
