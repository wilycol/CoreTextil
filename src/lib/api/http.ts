// Helpers comunes de la API v1: sesión por cookies (PWA same-origin),
// envoltura uniforme de respuestas y mapeo de errores a códigos HTTP.

import { requireProfile } from "@/lib/services/orders";

export type ApiProfile = {
  id: string;
  tenant_id: string | null;
  role: string;
  satellite_owner_id: string | null;
};

export async function getApiUser(): Promise<ApiProfile | null> {
  const profile = await requireProfile();
  return profile;
}

export function ok(data: unknown, status = 200) {
  return Response.json({ ok: true, data }, { status });
}

export function fail(error: string, status = 400) {
  return Response.json({ ok: false, error }, { status });
}

export function failFrom<T>(res: { ok: true } | { ok: false; error: string }, statusByMsg?: (msg: string) => number) {
  if (res.ok) return ok(res);
  const status = statusByMsg ? statusByMsg(res.error) : 400;
  return fail(res.error, status);
}

// Errores de negocio → HTTP: sesión, no encontrado, tope de atado, etc.
export function statusForBusinessError(msg: string): number {
  const m = msg.toLowerCase();
  if (m.includes("sesión expirada") || m.includes("debes estar autenticado")) return 401;
  if (m.includes("no encontrado") || m.includes("no existe")) return 404;
  if (m.includes("no pertenece") || m.includes("no es de tu") || m.includes("solo las marcas") || m.includes("solo quien")) return 403;
  if (m.includes("tope del atado")) return 409;
  return 400;
}
