"use client";

// ============================================================
// 📖 Cuaderno Manual Global (módulo aparte, client-side)
// Formulario universal para cualquier prenda textil:
// prenda + pieza + proceso + color + tela + foto opcional.
// Permite SUMAR y RESTAR piezas (ajustes por faltante/reproceso).
// storageKey parametrizable: operario principal, dueño del taller, etc.
// ============================================================

import { useMemo, useState } from "react";
import { formatCop } from "@/lib/cop";

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

/* --------- Catálogo global de prendas y piezas (sirve para franela, shorts, pantalones, etc.) --------- */

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
  image?: string | null;
};

type Props = {
  storageKey: string;
  variant: "personal" | "own";
  title: string;
  subtitle: string;
};

/* --------- Persistencia con migración de la clave antigua --------- */

function loadLogs(storageKey: string): ManualLog[] {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      return JSON.parse(saved) as ManualLog[];
    }
    // Migración: registros creados antes de las claves por usuario
    const legacy = localStorage.getItem("coretextil_personal_logs");
    if (legacy) {
      const migrated = JSON.parse(legacy) as ManualLog[];
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

/* --------- Reloj en formato legible --------- */

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function stamp(d: Date) {
  return `${DAYS[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]} ${d.getFullYear()} · ${String(
    d.getHours()
  ).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

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

  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketReason, setTicketReason] = useState<
    "missing_piece" | "damaged_fabric" | "quality_return"
  >("missing_piece");
  const [ticketPrenda, setTicketPrenda] = useState("Franela / Blusa");
  const [ticketQty, setTicketQty] = useState("5");
  const [ticketNotes, setTicketNotes] = useState("Faltan bolsillos traseros en el atado");

  const todayStr = new Date().toISOString().slice(0, 10);

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
      setStartDate(getStartOfWeek());
      setEndDate(todayStr);
    } else if (preset === "fortnight") {
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      if (now.getDate() <= 15) {
        setStartDate(`${year}-${month}-01`);
        setEndDate(`${year}-${month}-15`);
      } else {
        const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
        setStartDate(`${year}-${month}-16`);
        setEndDate(`${year}-${month}-${lastDay}`);
      }
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

  const walletPeriod = useMemo(() => periodLogs.reduce((acc, l) => acc + l.total, 0), [periodLogs]);
  const piecesPeriod = useMemo(() => periodLogs.reduce((acc, l) => acc + l.units, 0), [periodLogs]);

  const todayLogs = useMemo(() => logs.filter((l) => l.rawDate === todayStr), [logs, todayStr]);
  const walletToday = useMemo(() => todayLogs.reduce((acc, l) => acc + l.total, 0), [todayLogs]);
  const piecesToday = useMemo(() => todayLogs.reduce((acc, l) => acc + l.units, 0), [todayLogs]);

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

  /* --------- Registro con signo (sumar / restar) --------- */

  function addLog(units: number) {
    const rate = parseFloat(tarifa) || 0;
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
      const next = prev.map((l) => (l.id === id ? { ...l, units, total: Math.round(l.tarifa * units) } : l));
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

  function clearLogs() {
    if (!confirm("¿Deseas borrar TODAS las anotaciones de este cuaderno manual?")) return;
    setLogs([]);
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  }

  /* --------- Cuenta de cobro WhatsApp --------- */

  function getLiquidationWhatsAppUrl() {
    let breakdown = "";
    periodLogs.forEach((l, i) => {
      breakdown += `${i + 1}. ${l.prenda} · ${l.pieza} (${l.color}, ${l.tela}): ${l.units} uds × ${formatCop(
        l.tarifa
      )} = ${formatCop(l.total)}\n`;
    });

    const text =
      `🧾 *CUENTA DE COBRO DE DESTAJO — ${title}*\n` +
      `📅 Período: ${startDate} al ${endDate}\n\n` +
      `💰 *TOTAL:* ${formatCop(walletPeriod)}\n` +
      `🔢 *Piezas netas:* ${piecesPeriod} uds\n` +
      `📋 *Anotaciones:* ${periodLogs.length}\n\n` +
      `📌 *DESGLOSE:*\n` +
      (breakdown || "Sin registros en el período\n") +
      `\n---\n💡 Generado con el Cuaderno Digital de CoreTextil: https://coretextil.vercel.app`;

    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  }

  function getTicketWhatsAppUrl() {
    const reasonLabels = {
      missing_piece: "⚠️ Pieza Faltante en Atado",
      damaged_fabric: "✂️ Tela Dañada / Defectuosa",
      quality_return: "🔍 Devolución por Control de Calidad (Reproceso)",
    };
    const now = new Date();
    const ticketCode = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
    const text =
      `🚨 *TICKET DE NOVEDAD DE CONFECCIÓN* (${ticketCode})\n\n` +
      `📌 *Prenda:* ${ticketPrenda}\n` +
      `📋 *Motivo:* ${reasonLabels[ticketReason]}\n` +
      `🔢 *Cantidad afectada:* ${ticketQty} uds\n` +
      `📅 *Fecha:* ${stamp(now)}\n` +
      `📝 *Observaciones:* ${ticketNotes || "Sin observaciones"}\n\n` +
      `---\n💡 Generado desde CoreTextil: https://coretextil.vercel.app`;
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  }

  const isPersonal = variant === "personal";

  return (
    <div className="space-y-6">
      {/* Cabecera billetera del día */}
      <div
        className={`rounded-2xl border p-5 backdrop-blur ${
          isPersonal ? "border-cyan-500/30 bg-cyan-950/40" : "border-indigo-500/30 bg-indigo-950/40"
        }`}
      >
        <h2 className="text-2xl font-extrabold text-slate-100">{title}</h2>
        <p className="mt-1 text-xs text-slate-400">{subtitle}</p>

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
            <Tooltip text="Envía la invitación por WhatsApp al dueño de tu taller: si se afilia, tus anotaciones pasan a confirmarse en su nómina oficial del taller." />
          </div>
        )}
      </div>

      {/* Liquidación por período */}
      <div className="space-y-4 rounded-2xl border border-cyan-500/40 bg-slate-900/80 p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="flex items-center text-lg font-extrabold text-slate-100">
              🧮 Liquidación por Período
              <Tooltip text="Suma automáticamente todo lo registrado entre la fecha de inicio y la de corte, y arma tu cuenta de cobro lista para WhatsApp." />
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
          <div className="flex items-center gap-2">
            <a
              href={getLiquidationWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-center text-xs font-bold text-white shadow-lg shadow-emerald-950/50 transition hover:bg-emerald-500"
            >
              📲 Enviar cuenta de cobro por WhatsApp
            </a>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 rounded-xl border border-cyan-500/20 bg-slate-950 p-4">
          <div>
            <p className="flex items-center text-[11px] text-slate-400">
              Total a cobrar
              <Tooltip text="Suma en COP de todo el período, con restas ya descontadas." />
            </p>
            <p className={`mt-0.5 text-2xl font-black sm:text-3xl ${walletPeriod < 0 ? "text-red-400" : "text-emerald-400"}`}>
              {formatCop(walletPeriod)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400">Piezas netas</p>
            <p className="mt-0.5 text-2xl font-black text-cyan-300 sm:text-3xl">
              {piecesPeriod} <span className="text-xs font-normal text-slate-400">uds</span>
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400">Anotaciones</p>
            <p className="mt-0.5 text-2xl font-black text-amber-300 sm:text-3xl">
              {periodLogs.length} <span className="text-xs font-normal text-slate-400">ítems</span>
            </p>
          </div>
        </div>
      </div>

      {/* 🌎 FORMULARIO GLOBAL */}
      <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
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

        {/* Sumar y RESTAR piezas */}
        <div className="pt-2">
          <p className="mb-2 flex items-center text-xs text-slate-400">
            Marca las piezas en tu billetera:
            <Tooltip text="Suma con los botones rápidos (+10/+25/+50/+100) o escribe la cantidad. Usa «− Restar» para descontar faltantes, devoluciones de calidad o un conteo que anotaste de más." />
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
        </div>
      </div>

      {/* Historial */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center font-bold text-slate-200">
            Historial ({periodLogs.length})
            <Tooltip text="Anotaciones del período elegido. Los ajustes (−) aparecen en rojo y restan del total. Se guarda localmente en tu teléfono; puedes editar o borrar tus propias anotaciones." />
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

        {periodLogs.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-500">
            No hay anotaciones entre {startDate} y {endDate}. Registra producción arriba.
          </p>
        ) : compactView ? (
          <div className="grid max-h-80 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4 md:grid-cols-6">
            {periodLogs.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => {
                  if (confirm(`${l.prenda} · ${l.pieza}\n${l.units} piezas · ${formatCop(l.total)}\n${l.formattedDate}\n\n¿Eliminar?`))
                    deleteLog(l.id);
                }}
                className={`flex flex-col items-center rounded-xl border p-2.5 text-center transition hover:border-cyan-500 ${
                  l.units < 0 ? "border-red-500/40 bg-red-950/30" : "border-slate-800 bg-slate-950/60"
                }`}
              >
                <span className="text-2xl" aria-hidden>
                  {l.workType === "full" ? "👕" : l.units < 0 ? "🔻" : "🧵"}
                </span>
                <span className="mt-1 w-full truncate text-[11px] font-bold text-slate-200">{l.prenda}</span>
                <span className={`text-[10px] ${l.units < 0 ? "text-red-300" : "text-cyan-300"}`}>{l.units} pzs</span>
                <span className={`text-[10px] font-bold ${l.total < 0 ? "text-red-400" : "text-emerald-400"}`}>
                  {formatCop(l.total)}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="max-h-80 space-y-2.5 overflow-y-auto">
            {periodLogs.map((l) => (
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
            ))}
          </div>
        )}
      </div>

      {/* Modal ticket */}
      {showTicketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="flex items-center gap-2 font-bold text-slate-100">
                🚨 Ticket Formal de Novedad
                <Tooltip text="Reporte estructurado para notificar problemas de confección con fecha y número de ticket formal." />
              </h3>
              <button onClick={() => setShowTicketModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="mb-1 block text-slate-400">Prenda / Referencia</label>
                <input
                  type="text"
                  value={ticketPrenda}
                  onChange={(e) => setTicketPrenda(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-slate-400">Motivo</label>
                <select
                  value={ticketReason}
                  onChange={(e) => setTicketReason(e.target.value as typeof ticketReason)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="missing_piece">⚠️ Pieza Faltante en Atado</option>
                  <option value="damaged_fabric">✂️ Tela Dañada / Defectuosa</option>
                  <option value="quality_return">🔍 Devolución por Control de Calidad (Reproceso)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-slate-400">Cantidad afectada</label>
                <input
                  type="number"
                  value={ticketQty}
                  onChange={(e) => setTicketQty(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-slate-400">Observaciones</label>
                <textarea
                  value={ticketNotes}
                  onChange={(e) => setTicketNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <a
                href={getTicketWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowTicketModal(false)}
                className="w-full rounded-xl bg-emerald-600 py-3 text-center text-xs font-bold text-white shadow-lg shadow-emerald-950/50 hover:bg-emerald-500"
              >
                📲 Enviar Ticket por WhatsApp
              </a>
              <button
                onClick={() => setShowTicketModal(false)}
                className="w-full rounded-xl border border-slate-800 py-2 text-center text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getTicketWhatsAppUrlSafe() {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(
    "🚨 Reporto una novedad de confección (pieza faltante / tela dañada / devolución de calidad). Detalle: "
  )}`;
}
