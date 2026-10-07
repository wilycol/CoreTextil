import { describe, it, expect } from "vitest";

// Función pura extraída de la lógica de liquidación para verificar el Criterio de Ruta Completa
function calculateDeliveredUnitsPure(
  bundles: { id: string; units_count: number }[],
  totalOps: number,
  logs: { bundle_id: string; operation_id: string; units_completed: number }[]
): number {
  if (totalOps === 0) return 0;

  const acc: Record<string, Record<string, number>> = {};
  for (const l of logs) {
    acc[l.bundle_id] ??= {};
    acc[l.bundle_id][l.operation_id] =
      (acc[l.bundle_id][l.operation_id] ?? 0) + Number(l.units_completed);
  }

  let delivered = 0;
  for (const b of bundles) {
    const perOp = acc[b.id] ?? {};
    const opsDone = Object.values(perOp).filter((u) => u >= Number(b.units_count)).length;
    if (opsDone >= totalOps) delivered += Number(b.units_count);
  }
  return delivered;
}

describe("Flujo 6: QA Liquidation & Full Route Completion Rule", () => {
  it("debe retornar 0 piezas entregadas si la prenda no tiene operaciones registradas", () => {
    const bundles = [{ id: "b1", units_count: 50 }];
    const totalOps = 0;
    const logs: { bundle_id: string; operation_id: string; units_completed: number }[] = [];

    const delivered = calculateDeliveredUnitsPure(bundles, totalOps, logs);
    expect(delivered).toBe(0);
  });

  it("NO debe marcar un atado como entregado si falta alguna operación en la ruta (ej. 3 de 4 ops completadas)", () => {
    const bundles = [{ id: "b1", units_count: 50 }];
    const totalOps = 4; // Operaciones: Filete, Plana, Collarín, Presille
    const logs = [
      { bundle_id: "b1", operation_id: "op_filete", units_completed: 50 },
      { bundle_id: "b1", operation_id: "op_plana", units_completed: 50 },
      { bundle_id: "b1", operation_id: "op_collarin", units_completed: 50 },
      // Falta Presille
    ];

    const delivered = calculateDeliveredUnitsPure(bundles, totalOps, logs);
    expect(delivered).toBe(0); // Cero parciales pagadas a la marca antes de tiempo
  });

  it("debe marcar el atado como entregado cuando TODAS las operaciones alcanzaron las 50 unidades", () => {
    const bundles = [{ id: "b1", units_count: 50 }];
    const totalOps = 3;
    const logs = [
      { bundle_id: "b1", operation_id: "op1", units_completed: 50 },
      { bundle_id: "b1", operation_id: "op2", units_completed: 50 },
      { bundle_id: "b1", operation_id: "op3", units_completed: 50 },
    ];

    const delivered = calculateDeliveredUnitsPure(bundles, totalOps, logs);
    expect(delivered).toBe(50);
  });

  it("debe sumar correctamente múltiples registros parciales de varios operarios para el mismo atado", () => {
    const bundles = [{ id: "b1", units_count: 100 }];
    const totalOps = 1;
    const logs = [
      { bundle_id: "b1", operation_id: "op1", units_completed: 40 },
      { bundle_id: "b1", operation_id: "op1", units_completed: 30 },
      { bundle_id: "b1", operation_id: "op1", units_completed: 30 },
    ];

    const delivered = calculateDeliveredUnitsPure(bundles, totalOps, logs);
    expect(delivered).toBe(100);
  });
});
