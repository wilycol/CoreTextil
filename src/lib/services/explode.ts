// Servicio compartido de "ADN de prenda" (lo usan la server action
// nueva-prenda y el endpoint API /api/v1/ai/explode-garment).

import { generateDNAFromImage, type VisionResult } from "@/lib/vision";

export type ExplodeResult =
  | { ok: true; dna: VisionResult }
  | { ok: false; error: string };

export async function runExplodeGarment(input: {
  imageBase64: string;
  mimeType: string;
  referenceCode: string;
  baseRateCop: number;
  hintName?: string;
}): Promise<ExplodeResult> {
  if (!input.imageBase64 || !input.mimeType.startsWith("image/")) {
    return { ok: false, error: "Imagen inválida." };
  }
  if (input.imageBase64.length > 7_000_000) {
    return { ok: false, error: "La imagen es demasiado grande incluso reducida." };
  }

  try {
    const dna = await generateDNAFromImage({
      imageBase64: input.imageBase64,
      mimeType: input.mimeType,
      referenceCode: input.referenceCode,
      baseRateCop: input.baseRateCop,
      hintName: input.hintName,
    });
    return { ok: true, dna };
  } catch (e: any) {
    return {
      ok: false,
      error:
        e?.message ??
        "El análisis de visión falló. Intenta de nuevo o usa la estimación local.",
    };
  }
}
