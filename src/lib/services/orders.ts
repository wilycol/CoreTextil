// Servicio compartido de órdenes de corte (server action + API v1).

import { createClient } from "@/lib/supabase/server";

export type MatrixRow = { size: string; color: string; units: number };

export type CreateOrderInput = {
  garmentId: string;
  satelliteEmail: string | null;
  unitPriceAgreed: number;
  matrix: MatrixRow[];
};

export type CreateOrderResult =
  | { ok: true; orderId: string; orderNumber: string; bundles: number }
  | { ok: false; error: string };

export async function createOrderCore(
  input: CreateOrderInput,
  userId: string,
  tenantId: string | null
): Promise<CreateOrderResult> {
  const supabase = await createClient();

  if (!tenantId) {
    return { ok: false, error: "Completa el onboarding de tu marca." };
  }

  const { data: garment } = await supabase
    .from("garments")
    .select("reference_code")
    .eq("id", input.garmentId)
    .single();

  if (!garment) return { ok: false, error: "Prenda no encontrada." };

  // Resuelve el satélite por email (si viene)
  let satelliteUserId: string | null = null;
  if (input.satelliteEmail) {
    const { data: sat } = await supabase
      .rpc("find_satellite_by_email", { target_email: input.satelliteEmail })
      .maybeSingle();
    if (!sat) {
      return {
        ok: false,
        error:
          "No hay un taller satélite registrado con ese email. Pídele que entre a CoreTextil primero.",
      };
    }
    satelliteUserId = (sat as any).id;
  }

  // FIX QA: la matriz debe traer al menos una fila con unidades válidas
  const cleanMatrix = (input.matrix ?? []).filter(
    (r) =>
      Number.isFinite(Number(r.units)) &&
      Number(r.units) > 0 &&
      Number(r.units) <= 100_000 &&
      typeof r.size === "string" &&
      r.size.trim() !== "" &&
      typeof r.color === "string" &&
      r.color.trim() !== ""
  );
  if (cleanMatrix.length === 0) {
    return {
      ok: false,
      error:
        "Agrega al menos una combinación talla/color con unidades válidas.",
    };
  }
  if (!Number.isFinite(input.unitPriceAgreed) || input.unitPriceAgreed <= 0) {
    return { ok: false, error: "El precio unitario acordado debe ser mayor a 0." };
  }

  const orderNumber = `OC-${Date.now().toString(36).toUpperCase()}`;

  const { data: order, error: orderError } = await supabase
    .from("production_orders")
    .insert({
      tenant_id: tenantId,
      order_number: orderNumber,
      garment_id: input.garmentId,
      satellite_user_id: satelliteUserId,
      unit_price_agreed: input.unitPriceAgreed,
      total_units: cleanMatrix.reduce((acc, r) => acc + Number(r.units), 0),
      status: satelliteUserId ? "dispatched" : "cutting",
    })
    .select("id")
    .single();

  if (orderError || !order) {
    return {
      ok: false,
      error: orderError?.message ?? "No se pudo crear la orden.",
    };
  }

  // Atados con código unívoco: REF-TALLA-COLOR-NN
  const counters = new Map<string, number>();
  const bundles = cleanMatrix.map((r) => {
    const key = `${r.size.trim().toUpperCase()}-${r.color.trim().toUpperCase()}`;
    const n = (counters.get(key) ?? 0) + 1;
    counters.set(key, n);
    return {
      order_id: order.id,
      bundle_code: `${(garment as any).reference_code}-${key}-${String(n).padStart(2, "0")}`,
      size: r.size.trim().toUpperCase().slice(0, 10),
      color: r.color.trim().toUpperCase().slice(0, 50),
      units_count: Math.floor(Number(r.units)),
    };
  });

  const { error: bundlesError } = await supabase
    .from("order_bundles")
    .insert(bundles);

  if (bundlesError) {
    return { ok: false, error: bundlesError.message };
  }

  // Vincula la marca con el satélite (idempotente por el unique)
  if (satelliteUserId) {
    await supabase
      .from("satellite_links")
      .insert({
        satellite_user_id: satelliteUserId,
        brand_tenant_id: tenantId,
      });
  }

  return {
    ok: true,
    orderId: order.id,
    orderNumber,
    bundles: bundles.length,
  };
}

// Resuelve el perfil mínimo del usuario autenticado (para acciones/API)
export async function requireProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, tenant_id, role, satellite_owner_id")
    .eq("id", user.id)
    .single();

  return profile
    ? (profile as {
        id: string;
        tenant_id: string | null;
        role: string;
        satellite_owner_id: string | null;
      })
    : null;
}
