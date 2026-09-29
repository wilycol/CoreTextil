"use server";

import { requireProfile } from "@/lib/services/orders";
import { liquidateOrderCore } from "@/lib/services/liquidation";

type Result = { ok: true; totalCop: number; units: number } | { ok: false; error: string };

export async function liquidateOrder(orderId: string): Promise<Result> {
  const profile = await requireProfile();
  if (!profile) return { ok: false, error: "Sesión expirada." };

  return liquidateOrderCore(orderId, {
    id: profile.id,
    tenant_id: profile.tenant_id,
  });
}
