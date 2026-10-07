import { describe, it, expect } from "vitest";
import { computeOrderStats, formatCopSafe } from "../src/lib/orderMath";

describe("Flujo 3: QA Order Math & Statistics", () => {
  it("debe calcular 0% de progreso cuando no hay unidades entregadas", () => {
    const bundles = [
      { id: "b1", units_count: 50 },
      { id: "b2", units_count: 50 },
    ];
    const logsByBundle = {};
    const unitPriceAgreed = 12000;

    const stats = computeOrderStats(bundles, logsByBundle, unitPriceAgreed);

    expect(stats.totalUnits).toBe(100);
    expect(stats.deliveredUnits).toBe(0);
    expect(stats.pendingUnits).toBe(100);
    expect(stats.progressPct).toBe(0);
    expect(stats.deliveredValueCop).toBe(0);
    expect(stats.pendingValueCop).toBe(1200000);
  });

  it("debe calcular el progreso parcial y montos en COP correctamente", () => {
    const bundles = [
      { id: "b1", units_count: 40 },
      { id: "b2", units_count: 60 },
    ];
    const logsByBundle = { b1: 40, b2: 30 }; // b1 100% entregado, b2 50% completado
    const unitPriceAgreed = 15000;

    const stats = computeOrderStats(bundles, logsByBundle, unitPriceAgreed);

    expect(stats.totalUnits).toBe(100);
    expect(stats.deliveredUnits).toBe(70);
    expect(stats.pendingUnits).toBe(30);
    expect(stats.progressPct).toBe(70);
    expect(stats.deliveredValueCop).toBe(1050000);
    expect(stats.pendingValueCop).toBe(450000);
  });

  it("debe capar las unidades entregadas al límite del atado para evitar sobre-conteo en stats", () => {
    const bundles = [{ id: "b1", units_count: 50 }];
    const logsByBundle = { b1: 999 }; // Anomalía o intento de sobre-marcación
    const unitPriceAgreed = 10000;

    const stats = computeOrderStats(bundles, logsByBundle, unitPriceAgreed);

    expect(stats.deliveredUnits).toBe(50);
    expect(stats.pendingUnits).toBe(0);
    expect(stats.progressPct).toBe(100);
  });

  it("debe formatear monedas en COP de manera segura sin decimales", () => {
    const formatted = formatCopSafe(1500000);
    expect(formatted).toContain("1.500.000");
  });
});
