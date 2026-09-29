import { getApiUser, ok, fail, statusForBusinessError } from "@/lib/api/http";
import { liquidateOrderCore } from "@/lib/services/liquidation";

// POST /api/v1/orders/:id/liquidate
// Liquida la orden: paga solo los atados con la ruta completa al 100%
// (mismo criterio que la UI) y marca la orden como completada.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await getApiUser();
  if (!profile) return fail("Sesión expirada.", 401);

  const { id } = await params;
  const res = await liquidateOrderCore(id, {
    id: profile.id,
    tenant_id: profile.tenant_id,
  });

  if (!res.ok) return fail(res.error, statusForBusinessError(res.error));
  return ok({ orderId: id, units: res.units, totalCop: res.totalCop });
}
