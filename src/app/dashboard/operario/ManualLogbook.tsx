"use client";

// ============================================================
// 📖 Cuaderno Digital V2 (módulo aparte, client-side)
// Rediseño según prototipo cuaderno_digital_operario_coretextil.html
// y análisis UX «Perspectiva del Operario» (docs/CUADERNO_DIGITAL_V2.md).
//
// Novedades V2 vs la V1:
// - 🚕 Taxímetro: ganado/piezas hoy + meta + jornada + pausa (almuerzo)
//   con ritmo justo (no penaliza la pausa).
// - ✅ Corrección táctil: -1 / -10 al instante, sin borrar la cuenta.
// - 🔁 Frecuentes: operaciones habituales tocables (1 toque = formulario listo).
// - 📅 Calendario de cobro: días PENDIENTES / COBRADOS, marcar período,
//   cuenta de cobro por WhatsApp con desglose y ya-cobrado.
// - 🚨 Novedades de confección: quedan registradas en el diario (evidencia)
//   y se reportan por WhatsApp — valor 0, no alteran el destajo.
//
// Sigue siendo el formulario universal (cualquier prenda textil) con
// prenda + pieza/proceso + color + tela + foto + tarifa, y sumar/restar.
// storageKey parametrizable: operario personal, dueño del taller, etc.
// ============================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { formatCop } from "@/lib/cop";
import {
  computePace,
  fortnightRange,
  markRangePaid,
  noveltyLabel,
  NOVELTY_TYPES,
  periodTotals,
  topFrequentOps,
  weekRange,
  type ShiftConfig,
} from "@/lib/notebook";

export function Tooltip({ text, label = "?" }: { text: string; label?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex items-center ml-1.5 align-middle">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border border-cyan-500/40 bg-slate-800 text-[10px] font-bold text-cyan-400 transition-colors hover:border-cyan-300 hover:bg-cyan-950 focus:outline-none"
        aria-label="Ver explicación de este campo"
      >
        {label}
      </button>

      {open && (
        <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 block w-60 -translate-x-1/2 rounded-xl border border-cyan-500/50 bg-slate-900/95 p-3 text-left text-[11px] font-normal leading-relaxed text-slate-200 shadow-2xl shadow-cyan-950/90 backdrop-blur">
          <span className="mb-1 block font-bold text-cyan-300">💡 ¿Para qué sirve?</span>
          {text}
        </span>
      )}
    </span>
  );
}

/* --------- Catálogo global de prendas y piezas (franela, shorts, pantalones…) --------- */

const GARMENT_PRESETS = [
  "Franela / Blusa",
  "Camiseta Polo",
  "Camiseta Básica",
  "Camisa Manga Larga",
  "Pantalón Jean",
  "Short / Bermudas",
  "Buzo / Sudadera",
  "Leggins",
  "Pijama / Conjunto",
  "Uniforme Escolar",
  "Ropa Deportiva",
  "✏️ Otra prenda (personalizada)...",
];

const PIECE_PRESETS = [
  "🧩 Piezas cortadas — Manga",
  "🧩 Piezas cortadas — Cuello",
  "🧩 Piezas cortadas — Frente/Trasera",
  "🧩 Piezas cortadas — Bolsillo",
  "🧩 Piezas cortadas — Pretina/Cintura",
  "🧵 Proceso — Filete (cerrar costados)",
  "🧵 Proceso — Plana (unir/pisar)",
  "🧵 Proceso — Collarín (ruedo/dobladillo)",
  "🧵 Proceso — Presille (refuerzos)",
  "🧵 Proceso — Pegar mangas",
  "🧵 Proceso — Pegar cuello",
  "🧵 Proceso — Pegar resorte/pretina",
  "🧵 Proceso — Pegar bolsillos",
  "👕 Prenda completa (ensamblado final)",
  "✏️ Otro (personalizado)...",
];

export type ManualLog = {
  id: string;
  workType: "process" | "full";
  prenda: string;
  pieza: string;
  color: string;
  tela: string;
  operacion: string;
  tarifa: number;
  units: number; // puede ser negativo (ajuste/devolución)
  total: number; // tarifa * units (negativo si es resta)
  formattedDate: string;
  rawDate: string; // YYYY-MM-DD
  kind: "production" | "novelty";
  noveltyType?: string;
  image?: string | null;
};

type Props = {
  storageKey: string;
  variant: "personal" | "own";
  title: string;
  subtitle: string;
};

/* --------- Persistencia (con migración de claves antiguas) --------- */

function loadLogs(storageKey: string): ManualLog[] {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) return (JSON.parse(saved) as (ManualLog & { kind?: string })[]).map((l) => ({
      ...l,
      kind: l.kind === "novelty" ? "novelty" : "production",
    }));
    const legacy = localStorage.getItem("coretextil_personal_logs");
    if (legacy) {
      const migrated = (JSON.parse(legacy) as (ManualLog & { kind?: string })[]).map((l) => ({
        ...l,
        kind: l.kind === "novelty" ? ("novelty" as const) : ("production" as const),
      }));
      localStorage.setItem(storageKey, JSON.stringify(migrated));
      return migrated;
    }
  } catch {}
  return [];
}

function persistLogs(storageKey: string, logs: ManualLog[]) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(logs));
  } catch {
    // Cuota llena: si hubo imagen, reintenta sin las fotos más antiguas
    const trimmed = logs.map((l, i) => (i > 3 ? { ...l, image: null } : l));
    try {
      localStorage.setItem(storageKey, JSON.stringify(trimmed));
    } catch {}
  }
}

const DEFAULT_SHIFT: ShiftConfig = {
  shiftStart: "07:00",
  shiftEnd: "17:00",
  goal: 400,
  pausedDate: null,
};

function loadShift(shiftKey: string): ShiftConfig {
  try {
    const saved = localStorage.getItem(shiftKey);
    if (saved) {
      const parsed = JSON.parse(saved) as ShiftConfig;
      // Reset de pausa: la pausa solo vive durante el día en que se activó
      const today = new Date().toISOString().slice(0, 10);
      if (parsed.pausedDate && parsed.pausedDate !== today) parsed.pausedDate = null;
      return { ...DEFAULT_SHIFT, ...parsed };
    }
  } catch {}
  return DEFAULT_SHIFT;
}

