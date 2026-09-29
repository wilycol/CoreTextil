import { getApiUser, ok, fail, statusForBusinessError } from "@/lib/api/http";
import { createClient } from "@/lib/supabase/server";

// POST /api/v1/bundles/receive
// Recepción de atado por código QR (RPC receive_bundle_by_code: valida taller,
// idempotente por atado, orden dispatched → in_progress).
// Body: { bundleCode, note? }
export async function POST(request: Request) {
  const profile = await getApiUser();
  if (!profile) return fail("Sesión expirada.", 401);
  if (profile.role !== "satellite_owner" && profile.role !== "operator") {
    return fail("Solo el equipo del taller recibe atados.", 403);
  }

  let bundleCode = "";
  let note: string | null = null;
  try {
    const body = await request.json();
    bundleCode = String(body?.bundleCode ?? "").trim();
    note = body?.note ? String(body.note) : null;
  } catch {
    return fail("Cuerpo de la petición inválido.");
  }
  if (!bundleCode) return fail("bundleCode es obligatorio.");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("receive_bundle_by_code", {
    p_bundle_code: bundleCode,
    p_note: note,
  });

  if (error) return fail(error.message, statusForBusinessError(error.message));
  if (!data) return fail("Respuesta vacía de la base de datos.", 500);

  return ok(data, 201);
}
