import { getApiUser, ok, fail, statusForBusinessError } from "@/lib/api/http";
import { createTicketCore } from "@/lib/services/tickets";

// POST /api/v1/tickets/report
// Registro inicial de novedad (operario o jefe de taller).
// Body: { bundleId | bundleCode, quantity, reason, partId? }
export async function POST(request: Request) {
  const profile = await getApiUser();
  if (!profile) return fail("Sesión expirada.", 401);
  if (profile.role !== "operator" && profile.role !== "satellite_owner") {
    return fail("Solo el equipo del taller reporta novedades.", 403);
  }

  let bundleId: string | undefined;
  let bundleCode: string | undefined;
  let partId: string | null = null;
  let quantity = 0;
  let reason = "";

  try {
    const body = await request.json();
    bundleId = body?.bundleId ? String(body.bundleId) : undefined;
    bundleCode = body?.bundleCode ? String(body.bundleCode) : undefined;
    partId = body?.partId ? String(body.partId) : null;
    quantity = Number(body?.quantity ?? 0);
    reason = String(body?.reason ?? "");
  } catch {
    return fail("Cuerpo de la petición inválido.");
  }

  if (!bundleId && !bundleCode) return fail("Envía bundleId o bundleCode.");

  const res = await createTicketCore(
    { bundleId, bundleCode, partId, quantity, reason },
    {
      id: profile.id,
      role: profile.role,
      satellite_owner_id: profile.satellite_owner_id,
    }
  );

  if (!res.ok) return fail(res.error, statusForBusinessError(res.error));

  return ok({ ticketId: res.ticketId, status: res.status }, 201);
}
