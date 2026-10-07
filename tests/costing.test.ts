import { describe, it, expect } from "vitest";
import { fixedUnitCost, profitabilityLight } from "../src/lib/costing";

describe("Flujo 4: QA CFI Costing Simulator & Traffic Light Indicators", () => {
  it("debe calcular el Costo Fijo Unitario (CFI) dividiendo costos fijos entre capacidad estimada", () => {
    const profile = {
      rent_monthly: 1000000,
      energy_monthly: 200000,
      consumables_monthly: 100000,
      maintenance_monthly: 200000,
      estimated_monthly_units: 1500, // Total = 1.500.000 / 1.500 = 1.000 COP/unidad
    };

    const cfi = fixedUnitCost(profile);
    expect(cfi).toBe(1000);
  });

  it("debe evitar división por cero si la capacidad mensual estimada es 0 o negativa", () => {
    const profile = {
      rent_monthly: 500000,
      energy_monthly: 100000,
      consumables_monthly: 50000,
      maintenance_monthly: 50000,
      estimated_monthly_units: 0,
    };

    const cfi = fixedUnitCost(profile);
    expect(cfi).toBe(700000); // 700.000 / Math.max(1, 0)
  });

  it("debe clasificar el semáforo de rentabilidad correctamente", () => {
    expect(profitabilityLight(25).color).toBe("green");
    expect(profitabilityLight(20).color).toBe("green");
    expect(profitabilityLight(15).color).toBe("yellow");
    expect(profitabilityLight(10).color).toBe("yellow");
    expect(profitabilityLight(5).color).toBe("red");
    expect(profitabilityLight(-10).color).toBe("red");
  });
});
