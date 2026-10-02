"use server";

import { logUnitsCore } from "@/lib/services/production";
import { requireProfile } from "@/lib/services/orders";

type Result =
  | { ok: true; earned: number }
  | { ok: false; error: string };

export async function logProduction(
  bundleId: string,
  operationId: string,
  units: number,
  operatorId?: string
): Promise<Result> {
  const profile = await requireProfile();
  if (!profile) return { ok: false, error: "Sesión expirada." };

  const res = await logUnitsCore(
    { bundleId, operationId, units, operatorId },
    {
      id: profile.id,
      role: profile.role,
      satellite_owner_id: profile.satellite_owner_id,
    }
  );

  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, earned: res.earned };
}
