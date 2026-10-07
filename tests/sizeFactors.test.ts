import { describe, it, expect } from "vitest";
import {
  sizeFactor,
  normalizeSize,
  scaledQuantity,
  sanitizeSizeFactors,
  scaleBundleMaterials,
  DEFAULT_SIZE_FACTORS,
} from "../src/lib/sizeFactors";

describe("Flujo 2: QA Size Factors & Fabric Consumption Math", () => {
  it("debe retornar el factor por defecto para cada talla estándar", () => {
    expect(sizeFactor(null, "XS")).toBe(0.95);
    expect(sizeFactor(null, "S")).toBe(1);
    expect(sizeFactor(null, "M")).toBe(1);
    expect(sizeFactor(null, "L")).toBe(1.05);
    expect(sizeFactor(null, "XL")).toBe(1.1);
    expect(sizeFactor(null, "XXL")).toBe(1.2);
  });

  it("debe normalizar minúsculas y espacios en el código de la talla", () => {
    expect(normalizeSize("  xl ")).toBe("XL");
    expect(sizeFactor(null, "  xl ")).toBe(1.1);
    expect(sizeFactor(null, "desconocida")).toBe(1); // 1 por defecto
  });

  it("debe permitir factores personalizados por ficha técnica si existen", () => {
    const customFactors = { XL: 1.15 };
    expect(sizeFactor(customFactors, "XL")).toBe(1.15);
  });

  it("debe sanitizar factores inválidos o negativos", () => {
    const raw = { XS: "0.9", S: -5, XL: 10, invalid: "abc" };
    const clean = sanitizeSizeFactors(raw);

    expect(clean.XS).toBe(0.9);
    expect(clean.S).toBeUndefined(); // rechazado por < 0
    expect(clean.XL).toBeUndefined(); // rechazado por > 3
  });

  it("debe escalar los materiales e insumos de un atado según su talla y número de unidades", () => {
    const materials = [
      { name: "Tela Denim", unit: "m", quantity_per_garment: 1.5, unit_cost_cop: 20000 },
    ];
    // Talla XL (factor 1.1), Atado de 40 unidades
    const result = scaleBundleMaterials(materials, null, "XL", 40);

    expect(result.factor).toBe(1.1);
    // qtyPerGarment = 1.5 * 1.1 = 1.65m
    expect(result.materials[0].quantity_per_garment).toBe(1.65);
    // qtyForBundle = 1.65 * 40 = 66m
    expect(result.materials[0].quantity_for_bundle).toBe(66);
    // costForBundle = 66 * 20000 = 1.320.000 COP
    expect(result.materialsCostForBundle).toBe(1320000);
  });
});