function persistShift(shiftKey: string, shift: ShiftConfig) {
  try {
    localStorage.setItem(shiftKey, JSON.stringify(shift));
  } catch {}
}

function loadPaid(paidKey: string): Record<string, boolean> {
  try {
    const saved = localStorage.getItem(paidKey);
    if (saved) return JSON.parse(saved) as Record<string, boolean>;
  } catch {}
  return {};
}

function persistPaid(paidKey: string, paidMap: Record<string, boolean>) {
  try {
    localStorage.setItem(paidKey, JSON.stringify(paidMap));
  } catch {}
}

/* --------- Reloj en formato legible --------- */

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const MONTHS_LONG = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function stamp(d: Date) {
  return `${DAYS[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]} ${d.getFullYear()} · ${String(
    d.getHours()
  ).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const CAL_TABS = [
  { key: "diario", icon: "📝", label: "Diario" },
  { key: "calendario", icon: "📅", label: "Calendario / Cobro" },
  { key: "historial", icon: "🕐", label: "Historial" },
] as const;

type TabKey = (typeof CAL_TABS)[number]["key"];

export default function ManualLogbook({ storageKey, variant, title, subtitle }: Props) {
  const [workType, setWorkType] = useState<"process" | "full">("process");
  const [prenda, setPrenda] = useState("Franela / Blusa");
  const [customPrenda, setCustomPrenda] = useState("");
  const [pieza, setPieza] = useState(PIECE_PRESETS[0]);
  const [customPieza, setCustomPieza] = useState("");
  const [color, setColor] = useState("Azul");
  const [tela, setTela] = useState("Algodón");
  const [tarifa, setTarifa] = useState("600");
  const [customQty, setCustomQty] = useState("10");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [logs, setLogs] = useState<ManualLog[]>(() =>
    typeof window === "undefined" ? [] : loadLogs(storageKey)
  );
  const [compactView, setCompactView] = useState(false);

  /* --------- V2: pestañas internas, jornada/pausa, cobros, novedades --------- */

  const [view, setView] = useState<TabKey>("diario");
  const shiftKey = `${storageKey}::shift`;
  const paidKey = `${storageKey}::paid`;
  const [shift, setShiftState] = useState<ShiftConfig>(() =>
    typeof window === "undefined" ? DEFAULT_SHIFT : loadShift(shiftKey)
  );
  const [paidMap, setPaidMap] = useState<Record<string, boolean>>(() =>
    typeof window === "undefined" ? {} : loadPaid(paidKey)
  );
  const [shiftModal, setShiftModal] = useState(false);
  const [draftShift, setDraftShift] = useState<ShiftConfig>(shift);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [dayFilter, setDayFilter] = useState<string | null>(null); // historial filtrado por día
  const formRef = useRef<HTMLDivElement>(null);

  // El taxímetro respira: re-render cada 30 s para el % de jornada
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const todayStr = new Date(nowTick).toISOString().slice(0, 10);
  const isPaused = shift.pausedDate === todayStr;

  function setShift(next: ShiftConfig) {
    setShiftState(next);
    persistShift(shiftKey, next);
  }

  function setPaid(next: Record<string, boolean>) {
    setPaidMap(next);
    persistPaid(paidKey, next);
  }

  /* --------- Liquidación por período (rango = [startDate, endDate]) --------- */

  function getStartOfWeek() {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff)).toISOString().slice(0, 10);
  }

  const [startDate, setStartDate] = useState<string>(getStartOfWeek());
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [periodPreset, setPeriodPreset] = useState<"today" | "week" | "fortnight" | "custom">("week");

  function applyPeriodPreset(preset: "today" | "week" | "fortnight" | "custom") {
    setPeriodPreset(preset);
    const now = new Date();
    if (preset === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "week") {
      setStartDate(weekRange(todayStr).start);
      setEndDate(todayStr);
    } else if (preset === "fortnight") {
      const range = fortnightRange(todayStr);
      setStartDate(range.start);
      setEndDate(range.end);
    }
  }

  const periodLogs = useMemo(
    () =>
      logs.filter((l) => {
        if (!l.rawDate) return true;
        return l.rawDate >= startDate && l.rawDate <= endDate;
      }),
    [logs, startDate, endDate]
  );

  const periodLedger = useMemo(() => {
    const prod = periodTotals(periodLogs, { start: startDate, end: endDate }, paidMap);
    return prod;
  }, [periodLogs, startDate, endDate, paidMap]);

  const todayLogs = useMemo(() => logs.filter((l) => l.rawDate === todayStr), [logs, todayStr]);
  const walletToday = useMemo(
    () => todayLogs.filter((l) => l.kind !== "novelty").reduce((acc, l) => acc + l.total, 0),
    [todayLogs]
  );
  const piecesToday = useMemo(
    () => todayLogs.filter((l) => l.kind !== "novelty").reduce((acc, l) => acc + l.units, 0),
    [todayLogs]
  );

  const pace = useMemo(() => {
    const now = new Date(nowTick);
    return computePace({
      nowMin: now.getHours() * 60 + now.getMinutes(),
      shiftStart: shift.shiftStart,
      shiftEnd: shift.shiftEnd,
      unitsToday: piecesToday,
      goal: shift.goal,
      paused: isPaused,
    });
  }, [nowTick, shift, piecesToday, isPaused]);

  const frequentOps = useMemo(() => topFrequentOps(logs, 4), [logs]);

  /* --------- Foto: redimensiona antes de guardar (cuota del navegador) --------- */

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const MAX = 320;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
        setImagePreview(canvas.toDataURL("image/jpeg", 0.6));
      };
      img.onerror = () => setImagePreview(reader.result as string);
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  /* --------- Registro con signo (sumar / restar / novedad) --------- */

  function addLog(units: number, novelty?: { type: string; detail: string }) {
    const rate = parseFloat(tarifa) || 0;
    if (novelty) {
      const now = new Date();
      const newLog: ManualLog = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        workType: "process",
        prenda: "🚨 Novedad de confección",
        pieza: noveltyLabel(novelty.type),
        color: color.trim() || "Estándar",
        tela: tela.trim() || "—",
        operacion: noveltyLabel(novelty.type),
        tarifa: 0,
        units: 0,
        total: 0,
        formattedDate: stamp(now),
        rawDate: todayStr,
        kind: "novelty",
        noveltyType: novelty.type,
        image: imagePreview,
      };
      const updated = [newLog, ...logs];
      setLogs(updated);
      persistLogs(storageKey, updated);
      return;
    }
    if (!Number.isFinite(units) || units === 0 || rate <= 0) return;

    const selectedPrenda =
      prenda === GARMENT_PRESETS[GARMENT_PRESETS.length - 1]
        ? customPrenda.trim() || "Prenda general"
        : prenda;
    const selectedPieza =
      pieza === PIECE_PRESETS[PIECE_PRESETS.length - 1]
        ? customPieza.trim() || "Proceso general"
        : pieza;

    const now = new Date();
    const newLog: ManualLog = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      workType,
      prenda: selectedPrenda,
      pieza: selectedPieza,
      color: color.trim() || "Estándar",
      tela: tela.trim() || "—",
      operacion: selectedPieza,
      tarifa: rate,
      units,
      total: Math.round(rate * units),
      formattedDate: stamp(now),
      rawDate: todayStr,
      kind: "production",
      image: imagePreview,
    };

    const updated = [newLog, ...logs];
    setLogs(updated);
    persistLogs(storageKey, updated);
    setImagePreview(null);
  }

  function updateLogUnits(id: string, units: number) {
    if (!Number.isFinite(units) || units === 0) return;
    setLogs((prev) => {
      const next = prev.map((l) =>
        l.kind === "production" && l.id === id
          ? { ...l, units, total: Math.round(l.tarifa * units) }
          : l
      );
      persistLogs(storageKey, next);
      return next;
    });
  }

  function deleteLog(id: string) {
    if (!confirm("¿Eliminar esta anotación de tu cuaderno manual?")) return;
    setLogs((prev) => {
      const next = prev.filter((l) => l.id !== id);
      persistLogs(storageKey, next);
      return next;
    });
  }

  function toggleDayPaid(dateKey: string) {
    setPaid({ ...paidMap, [dateKey]: !paidMap[dateKey] });
    setView("calendario");
  }

  function onMarkRangePaid() {
    const { paidMap: updates, markedCount } = markRangePaid(periodLogs, {
      start: startDate,
      end: endDate,
    });
    if (markedCount === 0) return; // nada pendiente en este rango
    setPaid({ ...paidMap, ...updates });
  }

  function clearLogs() {
    if (!confirm("¿Deseas borrar TODAS las anotaciones de este cuaderno manual?")) return;
    setLogs([]);
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  }

  /* --------- Frecuentes: 1 toque llena el formulario --------- */

  function applyFrequent(op: ReturnType<typeof topFrequentOps>[number]) {
    if (GARMENT_PRESETS.includes(op.prenda)) {
      setPrenda(op.prenda);
    } else {
      setPrenda(GARMENT_PRESETS[GARMENT_PRESETS.length - 1]);
      setCustomPrenda(op.prenda);
    }
    const matchesPieza = PIECE_PRESETS.some((p) => op.pieza.startsWith(p.split("—")[0].trim()));
    const exactPieza = PIECE_PRESETS.find((p) => p === op.pieza);
    if (exactPieza) setPieza(exactPieza);
    else if (!matchesPieza) {
      setPieza(PIECE_PRESETS[PIECE_PRESETS.length - 1]);
      setCustomPieza(op.pieza);
    } else setPieza(op.pieza);
    setColor(op.color);
    setTela(op.tela);
    setTarifa(String(op.tarifa));
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* --------- Cuenta de cobro WhatsApp (V2: incluye ya cobrado) --------- */

  function getLiquidationWhatsAppUrl() {
    let breakdown = "";
    periodLogs
      .filter((l) => l.kind !== "novelty")
      .forEach((l, i) => {
        breakdown += `${i + 1}. ${l.prenda} · ${l.pieza} (${l.color}, ${l.tela}): ${l.units} uds × ${formatCop(
          l.tarifa
        )} = ${formatCop(l.total)}\n`;
      });

    const text =
      `🧾 *CUENTA DE COBRO DE DESTAJO — ${title}*\n` +
      `📅 Período: ${startDate} al ${endDate}\n\n` +
      `💰 *TOTAL PENDIENTE:* ${formatCop(periodLedger.pendingCop)}\n` +
      (periodLedger.paidCop > 0
        ? `✅ *Ya cobrado en este rango:* ${formatCop(periodLedger.paidCop)}\n`
        : "") +
      `🔢 *Piezas netas:* ${periodLedger.units} uds\n` +
      `📋 *Días con trabajo:* ${periodLedger.activeDays}\n\n` +
      `📌 *DESGLOSE:*\n` +
      breakdown +
      `\n--- *Generado con el Cuaderno Digital de CoreTextil: https://coretextil.vercel.app`;

    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  }

  function getTicketWhatsAppUrl(ticketCode: string, reasonLabel: string, qty: string, notes: string) {
    const now = new Date();
    const text =
      `🚨 *TICKET DE NOVEDAD DE CONFECCIÓN* (${ticketCode})\n\n` +
      `📌 *Prenda:* ${prenda === GARMENT_PRESETS[GARMENT_PRESETS.length - 1] ? customPrenda || "Prenda general" : prenda} \n` +
      `📋 *Motivo:* ${reasonLabel}\n` +
      `🔢 *Cantidad afectada:* ${qty} uds \n` +
      `📅 *Fecha:* ${stamp(now)}\n` +
      `📝 *Observaciones:* ${notes || "Sin observaciones"} \n\n` +
      `--- *Generado desde CoreTextil: https://coretextil.vercel.app`;
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  }

  const isPersonal = variant === "personal";

  /* --------- Barra de pestañas V2 --------- */

  function tabClass(key: TabKey) {
    return key === view
      ? "flex-1 rounded-xl bg-cyan-500 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-950 shadow-md"
      : "flex-1 rounded-xl py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 transition hover:text-slate-200";
  }

  return (
    <div className="space-y-6">
      {/* ⟳ PESTAÑAS INTERNAS DEL CUADERNO */}
      <div className="flex gap-1 rounded-2xl border border-slate-800 bg-slate-900/70 p-1.5">
        {CAL_TABS.map((t) => (
          <button key={t.key} onClick={() => setView(t.key)} className={tabClass(t.key)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ======================= 📝 VISTA DIARIO ======================= */}
      {view === "diario" && (
        <div className="space-y-6">
          {/* 🚕 TAXÍMETRO */}
          <div
            className={`rounded-2xl border p-5 backdrop-blur ${
              isPersonal ? "border-cyan-500/30 bg-cyan-950/40" : "border-indigo-500/30 bg-indigo-950/40"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-100">{title}</h2>
                <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setDraftShift(shift);
                    setShiftModal(true);
                  }}
                  className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-cyan-300 transition hover:bg-slate-800"
                  title="Configurar jornada y meta"
                >
                  🕐 Meta: {shift.goal} uds
                </button>
                <button
                  onClick={() =>
                    setShift(shift.pausedDate === todayStr ? { ...shift, pausedDate: null } : { ...shift, pausedDate: todayStr })
                  }
                  className={`rounded-xl border px-3 py-1.5 text-xs font-extrabold transition ${
                    isPaused
                      ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                      : "border-amber-500/40 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                  }`}
                >
                  {isPaused ? "▶️ Reanudar turno" : "⏸️ Pausar (Almuerzo)"}
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 rounded-xl border border-slate-800 bg-slate-900/80 p-4">
              <div>
                <p className="flex items-center text-xs text-slate-400">
                  Ganado / Ajustado hoy
                  <Tooltip text="Suma de (tarifa × piezas) de todos los registros de hoy, ya con las restas aplicadas." />
                </p>
                <p className={`text-3xl font-extrabold ${walletToday < 0 ? "text-red-400" : "text-emerald-400"}`}>
                  {formatCop(walletToday)}
                </p>
              </div>
              <div>
                <p className="flex items-center text-xs text-slate-400">
                  Piezas contadas hoy
                  <Tooltip text="Neto de piezas de hoy: sumas menos restas (faltantes o devoluciones de calidad)." />
                </p>
                <p className="text-3xl font-extrabold text-cyan-300">
                  {piecesToday} <span className="text-sm font-normal text-slate-400">uds</span>
                </p>
              </div>
            </div>

            {/* Coach de ritmo */}
            <div className="mt-3 space-y-2 border-t border-slate-800 pt-3">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>
                  Turno: <strong className="text-slate-200">{shift.shiftStart} – {shift.shiftEnd}</strong>
                </span>
                <span
                  className={`font-bold ${
                    isPaused ? "text-amber-300" : pace.status === "ahead"
                      ? "text-emerald-400"
                      : pace.status === "behind"
                        ? "text-amber-400"
                        : "text-cyan-300"
                  }`}
                >
                  {isPaused ? (
                    "⏸️ En pausa — el tiempo no se cuenta"
                  ) : pace.status === "no_shift" ? (
                    "Jornada sin horario definido"
                  ) : pace.status === "ahead" ? (
                    `⚡ Vas +${pace.pacePct}% sobre el ritmo`
                  ) : pace.status === "behind" ? (
                    `🐢 Vas ${Math.abs(pace.pacePct)}% bajo el ritmo`
                  ) : (
                    "👍 Vas justo a ritmo"
                  )}
                </span>
              </div>
              <div className="relative h-3.5 overflow-hidden rounded-full border border-slate-700 bg-slate-950">
                <div
                  className="absolute bottom-0 top-0 z-0 bg-cyan-500/30 transition-all duration-500"
                  style={{ width: `${pace.timePct}%` }}
                />
                <div
                  className="relative z-10 h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-500"
                  style={{ width: `${pace.unitsPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>
                  Tiempo: <strong className="text-slate-300">{pace.timePct}%</strong> · Meta cumplida:{" "}
                  <strong className="text-slate-300">{pace.unitsPct}%</strong>
                </span>
                <span className="text-cyan-300">Meta: {shift.goal} uds</span>
              </div>
            </div>

            {isPersonal && (
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={getTicketWhatsAppUrlSafe()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-amber-500/40 bg-amber-950/60 px-4 py-2 text-xs font-bold text-amber-300 transition hover:bg-amber-900"
                >
                  🚨 Generar Ticket WhatsApp
                </a>
                <Tooltip text="Reporte formal con código único por WhatsApp para notificar piezas faltantes, tela defectuosa o devoluciones de calidad a tu taller o marca." />
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                    "Estoy usando el Cuaderno Digital de CoreTextil para llevar mis cuentas de destajo. Registra tu taller gratis en https://coretextil.vercel.app y liquida la nómina a 1 clic."
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-950/40 transition hover:bg-emerald-500"
                >
                  📲 Invitar a mi taller satélite
                </a>
              </div>
            )}
          </div>

          {/* 🔁 FRECUENTES */}
          {frequentOps.length > 0 && (
            <div className="space-y-3">
              <p className="px-1 text-xs font-semibold text-slate-400">
                MIS OPERACIONES HABITUALES (TOCA PARA SUMAR):
                <Tooltip text="Se arman solas con tu histórico: toca la tarjeta y el formulario queda listo con la misma prenda, proceso, color, tela y tarifa. Solo marca las piezas." />
              </p>
              <div className="grid grid-cols-2 gap-3">
                {frequentOps.map((op) => (
                  <button
                    key={op.key}
                    onClick={() => applyFrequent(op)}
                    className="btn-tap-active space-y-1 rounded-2xl border border-slate-700 bg-slate-800/90 p-3 text-left transition hover:border-emerald-500/50 active:scale-95"
                  >
                    <span className="block text-[10px] font-bold uppercase text-cyan-400">⭐ {op.count} anotaciones</span>
                    <p className="truncate text-xs font-bold text-slate-100">{op.prenda}</p>
                    <p className="truncate text-[11px] text-slate-300">{op.pieza.replace(/^(🧩|🧵|👕)\s*/, "")}</p>
                    <p className="text-xs font-extrabold text-emerald-400">
                      {formatCop(op.tarifa)} <span className="text-[10px] font-normal text-slate-400">/ud</span>
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 🌎 FORMULARIO GLOBAL */}
          <div ref={formRef} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 scroll-mt-24">
            {/* ... (formulario global V2 = igual a V1, ver abajo) ... */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center font-bold text-slate-200">
                🌎 Registrar producción (formulario global)
                <Tooltip text="Sirve para CUALQUIER prenda textil: franela, camiseta, pantalón, short, buzo… Elige la prenda o escribe la tuya, selecciona la pieza/proceso, el color y la tela." />
              </h3>
              <div className="flex items-center gap-1">
                <div className="flex rounded-lg border border-slate-800 bg-slate-950 p-1">
                  <button
                    onClick={() => setWorkType("process")}
                    className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                      workType === "process" ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    🧵 Por pieza / proceso
                  </button>
                  <button
                    onClick={() => setWorkType("full")}
                    className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                      workType === "full" ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    👕 Prenda completa
                  </button>
                </div>
                <Tooltip text="«Por pieza/proceso»: te pagan por operación puntual (manga, cuello, filete…). «Prenda completa»: confeccionas la ropa de principio a fin." />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="mb-1 flex items-center text-xs font-medium text-slate-400">
                  Prenda
                  <Tooltip text="Elije el modelo del catálogo o escribe el tuyo con la opción personalizada." />
                </label>
                <select
                  value={prenda}
                  onChange={(e) => setPrenda(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                >
                  {GARMENT_PRESETS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
                {prenda === GARMENT_PRESETS[GARMENT_PRESETS.length - 1] && (
                  <input
                    type="text"
                    value={customPrenda}
                    onChange={(e) => setCustomPrenda(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-cyan-500/50 bg-slate-950 px-3 py-1.5 text-xs text-slate-100"
                    placeholder="Escribe el nombre de la prenda…"
                  />
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 flex items-center text-xs font-medium text-slate-400">
                  Pieza / Proceso
                  <Tooltip text="Piezas cortadas (manga, cuello, bolsillo…) y procesos de costura (filete, plana, collarín…) para cualquier tipo de prenda." />
                </label>
                <select
                  value={pieza}
                  onChange={(e) => setPieza(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                >
                  {PIECE_PRESETS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                {pieza === PIECE_PRESETS[PIECE_PRESETS.length - 1] && (
                  <input
                    type="text"
                    value={customPieza}
                    onChange={(e) => setCustomPieza(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-cyan-500/50 bg-slate-950 px-3 py-1.5 text-xs text-slate-100"
                    placeholder="Escribe la pieza o proceso…"
                  />
                )}
              </div>

              <div>
                <label className="mb-1 flex items-center text-xs font-medium text-slate-400">
                  Color de la pieza
                  <Tooltip text="Identifica el lote: azul oscuro, negro, marfil… agrupa atados por tono." />
                </label>
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  placeholder="Ej: Azul oscuro"
                />
              </div>

              <div>
                <label className="mb-1 flex items-center text-xs font-medium text-slate-400">
                  Tela
                  <Tooltip text="Material de la pieza: algodón, dril, lino, gabardina, felpa, rib…" />
                </label>
                <input
                  type="text"
                  value={tela}
                  onChange={(e) => setTela(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  placeholder="Ej: Dril"
                />
              </div>

              <div>
                <label className="mb-1 flex items-center text-xs font-medium text-slate-400">
                  Tarifa por pieza (COP)
                  <Tooltip text="Pago acordado por cada unidad en esta operación." />
                </label>
                <input
                  type="number"
                  value={tarifa}
                  onChange={(e) => setTarifa(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  placeholder="Ej: 600"
                />
              </div>
            </div>

            {/* Foto */}
            <div className="flex items-center gap-4 pt-1">
              <label className="flex cursor-pointer items-center rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-cyan-500">
                📷 {imagePreview ? "Cambiar foto" : "Adjuntar foto de la pieza / prenda"}
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
              <Tooltip text="Foto opcional del atado, la etiqueta o la pieza como comprobante visual que queda guardada en tu cuaderno." />
              {imagePreview && (
                <div className="flex items-center gap-2">
                  <img src={imagePreview} alt="Preview" className="h-8 w-8 rounded-lg border border-slate-700 object-cover" />
                  <button onClick={() => setImagePreview(null)} className="text-xs text-red-400 hover:underline">
                    Quitar
                  </button>
                </div>
              )}
            </div>

            {/* ✅ V2: Sumar y RESTAR con corrección táctil al instante */}
            <div className="pt-2">
              <p className="mb-2 flex items-center text-xs text-slate-400">
                Marca las piezas en tu billetera:
                <Tooltip text="Suma con los botones rápidos (+10/+25/+50/+100) o escribe la cantidad. Corrige al instante con −1 / −10 si te equivocaste de botón: no se pierde la cuenta del turno." />
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {[10, 25, 50, 100].map((qty) => (
                  <button
                    key={qty}
                    onClick={() => addLog(qty)}
                    className="rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-cyan-500 sm:flex-none active:scale-95"
                  >
                    +{qty}
                  </button>
                ))}
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={customQty}
                    onChange={(e) => setCustomQty(e.target.value)}
                    className="w-20 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-center text-sm text-slate-100"
                  />
                  <button
                    onClick={() => addLog(Math.abs(parseInt(customQty, 10) || 0))}
                    className="rounded-xl border border-cyan-500/40 bg-cyan-950/60 px-4 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-900"
                  >
                    ＋ Sumar
                  </button>
                  <button
                    onClick={() => addLog(-(Math.abs(parseInt(customQty, 10) || 0)))}
                    className="rounded-xl border border-red-500/40 bg-red-950/60 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-900"
                    title="Descontar piezas: faltante, devolución de calidad o corrección"
                  >
                    − Restar
                  </button>
                </div>
              </div>

              {/* V2: fila de corrección rápida (instalada según prototipo) */}
              <div className="mt-2 grid grid-cols-3 gap-2">
                {[1, 10].map((n) => (
                  <button
                    key={n}
                    onClick={() => addLog(-n)}
                    className="rounded-xl border border-amber-500/40 bg-amber-500/20 py-2 text-xs font-extrabold text-amber-300 transition hover:bg-amber-500/30 active:scale-95"
                    title={`Corrección instantánea: ${n} pieza(s) menos sin borrar el resto`}
                  >
                    ↩️ −{n} pieza{n > 1 ? "s" : ""}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setCustomQty("0");
                    setImagePreview(null);
                  }}
                  className="rounded-xl border border-red-500/40 bg-red-500/20 py-2 text-xs font-extrabold text-red-300 transition hover:bg-red-500/30 active:scale-95"
                  title="Limpia la cantidad y la foto del formulario"
                >
                  🧹 Limpiar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================= 📅 VISTA CALENDARIO / COBRO ======================= */}
      {view === "calendario" && (
        <div className="space-y-4">
          <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setCalendarMonth((m) => (m === 0 ? 11 : m - 1));
                    if (calendarMonth === 0) setCalendarYear((y) => y - 1);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700"
                >
                  ‹
                </button>
                <h3 className="text-sm font-extrabold text-slate-100">
                  {MONTHS_LONG[calendarMonth]} {calendarYear}
                </h3>
                <button
                  onClick={() => {
                    const next = (calendarMonth + 1) % 12;
                    setCalendarMonth(next);
                    if (next === 0) setCalendarYear((y) => y + 1);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700"
                >
                  ›
                </button>
              </div>
              <button
                onClick={() => {
                  setCalendarMonth(new Date().getMonth());
                  setCalendarYear(new Date().getFullYear());
                }}
                className="rounded-lg border border-cyan-500/30 bg-cyan-500/20 px-2.5 py-1 text-[11px] font-bold text-cyan-300 hover:bg-cyan-500/30"
              >
                🎯 Ir a hoy
              </button>
            </div>

            <div className="grid grid-cols-7 text-center text-[10px] font-black uppercase text-slate-400">
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>

            <CalendarGrid
              month={calendarMonth}
              year={calendarYear}
              logs={logs}
              paidMap={paidMap}
              onPick={(dateStr) => {
                setDayFilter(dateStr);
                setView("historial");
              }}
            />

            <div className="flex items-center justify-around border-t border-slate-800 pt-2 text-[10px] text-slate-400">
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Por cobrar</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-indigo-500" /> Cobrado ✓</span>
            </div>
          </div>

          {/* LIQUIDACIÓN DEL PERÍODO */}
          <div className="space-y-4 rounded-2xl border border-cyan-500/40 bg-slate-900/80 p-6 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="flex items-center text-lg font-extrabold text-slate-100">
                  🧮 Liquidación por Período
                  <Tooltip text="Suma automáticamente todo lo registrado entre la fecha de inicio y la de corte, separado entre pendiente y ya cobrado, y arma tu cuenta de cobro lista para WhatsApp." />
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    ["today", "📅 Hoy"],
                    ["week", "🗓️ Semana"],
                    ["fortnight", "📆 Quincena"],
                    ["custom", "✏️ Libre"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => (key === "custom" ? setPeriodPreset("custom") : applyPeriodPreset(key))}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      periodPreset === key
                        ? "bg-cyan-600 text-white shadow-md shadow-cyan-950/50"
                        : "border border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1 flex items-center text-xs font-medium text-slate-400">
                  Fecha de inicio
                  <Tooltip text="Día en que empezaste este lote o quincena." />
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPeriodPreset("custom");
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 flex items-center text-xs font-medium text-slate-400">
                  Fecha de corte
                  <Tooltip text="Día límite para calcular el total del período." />
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPeriodPreset("custom");
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-2">
                <a
                  href={getLiquidationWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-center text-xs font-bold text-white shadow-lg shadow-emerald-950/50 transition hover:bg-emerald-500"
                >
                  📲 Enviar cuenta de cobro por WhatsApp
                </a>
                <button
                  onClick={onMarkRangePaid}
                  className="w-full rounded-xl border border-indigo-500/40 bg-indigo-600/20 px-4 py-2 text-center text-xs font-bold text-indigo-300 transition hover:bg-indigo-600/40"
                >
                  ✅ Marcar período como COBRADO
                </button>
                <Tooltip text="Marca los días trabajados de este rango como ya liquidados (se pintan en índigo en el calendario). Si tu patrón te pagó, úsalo para no volver a cobralos." />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 rounded-xl border border-cyan-500/20 bg-slate-950 p-4">
              <div>
                <p className="flex items-center text-[11px] text-slate-400">
                  Pendiente por cobrar
                  <Tooltip text="Suma en COP de los días aún no marcados como pagados en este rango." />
                </p>
                <p className={`mt-0.5 text-2xl font-black sm:text-3xl ${periodLedger.pendingCop < 0 ? "text-red-400" : "text-emerald-400"}`}>
                  {formatCop(periodLedger.pendingCop)}
                </p>
              </div>
              <div>
                <p className="flex items-center text-[11px] text-slate-400">
                  ✅ Ya cobrado
                  <Tooltip text="Días de este rango que ya liquidaste con tu patrón. Se separa para no volver a cobralos." />
                </p>
                <p className="mt-0.5 text-2xl font-black text-indigo-300 sm:text-3xl">
                  {formatCop(periodLedger.paidCop)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400">Piezas netas</p>
                <p className="mt-0.5 text-2xl font-black text-cyan-300 sm:text-3xl">
                  {periodLedger.units} <span className="text-xs font-normal text-slate-400">uds</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================= 🕐 VISTA HISTORIAL ======================= */}
      {view === "historial" && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center font-bold text-slate-200">
              {dayFilter ? `Historial del día ${dayFilter}` : `Historial (${periodLogs.length})`}
              <Tooltip text="Anotaciones del período elegido. Los ajustes (−) aparecen en rojo y restan del total. Las novedades aparecen en rojo y no restan del destajo." />
            </h3>
            <div className="flex items-center gap-3">
              {periodLogs.length > 0 && (
                <button
                  onClick={() => setCompactView((v) => !v)}
                  className="rounded-lg border border-slate-700 px-2.5 py-1 text-[11px] font-bold text-slate-300 transition hover:border-cyan-500 hover:text-cyan-300"
                >
                  {compactView ? "📋 Detalle" : "🔲 Iconos"}
                </button>
              )}
              {logs.length > 0 && (
                <button onClick={clearLogs} className="text-xs text-slate-500 transition hover:text-red-400">
                  Limpiar cuaderno
                </button>
              )}
            </div>
          </div>

          {dayFilter && (
            <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-cyan-500/30 bg-cyan-950/30 p-3">
              <p className="text-xs text-cyan-200">
                Día seleccionado en el calendario: <strong>{dayFilter}</strong>
              </p>
              <div className="flex gap-2">
                {(() => {
                  const dayEntries = logs.filter((l) => l.rawDate === dayFilter);
                  const hasProd = dayEntries.some((l) => l.kind !== "novelty");
                  if (!hasProd)
                    return <span className="text-xs text-slate-500">Sin producción este día</span>;
                  const paid = !!paidMap[dayFilter];
                  return (
                    <button
                      onClick={() => toggleDayPaid(dayFilter)}
                      className={`rounded-lg px-3 py-1 text-[11px] font-extrabold uppercase transition ${
                        paid
                          ? "bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30"
                          : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                      }`}
                    >
                      {paid ? "✅ Cobrado — marcar pendiente" : "⏳ Pendiente — marcar cobrado"}
                    </button>
                  );
                })()}
                <button
                  onClick={() => setDayFilter(null)}
                  className="rounded-lg border border-slate-700 px-2.5 py-1 text-[11px] text-slate-400 hover:text-white"
                >
                  Ver período
                </button>
              </div>
            </div>
          )}

          {(dayFilter ? logs.filter((l) => l.rawDate === dayFilter) : periodLogs).length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-500">
              {dayFilter
                ? `No hay anotaciones el día ${dayFilter}.`
                : `No hay anotaciones entre ${startDate} y ${endDate}. Registra producción en la pestaña Diario.`}
            </p>
          ) : compactView ? (
            <div className="grid max-h-80 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4 md:grid-cols-6">
              {(dayFilter ? logs.filter((l) => l.rawDate === dayFilter) : periodLogs).map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => {
                    if (
                      l.kind === "novelty" ||
                      confirm(
                        `${l.prenda} · ${l.pieza}\n${l.units} piezas · ${formatCop(l.total)}\n${l.formattedDate}\n\n¿Eliminar?`
                      )
                    )
                      deleteLog(l.id);
                  }}
                  className={`flex flex-col items-center rounded-xl border p-2.5 text-center transition hover:border-cyan-500 ${
                    l.kind === "novelty"
                      ? "border-red-500/40 bg-red-950/30"
                      : l.units < 0
                        ? "border-red-500/40 bg-red-950/30"
                        : "border-slate-800 bg-slate-950/60"
                  }`}
                >
                  <span className="text-2xl" aria-hidden>
                    {l.kind === "novelty" ? "🚨" : l.workType === "full" ? "👕" : l.units < 0 ? "🔻" : "🧵"}
                  </span>
                  <span className="mt-1 w-full truncate text-[11px] font-bold text-slate-200">{l.prenda}</span>
                  <span className="text-[10px] text-cyan-300">
                    {l.kind === "novelty" ? "Novedad" : `${l.units} pzs`}
                  </span>
                  <span
                    className={`text-[10px] font-bold ${
                      l.kind === "novelty" ? "text-red-400" : l.total < 0 ? "text-red-400" : "text-emerald-400"
                    }`}
                  >
                    {l.kind === "novelty" ? "—" : formatCop(l.total)}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="max-h-80 space-y-2.5 overflow-y-auto">
              {(dayFilter ? logs.filter((l) => l.rawDate === dayFilter) : periodLogs).map((l) =>
                l.kind === "novelty" ? (
                  <div key={l.id} className="flex items-center justify-between gap-3 rounded-xl border border-red-500/40 bg-red-950/30 p-3 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🚨</span>
                      <div>
                        <p className="font-bold text-red-300">{l.pieza}</p>
                        <p className="text-[11px] text-red-200/70">{l.formattedDate}</p>
                      </div>
                    </div>
                    <span className="rounded border border-red-500/30 bg-red-500/20 px-2 py-0.5 text-xs font-extrabold text-red-400">
                      Reportada
                    </span>
                  </div>
                ) : (
                  <div
                    key={l.id}
                    className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-xs ${
                      l.units < 0 ? "border-red-500/30 bg-red-950/20" : "border-slate-800/80 bg-slate-950/60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {l.image ? (
                        <img src={l.image} alt={l.prenda} className="h-10 w-10 rounded-lg border border-slate-800 object-cover" />
                      ) : (
                        <span className="text-xl">{l.workType === "full" ? "👕" : l.units < 0 ? "🔻" : "🧵"}</span>
                      )}
                      <div>
                        <p className="font-semibold text-slate-200">
                          {l.prenda} · <span className="text-cyan-300">{l.pieza}</span>
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {l.color} · {l.tela} · {l.formattedDate} · Tarifa {formatCop(l.tarifa)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-right">
                      <div>
                        <p className={`text-sm font-extrabold ${l.total < 0 ? "text-red-400" : "text-emerald-400"}`}>
                          {l.units < 0 ? "" : "+"}
                          {formatCop(l.total)}
                        </p>
                        <p className="font-medium text-slate-400">
                          {l.units > 0 ? "+" : ""}
                          {l.units} piezas
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const input = prompt(
                            `Cantidad correcta para «${l.prenda} · ${l.pieza}» (actual: ${l.units}). Usa negativo (ej: -2) para un ajuste:`,
                            String(l.units)
                          );
                          if (input !== null) updateLogUnits(l.id, parseInt(input, 10) || 0);
                        }}
                        className="rounded-lg border border-cyan-500/40 px-2 py-0.5 text-[10px] font-bold text-cyan-300 hover:bg-cyan-950"
                        title="Corregir la cantidad de esta anotación"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteLog(l.id)}
                        className="rounded-lg border border-red-500/40 px-2 py-0.5 text-[10px] font-bold text-red-300 hover:bg-red-950"
                        title="Eliminar esta anotación"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal de jornada y meta */}
      {shiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
            <div className="text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/20 text-xl text-cyan-400">
                🕐
              </div>
              <h3 className="text-lg font-extrabold text-slate-100">Mi Horario de Trabajo</h3>
              <p className="text-xs text-slate-400">
                La app calcula tu ritmo de producción sin presiones: al pausar el turno, el tiempo deja de contar.
              </p>
            </div>
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-slate-400">Hora de entrada</label>
                  <input
                    type="time"
                    value={draftShift.shiftStart}
                    onChange={(e) => setDraftShift({ ...draftShift, shiftStart: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-bold text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-slate-400">Hora de salida</label>
                  <input
                    type="time"
                    value={draftShift.shiftEnd}
                    onChange={(e) => setDraftShift({ ...draftShift, shiftEnd: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-bold text-slate-100"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-slate-400">Meta personal de piezas (hoy)</label>
                <input
                  type="number"
                  value={draftShift.goal}
                  onChange={(e) => setDraftShift({ ...draftShift, goal: parseInt(e.target.value, 10) || 0 })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-center text-xl font-black text-emerald-400"
                />
              </div>
            </div>
            <button
              onClick={() => {
                setShift(draftShift);
                setShiftModal(false);
              }}
              className="w-full rounded-xl bg-cyan-500 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-400"
            >
              Guardar horario y recalcular
            </button>
            <button
              onClick={() => setShiftModal(false)}
              className="w-full rounded-xl border border-slate-800 py-2 text-center text-xs text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Modal ticket (heredado de V1) */}
      <TicketModal
        onSend={(code, labelFromType, qty, notes, noveltyType) => {
          // 1) dejar evidencia local en el diario, 2) abrir WhatsApp
          addLog(0, {
            type: noveltyType,
            detail: notes,
          });
          window.open(getTicketWhatsAppUrl(code, labelFromType, qty, notes), "_blank");
        }}
        prendaDefault={prenda}
      />
    </div>
  );
}

function TicketModal({
  onSend,
  prendaDefault,
}: {
  onSend: (code: string, label: string, qty: string, notes: string, noveltyType: string) => void;
  prendaDefault: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("missing_piece");
  const [qty, setQty] = useState("5");
  const [notes, setNotes] = useState("");

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 rounded-full border border-red-500/40 bg-red-600 px-4 py-3 text-sm font-black text-white shadow-xl transition hover:bg-red-500 active:scale-95 md:hidden"
        title="Reportar novedad de confección"
      >
        🚨 Novedad
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="flex items-center gap-2 font-bold text-slate-100">
                🚨 Novedad de confección
                <Tooltip text="La novedad queda registrada en tu cuaderno (evidencia con fecha) y se reporta por WhatsApp a tu taller o marca." />
              </h3>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="mb-1 block text-slate-400">Prenda / Referencia</label>
                <input
                  type="text"
                  value={prendaDefault}
                  readOnly
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-slate-400">Tipo de novedad</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
                >
                  {NOVELTY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-slate-400">Cantidad afectada</label>
                <input
                  type="number"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-slate-400">Observaciones</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
                  placeholder="Ej: 2 mangas izquierdas vienen manchadas de aceite…"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onSend(`TKT-${Math.floor(1000 + Math.random() * 9000)}`, noveltyLabel(reason), qty, notes, reason);
                  setOpen(false);
                }}
                className="w-full rounded-xl bg-red-600 py-3 text-center text-xs font-black text-white shadow-lg shadow-red-950/50 hover:bg-red-500"
              >
                📲 Guardar en el diario y reportar por WhatsApp
              </a>
              <button
                onClick={() => setOpen(false)}
                className="w-full rounded-xl border border-slate-800 py-2 text-center text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* --------- Calendario mensual V2 --------- */

function CalendarGrid({
  month,
  year,
  logs,
  paidMap,
  onPick,
}: {
  month: number;
  year: number;
  logs: ManualLog[];
  paidMap: Record<string, boolean>;
  onPick: (dateStr: string) => void;
}) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const byDate = useMemo(() => {
    const map = new Map<string, { hasProduction: boolean; hasNovelty: boolean }>();
    for (const l of logs) {
      if (!l.rawDate) continue;
      const cur = map.get(l.rawDate) ?? { hasProduction: false, hasNovelty: false };
      if (l.kind === "novelty") cur.hasNovelty = true;
      else cur.hasProduction = true;
      map.set(l.rawDate, cur);
    }
    return map;
  }, [logs]);

  // lunes primero
  const startOffset = (firstDay.getDay() + 6) % 7;
  const cells: (number | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: lastDay.getDate() }, (_, i) => i + 1),
  ];

  return (
    <div className="grid grid-cols-7 gap-1.5 text-center">
      {cells.map((day, i) => {
        if (day === null) return <div key={`e${i}`} className="h-9 rounded-xl bg-slate-900/30 opacity-20" />;
        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const dayInfo = byDate.get(dateStr);
        const paid = !!paidMap[dateStr];
        const isToday = dateStr === todayStr;

        let cls =
          "flex h-9 flex-col items-center justify-center rounded-xl border text-xs font-black transition ";
        if (dayInfo?.hasProduction && paid) {
          cls += "bg-indigo-600/30 text-indigo-300 border-indigo-500/50 hover:bg-indigo-600/50 ";
        } else if (dayInfo?.hasProduction) {
          cls += "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30 ";
        } else if (dayInfo?.hasNovelty) {
          cls += "bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30 ";
        } else {
          cls += "bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-700/50 ";
        }
        if (isToday) cls += "ring-2 ring-cyan-400 ";

        return (
          <button key={dateStr} type="button" onClick={() => onPick(dateStr)} className={cls} title={dateStr}>
            <span>{day}</span>
            {dayInfo?.hasProduction && (
              <span className={`absolute mt-3 h-1.5 w-1.5 rounded-full ${paid ? "bg-indigo-400" : "bg-emerald-400"}`} />
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Enlaces rápidos con estado reducido (evita hooks en funciones helper). */
function getTicketWhatsAppUrlSafe() {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(
    "🚨 Reporto una novedad de confección (pieza faltante / tela dañada / devolución de calidad). Detalle: "
  )}`;
}
