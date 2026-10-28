// ============================================================
// 📖 Cuaderno Digital V2 — Lógica pura (testeable)
// Extraída de src/app/dashboard/operario/ManualLogbook.tsx para
// poder verificar el taxímetro, la jornada con pausa, los
// períodos de cobro, las novedades y los frecuentes con tests.
//
// Reglas de negocio clave:
// - Pace: comparación justa entre % de units vs meta y % de
//   jornada transcurrida, CONGELADA mientras hay pausa activa.
// - Novedades: registros de confección con valor 0 (no alteran
//   la cuenta del destajo, solo dejan evidencia con timestamp).
// - Cobros: cada día trabajado es PENDIENTE o COBRADO; el
//   período acumula ambas bolsas por separado.
// ============================================================

export type ShiftConfig = {
  shiftStart: string; // "HH:MM"
  shiftEnd: string; // "HH:MM"
  goal: number; // meta personal de piezas del día
  pausedDate: string | null; // YYYY-MM-DD en que hay pausa activa (almuerzo)
};

/** "07:30" -> 450 min. null si el formato es inválido. */
export function parseHM(hm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm?.trim() ?? "");
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

export type PaceArgs = {
  nowMin: number; // minutos desde medianoche (p. ej. 12:00 → 720)
  shiftStart: string;
  shiftEnd: string;
  unitsToday: number;
  goal: number;
  paused: boolean;
};

export type PaceResult = {
  timePct: number; // % de jornada transcurrida (0-100)
  unitsPct: number; // % de la meta logrado (0-100)
  pacePct: number; // diferencia unidades-vs-tiempo (puntos). 0 si paused
  status: "ahead" | "on_track" | "behind" | "paused" | "no_shift";
};

/**
 * Taxímetro del cuaderno. La comparación es justa:
 * mientras la operaria está en pausa (almuerzo) el ritmo NO se
 * juzga (pacePct = 0) → nadie es penalizado por almorzar.
 */
export function computePace(args: PaceArgs): PaceResult {
  const start = parseHM(args.shiftStart);
  const end = parseHM(args.shiftEnd);
  const unitsPct =
    args.goal > 0 ? Math.min(100, Math.round((args.unitsToday / args.goal) * 100)) : 0;

  if (start === null || end === null || end <= start) {
    return { timePct: 0, unitsPct, pacePct: 0, status: args.paused ? "paused" : "no_shift" };
  }

  const shiftLen = end - start;
  // Fuera del horario: satura el tiempo a 0% (antes de empezar) o 100% (ya cerró)
  const clampedNow = Math.max(start, Math.min(end, args.nowMin));
  const timePct = Math.round(((clampedNow - start) / shiftLen) * 100);

  if (args.paused) {
    return { timePct, unitsPct, pacePct: 0, status: "paused" };
  }

  const pacePct = unitsPct - timePct;
  const status: PaceResult["status"] =
    pacePct >= 5 ? "ahead" : pacePct >= -5 ? "on_track" : "behind";
  return { timePct, unitsPct, pacePct, status };
}

/* ---------------------- Períodos de fecha ---------------------- */

export type DateRange = { start: string; end: string }; // YYYY-MM-DD inclusive

/** Lunes de la semana de `date` hasta el propio `date`. */
export function weekRange(dateISO: string): DateRange {
  const d = new Date(`${dateISO}T00:00:00`);
  const day = d.getDay(); // 0 dom … 6 sáb
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return { start: toISO(monday), end: dateISO };
}

/** Quincena natural en curso: 1-15 o 16-fin de mes. */
export function fortnightRange(dateISO: string): DateRange {
  const [y, m] = dateISO.split("-").map(Number);
  if (!y || !m) return { start: dateISO, end: dateISO };
  if (Number(dateISO.slice(8, 10)) <= 15) {
    return { start: `${y}-${String(m).padStart(2, "0")}-01`, end: `${y}-${String(m).padStart(2, "0")}-15` };
  }
  const lastDay = new Date(y, m, 0).getDate();
  return { start: `${y}-${String(m).padStart(2, "0")}-16`, end: `${y}-${String(m).padStart(2, "0")}-${lastDay}` };
}

