import { describe, it, expect } from "vitest";
import { BRAND_PLANS, SATELLITE_PLANS } from "../src/lib/branding";

describe("Flujo 1 & Landing: QA Commercial Plans & Pricing Catalog", () => {
  it("debe contener el plan piloto de 60 días con costo $0 para marcas", () => {
    const piloto = BRAND_PLANS.find((p) => p.id === "piloto");
    expect(piloto).toBeDefined();
    expect(piloto?.priceCop).toBe(0);
    expect(piloto?.priceLabel).toBe("$0");
  });

  it("debe contener el plan Satélite Monomarca gratis para siempre", () => {
    const mono = SATELLITE_PLANS.find((p) => p.id === "monomarca");
    expect(mono).toBeDefined();
    expect(mono?.priceCop).toBe(0);
  });

  it("debe destacar exactamente un plan sugerido para marcas (Marca Pro)", () => {
    const highlighted = BRAND_PLANS.filter((p) => p.highlight);
    expect(highlighted.length).toBe(1);
    expect(highlighted[0].id).toBe("pro");
  });
});
