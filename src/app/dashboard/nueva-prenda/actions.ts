"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { inferGarmentDNA } from "@/lib/ai";
import { runExplodeGarment } from "@/lib/services/explode";
import { createOrderCore, requireProfile } from "@/lib/services/orders";

type Result = { ok: true } | { ok: false; error: string };

// ---------- Llamada a Motor de Visión (Colab Worker) ----------
export async function runColabVision(input: {
  name: string;
  referenceCode: string;
}): Promise<{ ok: true; garmentId: string } | { ok: false; error: string }> {
  const profile = await requireProfile();
  if (!profile?.tenant_id) return { ok: false, error: "No tienes una marca configurada." };

  const supabase = await createClient();
  const { data: worker } = await supabase.from("ai_vision_worker").select("cloudflare_url, status").eq("id", 1).single();

  if (!worker || worker.status !== "online" || !worker.cloudflare_url) {
    return { ok: false, error: "El motor de visión (Colab) está apagado. Enciéndelo primero." };
  }

  try {
    const formData = new FormData();
    formData.append("referenceCode", input.referenceCode);
    formData.append("name", input.name);
    formData.append("tenantId", profile.tenant_id);
    
    // Aquí irían los archivos reales en producción, por ahora el worker no los requiere obligatoriamente.

    const res = await fetch(`${worker.cloudflare_url}/api/v1/extract`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      return { ok: false, error: `Error del servidor de visión: ${res.statusText}` };
    }

    const data = await res.json();
    if (!data.ok) {
      return { ok: false, error: data.message || "Error interno en Visión" };
    }

    return { ok: true, garmentId: data.garment_id };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
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
