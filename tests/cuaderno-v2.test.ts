import { describe, it, expect } from "vitest";
import {
  computePace,
  weekRange,
  fortnightRange,
  periodTotals,
  markRangePaid,
  topFrequentOps,
  noveltyLabel,
  type LedgerEntry,
} from "@/lib/notebook";

/* ============================================================
 🧵 Pruebas V2 del Cuaderno Digital — 3 casos de uso con
 las personas del análisis UX de CoreTextil.

 Persona A: "Doña Marta" (52) — botones grandes, taxímetro, pausa de almuerzo.
 Persona B: "Javier" (24) — cambia de operación sin perder la cuenta.
 Persona C: "Rosa" (taller satélite integrado) — novedades + quincena de cobro.
 ============================================================ */

function prod(rawDate: string, units: number, tarifa: number): LedgerEntry {
  return { rawDate, units, total: tarifa * units, kind: "production" };
}

function novelty(rawDate: string): LedgerEntry {
  return { rawDate, units: 0, total: 0, kind: "novelty" };
}

describe("Cuaderno V2 · Persona A — Doña Marta: taxímetro, pausa y corrección táctil", () => {
  it("Caso 1 · ritmo ideal: 208 de 400 piezas a las 12:00 en un turno 07:00–17:00 = +2% sobre el ritmo", () => {
    const pace = computePace({
      nowMin: 12 * 60, // 12:00
      shiftStart: "07:00",
      shiftEnd: "17:00",
      unitsToday: 208,
      goal: 400,
      paused: false,
    });
    expect(pace.timePct).toBe(50); // mitad del turno transcurrida
    expect(pace.unitsPct).toBe(52); // 208/400 = 52 % de la meta
    expect(pace.pacePct).toBe(2); // 52 - 50 = +2 puntos
    expect(pace.status).toBe("on_track");
  });

  it("Caso 1 · pausa de almuerzo: el ritmo NO se juzga mientras Come Marta (justo, sin castigo)", () => {
    const pace = computePace({
      nowMin: 12 * 60 + 5,
      shiftStart: "07:00",
      shiftEnd: "17:00",
      unitsToday: 208,
      goal: 400,
      paused: true,
    });
    expect(pace.status).toBe("paused");
    expect(pace.pacePct).toBe(0);
  });

  it("Caso 2 · corrección ágil: tocó +100 por error, corrige con −10 → quedan 90 piezas bien contadas", () => {
    const tarifa = 600;
    const entries = [prod("2026-10-22", 100, tarifa), prod("2026-10-22", -10, tarifa)];

    const day = periodTotals(entries, { start: "2026-10-22", end: "2026-10-22" }, {});
    expect(day.units).toBe(90);
    expect(day.pendingCop).toBe(90 * 600); // 54.000
    expect(day.activeDays).toBe(1);
  });

  it("Caso 2 · la resta nunca deja el día en negativo acumulado sin advertencia clara", () => {
    const entries = [prod("2026-10-22", 5, 600), prod("2026-10-22", -10, 600)];
    const day = periodTotals(entries, { start: "2026-10-22", end: "2026-10-22" }, {});
    expect(day.units).toBe(-5);
    expect(day.pendingCop).toBe(-3000);
    // El RN del negocio es: el día sigue contando como trabajado, y la UI pinta la resta en rojo
  });
});

describe("Cuaderno V2 · Persona B — Javier: cambiar de operación sin perder la cuenta", () => {
  const JAVIER_LOGS: LedgerEntry[] = [
    prod("2026-10-20", 50, 600), // Camisa Polo → Pegar cuello
    prod("2026-10-20", 108, 600), // sigue en el mismo lote
    prod("2026-10-20", 120, 683), // Jean → presillar bolsillos
    prod("2026-10-21", 200, 550), // Franela → dobladillo
    prod("2026-10-21", 60, 600), // vuelve al cuello del polo
  ];

  it("Caso 1 · semana completa de Javier: unidades y dinero para la cuenta de cobro", () => {
    const { start, end } = weekRange("2026-10-22");
    expect(start).toBe("2026-10-19"); // lunes
    const totals = periodTotals(JAVIER_LOGS, { start, end }, {});
    expect(totals.units).toBe(50 + 108 + 120 + 200 + 60);
    expect(totals.pendingCop).toBe(
      50 * 600 + 108 * 600 + 120 * 683 + 200 * 550 + 60 * 600
    );
    expect(totals.activeDays).toBe(2);
    expect(totals.paidCop).toBe(0); // aún nada cobrado
  });

  it("Caso 2 · frecuentes: sus operaciones habituales suben a la lista táctil", () => {
    const freq = topFrequentOps([
      { prenda: "Camiseta Polo", pieza: "🧵 Proceso — Pegar cuello", color: "Negro", tela: "Algodón", tarifa: 600 },
      { prenda: "Camiseta Polo", pieza: "🧵 Proceso — Pegar cuello", color: "Negro", tela: "Algodón", tarifa: 600 },
      { prenda: "Camiseta Polo", pieza: "🧵 Proceso — Pegar cuello", color: "Negro", tela: "Algodón", tarifa: 600 },
      { prenda: "Pantalón Jean", pieza: "🧵 Proceso — Presille (refuerzos)", color: "Azul", tela: "Dril", tarifa: 683 },
      { prenda: "Pantalón Jean", pieza: "🧵 Proceso — Presille (refuerzos)", color: "Azul", tela: "Dril", tarifa: 683 },
    ]);
    expect(freq[0].pieza).toContain("Pegar cuello");
    expect(freq[0].count).toBe(3);
    expect(freq[0].tarifa).toBe(600); // 1 toque llena el formulario con esta tarifa
  });

  it("Caso 3 · viernes de pago: marcar la semana como cobrada traslada la bolsa pendiente a cobrado", () => {
    const { start, end } = weekRange("2026-10-22");
    const paid = markRangePaid(JAVIER_LOGS, { start, end });
    expect(paid.markedCount).toBe(2); // 2 días con trabajo

    const after = periodTotals(JAVIER_LOGS, { start, end }, paid.paidMap);
    expect(after.pendingCop).toBe(0);
    expect(after.paidCop).toBe(50 * 600 + 108 * 600 + 120 * 683 + 200 * 550 + 60 * 600);
  });
});

