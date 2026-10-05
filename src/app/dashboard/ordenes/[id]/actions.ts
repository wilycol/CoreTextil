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

export async function updateOrderAssignment(orderId: string, status: import("@/lib/db.types").OrderAssignmentStatus) {
  const profile = await requireProfile();
  if (!profile) return { ok: false, error: "Sesión expirada." };

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { error } = await supabase
    .from("production_orders")
    .update({ assignment_status: status })
    .eq("id", orderId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteOrder(orderId: string) {
  const profile = await requireProfile();
  if (!profile || profile.role !== "brand_admin") return { ok: false, error: "No autorizado." };

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { error } = await supabase
    .from("production_orders")
    .delete()
    .eq("id", orderId)
    .eq("tenant_id", profile.tenant_id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
