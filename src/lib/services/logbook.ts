// Servicio compartido: corrección/eliminación de anotaciones del cuaderno
// con doble confirmación (operario solicita → dueño del taller aprueba).

import { createClient } from "@/lib/supabase/server";

export type RequestChangeResult =
  | { ok: true; requestId: string }
  | { ok: false; error: string };

export type DecideResult =
  | { ok: true; status: "approved" | "rejected"; alreadyDecided?: boolean }
  | { ok: false; error: string };

/**
 * El operario (o el jefe marcando a nombre de alguien) solicita corregir
 * la cantidad o eliminar una anotación de daily_production_logs.
 * NO aplica nada: solo crea la solicitud pendiente para su dueño de taller.
 */
export async function requestLogbookChange(
  input: { logId: string; changeType: "edit_units" | "delete"; newUnits: number; reason: string },
  user: { id: string; role: string; satellite_owner_id: string | null }
): Promise<RequestChangeResult> {
  const supabase = await createClient();

  if (!input.logId) return { ok: false, error: "Anotación no especificada." };

  if (input.changeType === "edit_units") {
    const safeUnits = Math.floor(Number(input.newUnits));
    if (!Number.isFinite(safeUnits) || safeUnits <= 0 || safeUnits > 10_000) {
      return { ok: false, error: "Cantidad inválida (1 a 10.000)." };
    }
  }

  // Solo anotaciones propias (el operario no toca las de sus compañeros)
  const { data: log } = await supabase
    .from("daily_production_logs")
    .select("id, operator_id, order_id, units_completed")
    .eq("id", input.logId)
    .single();

  if (!log) return { ok: false, error: "Anotación no encontrada." };
  if ((log as any).operator_id !== user.id) {
    return { ok: false, error: "Solo puedes solicitar cambios sobre tus propias anotaciones." };
  }

  // El aprobador es el dueño del taller al que estoy afiliado
  if (!user.satellite_owner_id) {
    return { ok: false, error: "No estás afiliado a un taller satélite." };
  }

  // Ya existe una solicitud pendiente para este registro
  const { data: pending } = await supabase
    .from("logbook_change_requests")
    .select("id")
    .eq("log_id", input.logId)
    .eq("status", "pending")
    .maybeSingle();

  if (pending) {
    return { ok: false, error: "Ya existe una solicitud pendiente para esta anotación." };
  }

  const { data, error } = await supabase
    .from("logbook_change_requests")
    .insert({
      log_id: input.logId,
      requested_by: user.id,
      approver_id: user.satellite_owner_id,
      change_type: input.changeType,
      new_units: input.changeType === "delete" ? 0 : Math.floor(Number(input.newUnits)),
      reason: input.reason?.trim() || null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, requestId: (data as any).id };
}

/**
 * El dueño del taller decide. Delegado a la RPC security definer
 * decide_logbook_change, que re-valida identidad, tope de atado y tarifa.
 */
export async function decideLogbookChange(
  input: { requestId: string; decision: "approved" | "rejected" },
  user: { id: string; role: string }
): Promise<DecideResult> {
  const supabase = await createClient();

  if (user.role !== "satellite_owner") {
    return { ok: false, error: "Solo el dueño del taller puede aprobar o rechazar." };
  }

  const { data, error } = await supabase.rpc("decide_logbook_change", {
    p_request_id: input.requestId,
    p_decision: input.decision,
  });

  if (error) return { ok: false, error: error.message };
  const res = (data ?? {}) as any;
  if (res.alreadyDecided) {
    return { ok: true, status: res.status, alreadyDecided: true };
  }
  return { ok: true, status: res.status };
}