describe("Cuaderno V2 · Persona C — Rosa (taller integrado): novedades y quincena", () => {
  const ROSA_LOGS: LedgerEntry[] = [
    prod("2026-10-16", 120, 750), // Atado #104 pantalón chino
    prod("2026-10-17", 100, 600),
    prod("2026-10-18", 100, 600),
    prod("2026-10-20", 40, 683), // Atadoя #205 del corte nuevo
    prod("2026-10-22", 60, 600),
    novelty("2026-10-18"), // reportó mangas mal cortadas ese día
  ];

  it("Caso 1 · la novedad deja constancia pero no altera el destajo (ni dinero ni piezas)", () => {
    const totals = periodTotals(ROSA_LOGS.slice(0, 4), fortnightRange("2026-10-18"), {});
    // prod(16)=90000, prod(17)=60000, prod(18)=60000, prod(20)=27320 + la novedad suma $0
    expect(totals.pendingCop).toBe(90_000 + 60_000 + 60_000 + 27_320);
    expect(totals.units).toBe(120 + 100 + 100 + 40); // la novedad no suma piezas
    expect(totals.activeDays).toBe(4); // 16, 17, 18 y 20 (novedad sola no cuenta como día de cobro)
  });

  it("Caso 2 · quincena natural del 20 → 16 al 31 de octubre", () => {
    const range = fortnightRange("2026-10-20");
    expect(range).toEqual({ start: "2026-10-16", end: "2026-10-31" });
  });

  it("Caso 3 · quincena cerrada: días pagados se separan de los pendientes sin doble cobro", () => {
    const range = fortnightRange("2026-10-20"); // 16–31
    const entries = ROSA_LOGS.filter((e) => e.kind === "production" && typeof e.total === "number").map(
      (e) => ({ ...e, total: e.total as number })
    );
    // Paga el 16 y el 17; el resto queda pendiente
    const paidMap = markRangePaid(
      entries.filter((e) => e.rawDate <= "2026-10-17"),
      range
    ).paidMap;

    const totals = periodTotals(entries, range, paidMap);
    expect(totals.paidCop).toBe(90_000 + 60_000);
    expect(totals.pendingCop).toBe(60_000 + 683 * 40 + 60 * 600); // 18 + 20 + 22
    expect(totals.activeDays).toBe(5); // 16, 17, 18, 20 y 22 (todos dentro de la quincena)
  });

  it("las novedades nunca aparecen como operaciones frecuentes", () => {
    const freq = topFrequentOps([
      { prenda: "🚨 Novedad de confección", pieza: "⚙️ Falla mecánica", color: "A", tela: "A", tarifa: 0, kind: "novelty" },
      { prenda: "Camiseta Polo", pieza: "🧵 Proceso — Pegar cuello", color: "A", tela: "A", tarifa: 600 },
    ]);
    expect(freq).toHaveLength(1);
    expect(freq[0].prenda).toBe("Camiseta Polo");
  });

  it("las novedades tienen etiqueta legible para el reporte en el historial", () => {
    expect(noveltyLabel("damaged_fabric")).toContain("Tela dañada");
    expect(noveltyLabel("desconocido")).toContain("Novedad");
  });
});

describe("Cuaderno V2 · taxímetro robusto (cualquier persona)", () => {
  it("fuera de horario no rompe: antes del turno 0 \% y después del cierre 100 %", () => {
    const early = computePace({ nowMin: 5 * 60 + 30, shiftStart: "07:00", shiftEnd: "17:00", unitsToday: 0, goal: 400, paused: false });
    const late = computePace({ nowMin: 22 * 60, shiftStart: "07:00", shiftEnd: "17:00", unitsToday: 208, goal: 400, paused: false });
    expect(early.timePct).toBe(0);
    expect(late.timePct).toBe(100);
  });

  it("horario inválido o invertido → estado no_shift sin NaN", () => {
    const broken = computePace({ nowMin: 720, shiftStart: "18:00", shiftEnd: "06:00", unitsToday: 10, goal: 100, paused: false });
    const invalid = computePace({ nowMin: 720, shiftStart: "zz", shiftEnd: "17:00", unitsToday: 10, goal: 100, paused: false });
    expect(broken.status).toBe("no_shift");
    expect(invalid.status).toBe("no_shift");
  });
});
