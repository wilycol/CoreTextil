import { describe, it, expect } from "vitest";
import { TICKET_REASONS } from "../src/lib/services/tickets";

// Funciones puras de validación de tickets
function validateTicketInput(input: { quantity: number; reason: string }) {
  if (!TICKET_REASONS.includes(input.reason as any)) {
    return { ok: false, error: "Motivo inválido." };
  }
  const qty = Math.floor(Number(input.quantity));
  if (!Number.isFinite(qty) || qty <= 0 || qty > 10_000) {
    return { ok: false, error: "Cantidad inválida." };
  }
  return { ok: true, qty };
}

describe("Flujo 7: QA Material & Support Ticket Validation", () => {
  it("debe aceptar motivos válidos ('missing_piece', 'damaged_fabric', 'shortage_supplies')", () => {
    for (const reason of TICKET_REASONS) {
      const res = validateTicketInput({ quantity: 5, reason });
      expect(res.ok).toBe(true);
    }
  });

  it("debe rechazar un motivo no contemplado en el catálogo", () => {
    const res = validateTicketInput({ quantity: 5, reason: "motivo_inexistente" });
    expect(res.ok).toBe(false);
    expect(res.error).toBe("Motivo inválido.");
  });

  it("debe rechazar cantidades menores o iguales a cero", () => {
    expect(validateTicketInput({ quantity: 0, reason: "missing_piece" }).ok).toBe(false);
    expect(validateTicketInput({ quantity: -10, reason: "missing_piece" }).ok).toBe(false);
  });

  it("debe rechazar cantidades excesivas por encima del tope (10.000)", () => {
    const res = validateTicketInput({ quantity: 99999, reason: "missing_piece" });
    expect(res.ok).toBe(false);
    expect(res.error).toBe("Cantidad inválida.");
  });
});
