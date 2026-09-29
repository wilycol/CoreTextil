import { getApiUser, ok, fail, statusForBusinessError } from "@/lib/api/http";
import { logUnitsCore } from "@/lib/services/production";

// POST /api/v1/production/log-units
// Valida el tope del atado (trigger enforce_bundle_cap en la base) y guarda
// el avance del operario. Acepta bundleId o bundleCode (el código del QR).
export async function POST(request: Request) {
  const profile = await getApiUser();
  if (!profile) return fail("Sesión expirada.", 401);
  if (profile.role !== "operator" && profile.role !== "satellite_owner") {
    return fail("Solo operarios y jefes de taller marcan producción.", 403);
  }

  let bundleId: string | undefined;
  let bundleCode: string | undefined;
  let operationId = "";
  let units = 0;

  try {
    const body = await request.json();
    bundleId = body?.bundleId ? String(body.bundleId) : undefined;
    bundleCode = body?.bundleCode ? String(body.bundleCode) : undefined;
    operationId = String(body?.operationId ?? "");
    units = Number(body?.units ?? 0);
  } catch {
    return fail("Cuerpo de la petición inválido.");
  }

  if (!operationId) return fail("operationId es obligatorio.");
  if (!bundleId && !bundleCode) return fail("Envía bundleId o bundleCode.");

  const res = await logUnitsCore(
    { bundleId, bundleCode, operationId, units },
    {
      id: profile.id,
      role: profile.role,
      satellite_owner_id: profile.satellite_owner_id,
    }
  );

  if (!res.ok) return fail(res.error, statusForBusinessError(res.error));

  return ok({
    earnedCop: res.earned,
    operation: res.operation,
    bundleCode: res.bundleCode,
  });
}