function toISO(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

/* ---------------------- Totales y cobros ---------------------- */

export type LedgerEntry = {
  rawDate: string; // YYYY-MM-DD
  units: number; // piezas netas (positivas o negativas)
  total: number; // COP (negativo si es resta)
  kind: "production" | "novelty";
};

/** Un día cuenta como trabajado si tiene al menos una anotación (producción o novedad). */
export function isWorkedDay(entries: LedgerEntry[]): boolean {
  return entries.length > 0;
}

export type PeriodTotals = {
  pendingCop: number;
  paidCop: number;
  units: number;
  activeDays: number;
};

/**
 * Totales del período separando lo pendiente y lo ya cobrado.
 * Las novedades no suman ni piezas ni dinero (dejan constancia).
 */
export function periodTotals(
  entries: LedgerEntry[],
  range: DateRange,
  paidMap: Record<string, boolean>
): PeriodTotals {
  let pendingCop = 0;
  let paidCop = 0;
  let units = 0;
  let activeDays = 0;

  const inRange = entries.filter(
    (e) => e.rawDate >= range.start && e.rawDate <= range.end
  );

  const byDate = new Map<string, LedgerEntry[]>();
  for (const e of inRange) {
    const list = byDate.get(e.rawDate) ?? [];
    list.push(e);
    byDate.set(e.rawDate, list);
  }

  for (const [, dayEntries] of byDate) {
    const production = dayEntries.filter((e) => e.kind !== "novelty");
    if (production.length === 0) continue;
    activeDays += 1;
    const dayCop = production.reduce((a, e) => a + e.total, 0);
    const dayUnits = production.reduce((a, e) => a + e.units, 0);
    units += dayUnits;
    if (paidMap[dayEntries[0].rawDate]) paidCop += dayCop;
    else pendingCop += dayCop;
  }

  return { pendingCop, paidCop, units, activeDays };
}

/** Marca como cobrados todos los días trabajados del rango que estaban pendientes. */
export function markRangePaid(
  entries: LedgerEntry[],
  range: DateRange
): { paidMap: Record<string, boolean>; markedCount: number } {
  const dates = new Set(
    entries
      .filter((e) => e.rawDate >= range.start && e.rawDate <= range.end && e.kind !== "novelty")
      .map((e) => e.rawDate)
  );
  const paidMap: Record<string, boolean> = {};
  for (const d of dates) paidMap[d] = true;
  return { paidMap, markedCount: dates.size };
}

/* ---------------------- Novedades ---------------------- */

export type NoveltyType =
  | "missing_piece"
  | "damaged_fabric"
  | "quality_return"
  | "bad_cut"
  | "missing_supplies"
  | "machine_failure"
  | "ticket_error";

export const NOVELTY_TYPES: { value: NoveltyType; label: string }[] = [
  { value: "missing_piece", label: "🧩 Pieza faltante en el atado" },
  { value: "damaged_fabric", label: "✂️ Tela dañada / manchada" },
  { value: "quality_return", label: "🔍 Devolución por control de calidad" },
  { value: "bad_cut", label: "📏 Corte mal dimensionado / descuadre" },
  { value: "missing_supplies", label: "🧵 Faltan hilos, marquillas o insumos" },
  { value: "machine_failure", label: "⚙️ Falla mecánica / máquina fuera de servicio" },
  { value: "ticket_error", label: "🏷️ Diferencia o error en tiquete de atado" },
];

export function noveltyLabel(type: string): string {
  return NOVELTY_TYPES.find((t) => t.value === type)?.label ?? "🚨 Novedad de confección";
}

/* ---------------------- Frecuentes (accesos rápidos) ---------------------- */

export type FrequentOpKey = string; // `${prenda}|${pieza}|${tarifa}|${color}|${tela}`

export type FrequentOp = {
  key: FrequentOpKey;
  prenda: string;
  pieza: string;
  color: string;
  tela: string;
  tarifa: number;
  count: number; // veces anotadas (histórico completo)
};

/** Operaciones más repetidas del histórico, para llenar el formulario con 1 toque. */
export function topFrequentOps(
  entries: { prenda: string; pieza: string; color: string; tela: string; tarifa: number; kind?: string }[],
  limit = 4
): FrequentOp[] {
  const map = new Map<FrequentOpKey, FrequentOp>();
  for (const e of entries) {
    if (e.kind === "novelty") continue;
    const key = `${e.prenda}|${e.pieza}|${e.tarifa}|${e.color}|${e.tela}`;
    const cur = map.get(key) ?? {
      key,
      prenda: e.prenda,
      pieza: e.pieza,
      color: e.color,
      tela: e.tela,
      tarifa: e.tarifa,
      count: 0,
    };
    cur.count += 1;
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}
