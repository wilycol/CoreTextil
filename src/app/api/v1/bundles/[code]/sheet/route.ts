import { getApiUser, ok, fail, statusForBusinessError } from "@/lib/api/http";
import { getBundleSheetCore } from "@/lib/services/bundleSheet";

// GET /api/v1/bundles/:code/sheet
// Ficha resumida del atado ("qué coser") con los materiales recalculados
// a la talla y las unidades del atado.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const profile = await getApiUser();
  if (!profile) return fail("Sesión expirada.", 401);

  const { code } = await params;
  const res = await getBundleSheetCore(decodeURIComponent(code));
  if (!res.ok) return fail(res.error, statusForBusinessError(res.error));

  return ok(res.sheet);
}
