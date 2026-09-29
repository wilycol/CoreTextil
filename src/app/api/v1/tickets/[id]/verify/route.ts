import { getApiUser, ok, fail, statusForBusinessError } from "@/lib/api/http";
import { verifyTicketCore } from "@/lib/services/tickets";

// PATCH /api/v1/tickets/:id/verify
// Aprobación o descarte por el jefe del satélite.
// Body: { action: "approve" | "discard" }
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await getApiUser();
  if (!profile) return fail("Sesión expirada.", 401);
  if (profile.role !== "satellite_owner") {
    return fail("Solo el jefe del taller verifica los tickets.", 403);
  }

  const { id } = await params;

  let action = "";
  try {
    const body = await request.json();
    action = String(body?.action ?? "");
  } catch {
    return fail("Cuerpo de la petición inválido.");
  }

  if (action !== "approve" && action !== "discard") {
    return fail("action debe ser 'approve' o 'discard'.");
  }

  const res = await verifyTicketCore(id, action, profile.id);
  if (!res.ok) return fail(res.error, statusForBusinessError(res.error));

  return ok({ ticketId: id, status: res.status });
}
