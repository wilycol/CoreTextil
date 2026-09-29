"use server";

import { requireProfile } from "@/lib/services/orders";
import {
  createTicketCore,
  verifyTicketCore,
} from "@/lib/services/tickets";

type Result = { ok: true } | { ok: false; error: string };

type Reason = "missing_piece" | "damaged_fabric" | "shortage_supplies";

export async function createTicket(
  bundleId: string,
  quantity: number,
  reason: Reason
): Promise<Result> {
  const profile = await requireProfile();
  if (!profile) return { ok: false, error: "Sesión expirada." };

  const res = await createTicketCore(
    { bundleId, quantity, reason },
    {
      id: profile.id,
      role: profile.role,
      satellite_owner_id: profile.satellite_owner_id,
    }
  );

  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true };
}

export async function approveTicket(ticketId: string): Promise<Result> {
  const profile = await requireProfile();
  if (!profile) return { ok: false, error: "Sesión expirada." };

  const res = await verifyTicketCore(ticketId, "approve", profile.id);
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true };
}

// Descarte por el jefe de satélite (mismo endpoint/acción, acción "discard")
export async function discardTicket(ticketId: string): Promise<Result> {
  const profile = await requireProfile();
  if (!profile) return { ok: false, error: "Sesión expirada." };

  const res = await verifyTicketCore(ticketId, "discard", profile.id);
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true };
}

export async function dispatchTicket(ticketId: string): Promise<Result> {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };

  const profile = await requireProfile();
  if (!profile?.tenant_id) {
    return { ok: false, error: "Solo las marcas despachan reposiciones." };
  }

  const { data: ticket } = await supabase
    .from("material_tickets")
    .select("id, status, tenant_id")
    .eq("id", ticketId)
    .single();

  if (!ticket) return { ok: false, error: "Ticket no encontrado." };
  if ((ticket as any).tenant_id !== profile.tenant_id) {
    return { ok: false, error: "Ese ticket no es de tu marca." };
  }
  if ((ticket as any).status !== "approved_satellite") {
    return { ok: false, error: "El ticket no está aprobado por el satélite." };
  }

  const { error } = await supabase
    .from("material_tickets")
    .update({ status: "dispatched" as const })
    .eq("id", ticketId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
