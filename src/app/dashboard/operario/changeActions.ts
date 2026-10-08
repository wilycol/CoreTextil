"use server";

import {
  requestLogbookChange,
  decideLogbookChange,
} from "@/lib/services/logbook";
import { requireProfile } from "@/lib/services/orders";

type ChangeResult =
  | { ok: true; requestId?: string; status?: "approved" | "rejected" }
  | { ok: false; error: string };

export async function requestChangeAction(
  logId: string,
  changeType: "edit_units" | "delete",
  newUnits: number,
  reason: string
): Promise<ChangeResult> {
  const profile = await requireProfile();
  if (!profile) return { ok: false, error: "Sesión expirada." };

  const res = await requestLogbookChange(
    { logId, changeType, newUnits, reason },
    {
      id: profile.id,
      role: profile.role,
      satellite_owner_id: profile.satellite_owner_id,
    }
  );
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, requestId: res.requestId };
}

export async function decideChangeAction(
  requestId: string,
  decision: "approved" | "rejected"
): Promise<ChangeResult> {
  const profile = await requireProfile();
  if (!profile) return { ok: false, error: "Sesión expirada." };

  const res = await decideLogbookChange(
    { requestId, decision },
    { id: profile.id, role: profile.role }
  );
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, status: res.status };
}
