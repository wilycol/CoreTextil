"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { inferGarmentDNA } from "@/lib/ai";
import { runExplodeGarment } from "@/lib/services/explode";
import { createOrderCore, requireProfile } from "@/lib/services/orders";

type Result = { ok: true } | { ok: false; error: string };

// ---------- ADN desde foto (IA multimodal) ----------
export async function generateDNAFromPhoto(input: {
  imageBase64: string;
  mimeType: string;
  referenceCode: string;
  baseRateCop: number;
  hintName?: string;
}): Promise<{ ok: true; dna: any } | { ok: false; error: string }> {
  return runExplodeGarment(input);
}

// ---------- Guardar prenda (heurístico o desde IA) ----------
type DNAPayload = {
  name: string;
  totalSamMinutes: number;
  suggestedRetailPrice: number;
  parts: { part_code: string; name: string; material_type: string }[];
  operations: {
    step_order: number;
    operation_name: string;
    machine_type: "plana" | "fileteadora" | "collarin";
    sam_minutes: number;
    base_rate_cop: number;
  }[];
  materials?: {
    name: string;
    unit: string;
    quantity_per_garment: number;
    unit_cost_cop: number;
  }[];
};

export async function createGarment(input: {
  name: string;
  referenceCode: string;
  baseRateCop: number;
  dna?: DNAPayload | null;
}): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };

  const profile = await requireProfile();
  if (!profile?.tenant_id) {
    return { ok: false, error: "Completa el onboarding de tu marca." };
  }

  const dna = input.dna
    ? {
        parts: input.dna.parts,
        operations: input.dna.operations,
        totalSamMinutes: input.dna.totalSamMinutes,
        suggestedRetailPrice: input.dna.suggestedRetailPrice,
      }
    : inferGarmentDNA(input);

  // Guardia server: el ADN debe traer partes y ruta de operaciones
  if (!Array.isArray(dna.parts) || dna.parts.length === 0) {
    return { ok: false, error: "El ADN no trae despiece (parts)." };
  }
  if (!Array.isArray(dna.operations) || dna.operations.length === 0) {
    return {
      ok: false,
      error: "El ADN no trae ruta de ensamble (operations).",
    };
  }

  const { data: garment, error: garmentError } = await supabase
    .from("garments")
    .insert({
      tenant_id: profile.tenant_id,
      reference_code: input.referenceCode,
      name: input.name,
      total_sam_minutes: dna.totalSamMinutes,
      suggested_retail_price: dna.suggestedRetailPrice,
    })
    .select("id")
    .single();

  if (garmentError || !garment) {
    return { ok: false, error: garmentError?.message ?? "No se pudo guardar." };
  }

  const { error: partsError } = await supabase
    .from("garment_parts")
    .insert(dna.parts.map((p) => ({ ...p, garment_id: garment.id })));

  if (partsError) {
    return { ok: false, error: partsError.message };
  }

  const { error: opsError } = await supabase
    .from("garment_operations")
    .insert(dna.operations.map((o) => ({ ...o, garment_id: garment.id })));

  if (opsError) {
    return { ok: false, error: opsError.message };
  }

  const materials = (dna as any).materials as DNAPayload["materials"] | undefined;
  if (materials && materials.length > 0) {
    const { error: matError } = await supabase
      .from("garment_materials")
      .insert(materials.map((m) => ({ ...m, garment_id: garment.id })));
    if (matError) return { ok: false, error: matError.message };
  }

  redirect(`/dashboard/ordenes/nueva?garment=${garment.id}`);
}
