"use server";

import { requireProfile, createOrderCore } from "@/lib/services/orders";

export type MatrixRow = { size: string; color: string; units: number };

type Result =
  | { ok: true; orderId: string }
  | { ok: false; error: string };

export async function createOrder(input: {
  garmentId: string;
  satelliteEmail: string | null;
  unitPriceAgreed: number;
  matrix: MatrixRow[];
}): Promise<Result> {
  const profile = await requireProfile();
  if (!profile) return { ok: false, error: "Sesión expirada." };

  const res = await createOrderCore(
    {
      garmentId: input.garmentId,
      satelliteEmail: input.satelliteEmail,
      unitPriceAgreed: input.unitPriceAgreed,
      matrix: input.matrix,
    },
    profile.id,
    profile.tenant_id
  );

  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, orderId: res.orderId };
}
