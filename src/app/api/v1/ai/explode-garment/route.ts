import { getApiUser, ok, fail } from "@/lib/api/http";
import { runExplodeGarment } from "@/lib/services/explode";

export const maxDuration = 60; // análisis de visión puede tardar

// POST /api/v1/ai/explode-garment
// Recibe una imagen (JSON base64 o multipart/form-data) y entrega el ADN:
// despiece, ruta de máquinas, SAM, tarifas y materiales sugeridos.
export async function POST(request: Request) {
  const profile = await getApiUser();
  if (!profile) return fail("Sesión expirada.", 401);

  const contentType = request.headers.get("content-type") ?? "";

  let imageBase64 = "";
  let mimeType = "image/jpeg";
  let referenceCode = "";
  let baseRateCop = 4000;
  let hintName: string | undefined;

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("image");
      if (!(file instanceof File)) return fail("Falta el archivo 'image'.");
      if (file.size > 6_000_000) return fail("La imagen supera 6 MB.");
      const buf = Buffer.from(await file.arrayBuffer());
      imageBase64 = buf.toString("base64");
      mimeType = file.type || "image/jpeg";
      referenceCode = String(form.get("referenceCode") ?? "").trim();
      baseRateCop = Number(form.get("baseRateCop") ?? 4000) || 4000;
      hintName = String(form.get("hintName") ?? "").trim() || undefined;
    } else {
      const body = await request.json();
      imageBase64 = String(body?.imageBase64 ?? "").replace(
        /^data:image\/[a-z+]+;base64,/i,
        ""
      );
      mimeType = String(body?.mimeType ?? "image/jpeg");
      referenceCode = String(body?.referenceCode ?? "").trim();
      baseRateCop = Number(body?.baseRateCop ?? 4000) || 4000;
      hintName = body?.hintName ? String(body.hintName) : undefined;
    }
  } catch {
    return fail("Cuerpo de la petición inválido.");
  }

  if (!referenceCode) return fail("referenceCode es obligatorio.");

  const res = await runExplodeGarment({
    imageBase64,
    mimeType,
    referenceCode,
    baseRateCop,
    hintName,
  });

  if (!res.ok) return fail(res.error, 400);
  return ok({ source: res.dna.source, note: res.dna.note, dna: res.dna });
}
