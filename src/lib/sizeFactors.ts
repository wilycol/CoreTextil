// Factores de consumo de materiales por talla.
// La cantidad por prenda (garment_materials.quantity_per_garment) corresponde
// a la talla base (factor 1). Las demás tallas multiplican ese consumo:
// una XXL consume ~20% más tela que una M.

export const DEFAULT_SIZE_FACTORS: Record<string, number> = {
  XS: 0.95,
  S: 1,
  M: 1,
  L: 1.05,
  XL: 1.1,
  XXL: 1.2,
};

export const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"] as const;

export function normalizeSize(size: string): string {
  return size.trim().toUpperCase();
}

// Factor efectivo de una talla: el guardado en la ficha o el por defecto.
export function sizeFactor(
  sizeFactors: Record<string, number> | null | undefined,
  size: string
): number {
  const key = normalizeSize(size);
  const v = sizeFactors?.[key];
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return v;
  return DEFAULT_SIZE_FACTORS[key] ?? 1;
}

// Consumo escalado, redondeado a 2 decimales (práctico para taller).
export function scaledQuantity(
  quantityPerGarment: number,
  factor: number
): number {
  return Math.round(quantityPerGarment * factor * 100) / 100;
}

// Normaliza lo guardado: claves en mayúscula y factores válidos (0 < f <= 3).
export function sanitizeSizeFactors(
  raw: Record<string, unknown> | null | undefined
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw ?? {})) {
    const key = normalizeSize(k);
    const f = Number(v);
    if (!key || !Number.isFinite(f) || f <= 0 || f > 3) continue;
    out[key] = f;
  }
  return out;
}

// Tallas del editor: las estándar + cualquier extra que traiga la ficha.
export function editableSizes(
  sizeFactors: Record<string, number> | null | undefined
): string[] {
  const extra = Object.keys(sizeFactors ?? {}).filter(
    (k) => !(SIZE_ORDER as readonly string[]).includes(k)
  );
  return [...SIZE_ORDER, ...extra.sort()];
}

// ------------------------------------------------------------------
// Recálculo de materiales para un atado concreto (talla + unidades)
// ------------------------------------------------------------------
export type BundleMaterialRow = {
  name: string;
  unit: string;
  quantity_per_garment: number; // consumo base de la ficha (talla M)
  unit_cost_cop: number;
};

export type ScaledBundleMaterials = {
  materials: {
    name: string;
    unit: string;
    quantity_per_garment: number; // ya escalado al factor de la talla
    unit_cost_cop: number;
    quantity_for_bundle: number; // escalado × unidades del atado
    cost_for_bundle: number;
  }[];
  materialsCostCop: number; // costo de materiales por prenda a esa talla
  materialsCostForBundle: number; // total de tela e insumos para todo el atado
  factor: number; // factor aplicado
};

export function scaleBundleMaterials(
  materials: BundleMaterialRow[],
  sizeFactors: Record<string, number> | null | undefined,
  size: string,
  bundleUnits: number
): ScaledBundleMaterials {
  const factor = sizeFactor(sizeFactors, size);
  const units = Math.max(0, Math.floor(bundleUnits || 0));

  const rows = materials.map((m) => {
    const qtyPerGarment = scaledQuantity(m.quantity_per_garment, factor);
    const qtyForBundle = scaledQuantity(qtyPerGarment, units);
    return {
      name: m.name,
      unit: m.unit,
      quantity_per_garment: qtyPerGarment,
      unit_cost_cop: m.unit_cost_cop,
      quantity_for_bundle: qtyForBundle,
      cost_for_bundle: Math.round(qtyForBundle * m.unit_cost_cop),
    };
  });

  return {
    materials: rows,
    materialsCostCop: Math.round(
      rows.reduce((a, m) => a + m.quantity_per_garment * m.unit_cost_cop, 0)
    ),
    materialsCostForBundle: rows.reduce((a, m) => a + m.cost_for_bundle, 0),
    factor,
  };
}
