export type OrderStats = {
  totalUnits: number;
  deliveredUnits: number;
  pendingUnits: number;
  progressPct: number;
  deliveredValueCop: number;
  pendingValueCop: number;
};

// Entregado = piezas ya marcadas en logs (completaron la ruta completa del
// atado); pendiente = unidades del atado que aún no completan su ruta.
export function computeOrderStats(
  bundles: { id: string; units_count: number }[],
  logsByBundle: Record<string, number>, // bundleId -> unidades completadas por atado
  unitPriceAgreed: number
): OrderStats {
  const totalUnits = bundles.reduce((a, b) => a + b.units_count, 0);

  let deliveredUnits = 0;
  for (const b of bundles) {
    const done = logsByBundle[b.id] ?? 0;
    deliveredUnits += Math.min(b.units_count, done);
  }

  const pendingUnits = Math.max(0, totalUnits - deliveredUnits);

  return {
    totalUnits,
    deliveredUnits,
    pendingUnits,
    progressPct: totalUnits > 0 ? Math.round((deliveredUnits / totalUnits) * 100) : 0,
    deliveredValueCop: deliveredUnits * unitPriceAgreed,
    pendingValueCop: pendingUnits * unitPriceAgreed,
  };
}

export function formatCopSafe(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}
