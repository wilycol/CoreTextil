// Módulo de visión multimodal: foto/boceto → ADN de prenda.
// Usa Google Gemini (generateContent) cuando hay GEMINI_API_KEY; si no,
// el formulario cae al generador heurístico local sin romper el flujo.

import { inferGarmentDNA } from "@/lib/ai";

export type VisionResult = {
  source: "gemini" | "fallback";
  note: string | null;
  name: string;
  totalSamMinutes: number;
  suggestedRetailPrice: number;
  parts: { part_code: string; name: string; material_type: string }[];
  operations: {
    step_order: number;
    operation_name: string;
    machine_type: "plana" | "fileteadora" | "collarin";
    sam_minutes: number;
    base_rate_cop: number;
  }[];
  materials: {
    name: string;
    unit: string;
    quantity_per_garment: number;
    unit_cost_cop: number;
  }[];
  materialsCostCop: number;
};

const VALID_MACHINES = new Set(["plana", "fileteadora", "collarin"]);

const PROMPT = `Eres un experto en producción de confección textil colombiana (Cúcuta).
Analiza la foto o boceto de la prenda y responde SOLO con JSON válido, sin markdown:
{
  "name": "nombre corto de la prenda en español",
  "parts": [{"code": "FRE", "name": "Frente", "material": "tela principal"}],
  "operations": [{"name": "Filetear hombros", "machine": "fileteadora|plana|collarin", "sam": 0.5}],
  "materials": [{"name": "Tela principal jersey", "unit": "m|unidad", "qty": 0.45, "unit_cost_cop": 8000}],
  "suggested_base_rate_cop": 4000
}
Reglas:
- parts: despiece completo (4 a 8 piezas), códigos de 2-3 letras en mayúsculas.
- operations: ruta secuencial de ensamble (4 a 8 pasos), solo máquinas plana, fileteadora o collarin.
- sam: minutos estándar por operación (decimales realistas).
- materials: 2 a 6 materiales con consumo por prenda y precio de mercado colombiano realista (tela en metros, insumos por unidad, hilo en metros).
- suggested_base_rate_cop: destajo total razonable por prenda en pesos colombianos (2000-15000).`;

function normalizeMachine(raw: unknown): "plana" | "fileteadora" | "collarin" {
  const s = String(raw ?? "").toLowerCase().trim();
  if (VALID_MACHINES.has(s)) return s as "plana" | "fileteadora" | "collarin";
  if (s.includes("filet") || s.includes("overlock") || s.includes("remall")) return "fileteadora";
  if (s.includes("collar") || s.includes("cover")) return "collarin";
  return "plana";
}

function buildVisionResult(
  parsed: any,
  ctx: { referenceCode: string; baseRateCop: number; hintName?: string }
): VisionResult {
  const rawParts: any[] = Array.isArray(parsed?.parts) ? parsed.parts : [];
  const rawOps: any[] = Array.isArray(parsed?.operations) ? parsed.operations : [];

  if (rawParts.length === 0 || rawOps.length === 0) {
    throw new Error("Respuesta de visión incompleta");
  }

  const operations = rawOps.map((o, i) => {
    const sam = Number(o?.sam) > 0 ? Number(o.sam) : 0.5;
    return {
      step_order: i + 1,
      operation_name: String(o?.name ?? `Operación ${i + 1}`).slice(0, 140),
      machine_type: normalizeMachine(o?.machine),
      sam_minutes: Number(sam.toFixed(2)),
      base_rate_cop: 0, // se reparte abajo
    };
  });

  const totalSam = operations.reduce((a, o) => a + o.sam_minutes, 0) || 1;
  const pool = Number(parsed?.suggested_base_rate_cop) > 0
    ? Math.round(Number(parsed.suggested_base_rate_cop))
    : ctx.baseRateCop;

  for (const o of operations) {
    o.base_rate_cop = Math.round((pool * o.sam_minutes) / totalSam);
  }

  const parts = rawParts.slice(0, 12).map((p) => ({
    part_code: `${ctx.referenceCode}-${String(p?.code ?? p?.part_code ?? "PIEZA")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6)}`,
    name: String(p?.name ?? "Pieza").slice(0, 90),
    material_type: String(p?.material ?? p?.material_type ?? "tela principal").slice(0, 50),
  }));

  const materials = (Array.isArray(parsed?.materials) ? parsed.materials : [])
    .slice(0, 10)
    .map((m: any) => {
      const qty = Number(m?.qty ?? m?.quantity_per_garment);
      const cost = Number(m?.unit_cost_cop);
      return {
        name: String(m?.name ?? "Material").slice(0, 120),
        unit: String(m?.unit ?? "unidad").slice(0, 20),
        quantity_per_garment: Number.isFinite(qty) && qty > 0 ? qty : 1,
        unit_cost_cop: Number.isFinite(cost) && cost >= 0 ? cost : 0,
      };
    });
  const materialsCostCop = materials.reduce(
    (a: number, m: any) => a + m.quantity_per_garment * m.unit_cost_cop,
    0
  );

  return {
    source: "gemini",
    note: null,
    name: String(parsed?.name ?? ctx.hintName ?? "Prenda").slice(0, 140),
    totalSamMinutes: Number(totalSam.toFixed(2)),
    suggestedRetailPrice: pool,
    parts,
    operations,
    materials,
    materialsCostCop: Math.round(materialsCostCop),
  };
}

export async function generateDNAFromImage(input: {
  imageBase64: string; // sin prefijo data:
  mimeType: string; // "image/jpeg" | "image/png" | "image/webp"
  referenceCode: string;
  baseRateCop: number;
  hintName?: string;
}): Promise<VisionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const fallback = inferGarmentDNA({
      name: input.hintName ?? "Prenda",
      referenceCode: input.referenceCode,
      baseRateCop: input.baseRateCop,
    });
    return {
      source: "fallback",
      note: "Sin GEMINI_API_KEY configurada: usamos la estimación local. Configura la clave para análisis con IA.",
      name: input.hintName ?? "Prenda",
      totalSamMinutes: fallback.totalSamMinutes,
      suggestedRetailPrice: fallback.suggestedRetailPrice,
      parts: fallback.parts,
      operations: fallback.operations,
      materials: fallback.materials,
      materialsCostCop: fallback.materialsCostCop,
    };
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: input.hintName ? `${PROMPT}\nLa marca la describe como: "${input.hintName}".` : PROMPT },
            { inline_data: { mime_type: input.mimeType, data: input.imageBase64 } },
          ],
        },
      ],
      generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Gemini respondió ${res.status}: ${detail.slice(0, 200)}`);
  }

  const json = await res.json();
  const text: string | undefined =
    json?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? "").join("") ?? undefined;

  if (!text) throw new Error("Respuesta vacía del modelo de visión");

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("El modelo no devolvió JSON válido");
    parsed = JSON.parse(m[0]);
  }

  return buildVisionResult(parsed, {
    referenceCode: input.referenceCode,
    baseRateCop: input.baseRateCop,
    hintName: input.hintName,
  });
}
