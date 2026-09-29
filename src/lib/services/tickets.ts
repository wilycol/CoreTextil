// Servicio compartido: ciclo de vida de tickets de faltantes
// (server actions tickets + endpoints API /api/v1/tickets/*).

import { createClient } from "@/lib/supabase/server";

export const TICKET_REASONS = [
  "missing_piece",
  "damaged_fabric",
  "shortage_supplies",
] as const;

export type TicketReasonValue = (typeof TICKET_REASONS)[number];

export type CreateTicketResult =
  | { ok: true; ticketId: string; status: string }
  | { ok: false; error: string };

export type VerifyTicketResult =
  | { ok: true; status: string }
  | { ok: false; error: string };

// Registro inicial de novedad (operario o jefe de taller)
export async function createTicketCore(
  input: {
    bundleId?: string;
    bundleCode?: string;
    partId?: string | null;
    quantity: number;
    reason: string;
  },
  user: { id: string; role: string; satellite_owner_id: string | null }
): Promise<CreateTicketResult> {
  const supabase = await createClient();

  if (!TICKET_REASONS.includes(input.reason as TicketReasonValue)) {
    return { ok: false, error: "Motivo inválido." };
  }

  const qty = Math.floor(Number(input.quantity));
  if (!Number.isFinite(qty) || qty <= 0 || qty > 10_000) {
    return { ok: false, error: "Cantidad inválida." };
  }

  // Resuelve el atado por id o código
  let bundle: any = null;
  if (input.bundleId) {
    const { data } = await supabase
      .from("order_bundles")
      .select("id, order_id, production_orders!inner(tenant_id, satellite_user_id)")
      .eq("id", input.bundleId)
      .single();
    bundle = data;
  } else if (input.bundleCode) {
    const { data } = await supabase
      .from("order_bundles")
      .select("id, order_id, production_orders!inner(tenant_id, satellite_user_id)")
      .eq("bundle_code", input.bundleCode.trim())
      .single();
    bundle = data;
  } else {
    return { ok: false, error: "Indica bundleId o bundleCode." };
  }

  if (!bundle) return { ok: false, error: "Atado no encontrado." };

  // Solo puede reportar quien pertenece al taller del atado
  const satelliteId =
    user.role === "operator" ? user.satellite_owner_id : user.id;
  if (
    !satelliteId ||
    (bundle as any).production_orders?.satellite_user_id !== satelliteId
  ) {
    return { ok: false, error: "Ese atado no pertenece a tu taller." };
  }

  const { data, error } = await supabase
    .from("material_tickets")
    .insert({
      tenant_id: (bundle as any).production_orders.tenant_id,
      order_id: (bundle as any).order_id,
      bundle_id: (bundle as any).id,
      part_id: input.partId ?? null,
      operator_id: user.id,
      quantity_needed: qty,
      reason: input.reason,
    })
    .select("id, status")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, ticketId: (data as any).id, status: (data as any).status };
}

// Aprobación o descarte por el jefe de satélite
export async function verifyTicketCore(
  ticketId: string,
  action: "approve" | "discard",
  approverId: string
): Promise<VerifyTicketResult> {
  const supabase = await createClient();

  const { data: ticket } = await supabase
    .from("material_tickets")
    .select("id, status, order_id, production_orders!inner(satellite_user_id)")
    .eq("id", ticketId)
    .single();

  if (!ticket) return { ok: false, error: "Ticket no encontrado." };
  if ((ticket as any).production_orders?.satellite_user_id !== approverId) {
    return { ok: false, error: "Ese ticket no es de tu taller." };
  }
  if ((ticket as any).status !== "pending_satellite") {
    return { ok: false, error: "El ticket ya no está pendiente." };
  }

  const nextStatus = action === "approve" ? "approved_satellite" : "cancelled";
  const { error } = await supabase
    .from("material_tickets")
    .update({
      status: nextStatus,
      satellite_approver_id: approverId,
    })
    .eq("id", ticketId);

  if (error) return { ok: false, error: error.message };
  return { ok: true, status: nextStatus };
}
