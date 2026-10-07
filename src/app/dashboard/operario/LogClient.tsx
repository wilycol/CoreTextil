"use client";

import { useMemo, useState, useTransition } from "react";
import { formatCop } from "@/lib/cop";
import { logProduction } from "./actions";

export type MarkingData = {
  role: string;
  walletToday: number;
  piecesToday: number;
  orders: { id: string; label: string; garmentId: string }[];
  bundles: {
    id: string;
    orderId: string;
    code: string;
    size: string;
    color: string;
    units: number;
  }[];
  operations: {
    id: string;
    garmentId: string;
    name: string;
    machine: string;
    rate: number;
  }[];
  done: Record<string, number>; // "bundleId:opId" -> unidades del equipo
  operators?: { id: string; full_name: string }[];
};

const MACHINE_LABEL: Record<string, string> = {
  plana: "Plana",
  fileteadora: "Fileteadora",
  collarin: "Collarín",
};

export default function LogClient({
  data,
  preselectedCode,
}: {
  data: MarkingData;
  preselectedCode?: string | null;
}) {
  const preselect = data.bundles.find((b) => b.code === preselectedCode);
  const [wallet, setWallet] = useState(data.walletToday);
  const [pieces, setPieces] = useState(data.piecesToday);
  const [done, setDone] = useState(data.done);
  const [orderId, setOrderId] = useState(preselect?.orderId ?? data.orders[0]?.id ?? "");
  const [bundleId, setBundleId] = useState<string | null>(preselect?.id ?? null);
  const [opId, setOpId] = useState<string | null>(null);
  const [operatorId, setOperatorId] = useState<string>("");
  const [custom, setCustom] = useState("1");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const orderBundles = useMemo(
    () => data.bundles.filter((b) => b.orderId === orderId),
    [data.bundles, orderId]
  );
  const bundle = orderBundles.find((b) => b.id === bundleId) ?? null;
  const garmentOps = useMemo(
    () =>
      bundle
        ? data.operations.filter(
            (o) =>
              o.garmentId ===
              data.orders.find((x) => x.id === bundle.orderId)?.garmentId
          )
        : [],
    [bundle, data.operations, data.orders]
  );
  const op = garmentOps.find((o) => o.id === opId) ?? null;

  const remaining = bundle && op
    ? Math.max(0, bundle.units - (done[`${bundle.id}:${op.id}`] ?? 0))
    : 0;

  function mark(units: number) {
    if (!bundle || !op) return;
    if (units <= 0) return setError("Cantidad inválida.");
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await logProduction(bundle.id, op.id, units, operatorId || undefined);
      if (res.ok) {
        const key = `${bundle.id}:${op.id}`;
        setDone((d) => ({ ...d, [key]: (d[key] ?? 0) + units }));
        setWallet((w) => w + res.earned);
        setPieces((p) => p + units);
        setMessage(`+${units} · ${formatCop(res.earned)} a tu billetera`);
      } else {
        setError(res.error ?? "No se pudo registrar.");
      }
    });
  }

  // Si no hay órdenes vinculadas (Operario libre / Lead sin taller registrado), se activa el Cuaderno Digital Personal
  if (data.orders.length === 0) {
    return <PersonalLogbook />;
  }

  return (
    <div className="space-y-6">
      {/* Billetera del día */}
      <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-emerald-800 bg-emerald-950/40 p-5">
        <div>
          <p className="text-xs text-emerald-300/80">Ganado hoy</p>
          <p className="text-3xl font-extrabold text-emerald-300">
            {formatCop(wallet)}
          </p>
        </div>
        <div className="text-emerald-200/80">
          <p className="text-xs">Piezas de hoy</p>
          <p className="text-xl font-bold">{pieces}</p>
        </div>
      </div>

      {/* Paso 1: orden */}
      <label className="block text-sm">
        <span className="mb-1 block text-slate-400">1 · Orden</span>
        <select
          value={orderId}
          onChange={(e) => {
            setOrderId(e.target.value);
            setBundleId(null);
            setOpId(null);
          }}
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 focus:border-cyan-500 focus:outline-none"
        >
          {data.orders.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      {/* Selector de operario si es jefe */}
      {data.role === "satellite_owner" && data.operators && data.operators.length > 0 && (
        <label className="block text-sm">
          <span className="mb-1 block text-slate-400">Operario a marcar</span>
          <select
            value={operatorId}
            onChange={(e) => setOperatorId(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 focus:border-cyan-500 focus:outline-none"
          >
            <option value="">A mi nombre</option>
            {data.operators.map((op) => (
              <option key={op.id} value={op.id}>
                {op.full_name}
              </option>
            ))}
          </select>
        </label>
      )}

      {/* Paso 2: atado */}
      {orderId && (
        <div>
          <span className="mb-2 block text-sm text-slate-400">2 · Atado</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {orderBundles.map((b) => {
              const active = b.id === bundleId;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setBundleId(b.id);
                    setOpId(null);
                  }}
                  className={`rounded-xl border p-3 text-left transition ${
                    active
                      ? "border-cyan-500 bg-cyan-950/60 font-semibold text-cyan-200"
                      : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <p className="font-mono text-xs">{b.code}</p>
                  <p className="text-xs text-slate-400">
                    {b.size} · {b.color} · {b.units} uds
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Paso 3: operación */}
      {bundle && (
        <div>
          <span className="mb-2 block text-sm text-slate-400">
            3 · Operación (atado {bundle.code})
          </span>
          <div className="space-y-2">
            {garmentOps.map((o) => {
              const active = o.id === opId;
              const key = `${bundle.id}:${o.id}`;
              const doneUnits = done[key] ?? 0;
              const left = Math.max(0, bundle.units - doneUnits);

              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setOpId(o.id)}
                  className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${
                    active
                      ? "border-cyan-500 bg-cyan-950/60 text-cyan-200"
                      : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <div>
                    <p className="font-semibold">{o.name}</p>
                    <p className="text-xs text-slate-400">
                      {MACHINE_LABEL[o.machine] ?? o.machine} ·{" "}
                      {formatCop(o.rate)} / ud
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-bold text-cyan-300">
                      {doneUnits} / {bundle.units}
                    </p>
                    <p className="text-slate-400">quedan {left}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Botones de marcación */}
      {bundle && op && (
        <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-xs font-semibold text-cyan-300">
              Marcando {bundle.code} · {op.name} ({formatCop(op.rate)})
            </p>
            <p className="text-xs text-slate-400">Tope disponible: {remaining} uds</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[10, 25, 50].map((step) => (
              <button
                key={step}
                type="button"
                disabled={pending || step > remaining}
                onClick={() => mark(step)}
                className="flex-1 rounded-xl bg-cyan-600 py-3 text-lg font-bold text-white transition hover:bg-cyan-500 disabled:opacity-40"
              >
                +{step}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="number"
              min={1}
              max={remaining}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              className="w-24 rounded-xl border border-slate-700 bg-slate-950 p-2 text-center text-slate-100"
            />
            <button
              type="button"
              disabled={pending}
              onClick={() => mark(Number(custom))}
              className="flex-1 rounded-xl bg-slate-800 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 disabled:opacity-40"
            >
              {pending ? "Guardando…" : "Marcar cantidad"}
            </button>
          </div>

          {message && (
            <p className="text-xs font-semibold text-emerald-400">{message}</p>
          )}
          {error && <p className="text-xs font-semibold text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}

{/* Componente Tooltip interactivo (Hover + Click) */}
function Tooltip({ text }: { text: string }) {
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
        className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-slate-800 text-cyan-400 text-[10px] font-bold border border-cyan-500/40 hover:bg-cyan-950 hover:border-cyan-300 focus:outline-none transition-colors cursor-pointer"
        aria-label="Ver explicación de este campo"
      >
        ?
      </button>

      {open && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 rounded-xl border border-cyan-500/50 bg-slate-900/95 p-3 text-[11px] font-normal leading-relaxed text-slate-200 shadow-2xl shadow-cyan-950/90 backdrop-blur z-50 pointer-events-none block text-left">
          <span className="block font-bold text-cyan-300 mb-1">💡 ¿Para qué sirve?</span>
          {text}
        </span>
      )}
    </span>
  );
}

{/* Componente del Cuaderno Digital de Trabajo Personal para Operarios libres */}
function PersonalLogbook() {
  const [workType, setWorkType] = useState<"process" | "full">("process");
  const [prenda, setPrenda] = useState("Jean Dama");
  const [color, setColor] = useState("Azul Oscuro");
  const [operacion, setOperacion] = useState("Filete (Cerrar costados)");
  const [customOp, setCustomOp] = useState("");
  const [tarifa, setTarifa] = useState("600");
  const [customQty, setCustomQty] = useState("10");
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Lista de procesos sugeridos + autocompletables
  const [processOptions, setProcessOptions] = useState<string[]>([
    "Filete (Cerrar costados)",
    "Plana (Poner cuellos)",
    "Collarín (Dobladillo / Ruedo)",
    "Presille (Refuerzos)",
    "Pegar mangas",
    "Pegar resorte / Pretina",
    "Pegar bolsillos",
    "Ensamblado de Prenda Completa",
  ]);

  const [logs, setLogs] = useState<
    {
      id: string;
      workType: "process" | "full";
      prenda: string;
      color: string;
      operacion: string;
      tarifa: number;
      units: number;
      total: number;
      formattedDate: string; // ej: Lunes, 15 Oct 2026 · 10:30 AM
      rawDate: string; // YYYY-MM-DD
      image?: string | null;
    }[]
  >(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("coretextil_personal_logs");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return [];
  });

  const todayStr = new Date().toISOString().slice(0, 10);

  // Calcular fecha de inicio de esta semana (lunes)
  const getStartOfWeek = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().slice(0, 10);
  };

  // Estados para filtro y liquidación por período de cobro
  const [startDate, setStartDate] = useState<string>(getStartOfWeek());
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [periodPreset, setPeriodPreset] = useState<"today" | "week" | "fortnight" | "custom">("week");

  // Función para cambiar de preset rápido de liquidación
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

  // Filtrado de logs por rango de fechas de liquidación
  const periodLogs = useMemo(() => {
    return logs.filter((l) => {
      if (!l.rawDate) return true;
      return l.rawDate >= startDate && l.rawDate <= endDate;
    });
  }, [logs, startDate, endDate]);

  const walletPeriod = useMemo(() => periodLogs.reduce((acc, l) => acc + l.total, 0), [periodLogs]);
  const piecesPeriod = useMemo(() => periodLogs.reduce((acc, l) => acc + l.units, 0), [periodLogs]);

  const todayLogs = useMemo(() => logs.filter((l) => l.rawDate === todayStr), [logs, todayStr]);
  const walletToday = useMemo(() => todayLogs.reduce((acc, l) => acc + l.total, 0), [todayLogs]);
  const piecesToday = useMemo(() => todayLogs.reduce((acc, l) => acc + l.units, 0), [todayLogs]);

  // Generador de mensaje de WhatsApp para Cuenta de Cobro del Período
  function getLiquidationWhatsAppUrl() {
    let breakdown = "";
    periodLogs.forEach((l, index) => {
      breakdown += `${index + 1}. ${l.prenda} (${l.color}) - ${l.operacion}: ${l.units} uds × ${formatCop(l.tarifa)} = ${formatCop(l.total)}\n`;
    });

    const text = `🧾 *CUENTA DE COBRO FORMAL DE DESTAJO* \n` +
      `📅 *Período de Corte:* Desde ${startDate} hasta ${endDate}\n\n` +
      `💰 *TOTAL A COBRAR:* ${formatCop(walletPeriod)}\n` +
      `🔢 *Total Piezas Confeccionadas:* ${piecesPeriod} uds\n` +
      `📋 *Registros en Cuaderno:* ${periodLogs.length} lotes/atados\n\n` +
      `📌 *DESGLOSE DE ACTIVIDADES:*\n` +
      (breakdown || "Sin registros en este período\n") +
      `\n---\n` +
      `💡 *Nota:* Esta cuenta de cobro fue generada automáticamente desde el Cuaderno Digital de CoreTextil.\n` +
      `Registre su taller gratis para liquidar nómina a 1 clic: https://coretextil.vercel.app`;

    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  }

  // Captura de foto opcional
  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  function addLog(units: number) {
    const rate = parseFloat(tarifa) || 0;
    if (units <= 0 || rate <= 0) return;

    // Determinar proceso activo
    let selectedProc = operacion === "OTRO" ? customOp.trim() : operacion;
    if (!selectedProc) selectedProc = "Ensamblado General";

    // Si es un nuevo proceso personalizado, añadir a la lista de opciones futuras
    if (customOp.trim() && !processOptions.includes(customOp.trim())) {
      setProcessOptions((prev) => [...prev, customOp.trim()]);
    }

    const now = new Date();
    const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const dayName = days[now.getDay()];
    const dateNum = now.getDate();
    const monthName = months[now.getMonth()];
    const year = now.getFullYear();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");

    const formattedDate = `${dayName} ${dateNum} de ${monthName} ${year} · ${hours}:${minutes}`;

    const newLog = {
      id: Date.now().toString(),
      workType,
      prenda: prenda || "Prenda General",
      color: color || "Estándar",
      operacion: selectedProc,
      tarifa: rate,
      units,
      total: rate * units,
      formattedDate,
      rawDate: todayStr,
      image: imagePreview,
    };

    const updated = [newLog, ...logs];
    setLogs(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("coretextil_personal_logs", JSON.stringify(updated));
    }
    setImagePreview(null);
    if (operacion === "OTRO") setCustomOp("");
  }

  function clearLogs() {
    if (confirm("¿Deseas reiniciar las notas de tu cuaderno personal?")) {
      setLogs([]);
      if (typeof window !== "undefined") {
        localStorage.removeItem("coretextil_personal_logs");
      }
    }
  }

  // Estado para el modal de Ticket de Novedades por WhatsApp
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketReason, setTicketReason] = useState<"missing_piece" | "damaged_fabric" | "quality_return">("missing_piece");
  const [ticketPrenda, setTicketPrenda] = useState("Jean Dama");
  const [ticketQty, setTicketQty] = useState("5");
  const [ticketNotes, setTicketNotes] = useState("Faltan bolsillos traseros en el atado");

  function getTicketWhatsAppUrl() {
    const reasonLabels = {
      missing_piece: "⚠️ Pieza Faltante en Atado",
      damaged_fabric: "✂️ Tela Dañada / Defectuosa",
      quality_return: "🔍 Devolución por Control de Calidad (Reproceso)",
    };

    const now = new Date();
    const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const dayName = days[now.getDay()];
    const dateStr = `${dayName} ${now.getDate()} de ${now.getFullYear()} · ${now.getHours()}:${now.getMinutes().toString().padStart(2, "0")}`;

    const ticketCode = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;

    const text = `🚨 *TICKET FORMAL DE NOVEDAD DE CONFECCIÓN* (${ticketCode})\n\n` +
      `📌 *Prenda / Ref:* ${ticketPrenda}\n` +
      `📋 *Motivo / Novedad:* ${reasonLabels[ticketReason]}\n` +
      `🔢 *Cantidad Afectada:* ${ticketQty} unidades\n` +
      `📅 *Fecha y Hora:* ${dateStr}\n` +
      `📝 *Observaciones:* ${ticketNotes || "Sin observaciones adicionales"}\n\n` +
      `---\n` +
      `💡 *Nota:* Este ticket fue generado desde el Cuaderno Digital de CoreTextil. Para gestionar atados, reposiciones de faltantes y nómina a 1 clic, registre su taller gratis en: https://coretextil.vercel.app`;

    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  }

  const shareText = `Hola Don Carlos, estoy usando el Cuaderno Digital de CoreTextil para llevar las cuentas de mi destajo. Registre su taller gratis en https://coretextil.vercel.app para que la nómina de todos salga lista a 1 clic.`;

  return (
    <div className="space-y-6">
      {/* Cabecera Billetera Personal */}
      <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/40 p-5 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
              📖 Mi Cuaderno Digital de Destajo (Uso Personal)
              <Tooltip text="Herramienta gratuita e independiente para anotar la producción diaria que cose un operario sin necesidad de estar registrado formalmente en un taller satélite." />
            </span>
            <h2 className="mt-1 text-2xl font-extrabold text-slate-100">
              Billetera Personal del Día
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center">
              <button
                onClick={() => setShowTicketModal(false)}
                type="button"
                className="hidden"
              />
              <button
                onClick={() => setShowTicketModal(true)}
                className="rounded-xl border border-amber-500/40 bg-amber-950/60 px-4 py-2 text-xs font-bold text-amber-300 transition hover:bg-amber-900 flex items-center gap-1"
              >
                🚨 Generar Ticket WhatsApp
              </button>
              <Tooltip text="Genera un reporte formal con código único en WhatsApp para notificar piezas faltantes, tela defectuosa o devoluciones de calidad a tu taller o marca." />
            </div>

            <div className="flex items-center">
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-500 shadow-lg shadow-emerald-950/40"
              >
                📲 Invitar a mi taller satélite
              </a>
              <Tooltip text="Envía una invitación directa por WhatsApp al dueño o encargado de tu taller para que conozca CoreTextil y pague la nómina a 1 clic." />
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 rounded-xl bg-slate-900/80 p-4 border border-slate-800">
          <div>
            <p className="text-xs text-slate-400 flex items-center">
              Ganado Hoy ($ COP)
              <Tooltip text="Cálculo automático de tus ingresos acumulados hoy: suma de (Tarifa por pieza × Cantidad de piezas confeccionadas)." />
            </p>
            <p className="text-3xl font-extrabold text-emerald-400">
              {formatCop(walletToday)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 flex items-center">
              Piezas Contadas Hoy
              <Tooltip text="Cantidad total de unidades físicas de confección que has sumado a tu cuaderno durante el día de hoy." />
            </p>
            <p className="text-3xl font-extrabold text-cyan-300">
              {piecesToday} <span className="text-sm font-normal text-slate-400">uds</span>
            </p>
          </div>
        </div>
      </div>

      {/* Calculadora y Cierre de Liquidación por Período de Cobro */}
      <div className="rounded-2xl border border-cyan-500/40 bg-slate-900/80 p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-extrabold text-slate-100 flex items-center text-lg">
              🧮 Calculadora & Cierre de Liquidación (Fecha de Corte)
              <Tooltip text="Selecciona la fecha de inicio y la fecha de corte para sumar automáticamente lo cosido durante esa semana, quincena o rango personalizado y generar tu cuenta de cobro." />
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Filtra tus cuentas por semana o quincena sin perder el historial anterior.
            </p>
          </div>

          {/* Selector de Presets Rápido */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => applyPeriodPreset("today")}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                periodPreset === "today"
                  ? "bg-cyan-600 text-white shadow-md shadow-cyan-950/50"
                  : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-white"
              }`}
            >
              📅 Hoy
            </button>
            <button
              onClick={() => applyPeriodPreset("week")}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                periodPreset === "week"
                  ? "bg-cyan-600 text-white shadow-md shadow-cyan-950/50"
                  : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-white"
              }`}
            >
              🗓️ Esta Semana
            </button>
            <button
              onClick={() => applyPeriodPreset("fortnight")}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                periodPreset === "fortnight"
                  ? "bg-cyan-600 text-white shadow-md shadow-cyan-950/50"
                  : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-white"
              }`}
            >
              📆 Esta Quincena
            </button>
            <button
              onClick={() => setPeriodPreset("custom")}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                periodPreset === "custom"
                  ? "bg-cyan-600 text-white shadow-md shadow-cyan-950/50"
                  : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-white"
              }`}
            >
              ✏️ Personalizado
            </button>
          </div>
        </div>

        {/* Rango de Fechas (Inicio / Fin) */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center">
              Fecha de Inicio (Conteo)
              <Tooltip text="Día en que comenzaste a coser este lote o quincena." />
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
            <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center">
              Fecha de Cierre (Liquidación)
              <Tooltip text="Día límite o fecha de cobro para calcular el total ganado." />
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
              className="w-full text-center rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-950/50 hover:bg-emerald-500 transition active:scale-95 flex items-center justify-center gap-1.5"
            >
              📲 Enviar Cuenta de Cobro por WhatsApp
            </a>
            <Tooltip text="Genera y envía un mensaje listo por WhatsApp con la cuenta de cobro detallada del período seleccionado." />
          </div>
        </div>

        {/* Resumen de Liquidación del Período */}
        <div className="grid grid-cols-3 gap-3 rounded-xl bg-slate-950 p-4 border border-cyan-500/20">
          <div>
            <p className="text-[11px] text-slate-400 flex items-center">
              Total a Cobrar en Período
              <Tooltip text="Suma total en pesos colombianos ($ COP) de todas las prendas registradas entre la fecha de inicio y la fecha de cierre." />
            </p>
            <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-0.5">
              {formatCop(walletPeriod)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400 flex items-center">
              Piezas en Período
              <Tooltip text="Cantidad total de piezas cosidas en el rango de fechas seleccionado." />
            </p>
            <p className="text-2xl sm:text-3xl font-black text-cyan-300 mt-0.5">
              {piecesPeriod} <span className="text-xs font-normal text-slate-400">uds</span>
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400 flex items-center">
              Anotaciones / Lotes
              <Tooltip text="Número de registros o marcaciones realizadas en el cuaderno dentro de las fechas elegidas." />
            </p>
            <p className="text-2xl sm:text-3xl font-black text-amber-300 mt-0.5">
              {periodLogs.length} <span className="text-xs font-normal text-slate-400">ítems</span>
            </p>
          </div>
        </div>
      </div>

      {/* Formulario de registro rápido personal */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-bold text-slate-200 flex items-center">
            Anotar Producción en mi Cuaderno
            <Tooltip text="Registra cada lote o cantidad de prendas producidas en tu jornada. La aplicación estampa la fecha, el día y la hora automáticamente." />
          </h3>
          <div className="flex items-center gap-1">
            <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800">
              <button
                onClick={() => setWorkType("process")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                  workType === "process" ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                ⚙️ Por Proceso / Pieza
              </button>
              <button
                onClick={() => setWorkType("full")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                  workType === "full" ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                👕 Prenda Completa
              </button>
            </div>
            <Tooltip text="Modo 'Por Proceso': cuando te pagan por operaciones específicas (Filete, Collarín, Plana). Modo 'Prenda Completa': cuando confeccionas la prenda de principio a fin." />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center">
              Prenda / Referencia
              <Tooltip text="Escribe el nombre o referencia del modelo que estás cosiendo (ej: Jean Dama, Camiseta Polo, Pantalón Dril)." />
            </label>
            <input
              type="text"
              value={prenda}
              onChange={(e) => setPrenda(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
              placeholder="Ej: Jean Dama"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center">
              Color de Prenda
              <Tooltip text="Indica el tono o color del lote para identificar y agrupar atados (ej: Azul Oscuro, Negro, Marfil)." />
            </label>
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
              placeholder="Ej: Azul Oscuro, Negro"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center">
              Operación / Proceso
              <Tooltip text="Selecciona la operación de costura o máquina utilizada. Si tu proceso no figura en la lista, selecciona 'Otro proceso' para escribirlo a mano." />
            </label>
            <select
              value={operacion}
              onChange={(e) => setOperacion(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
            >
              {processOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
              <option value="OTRO">✏️ Otro proceso (Personalizado)...</option>
            </select>
            {operacion === "OTRO" && (
              <input
                type="text"
                value={customOp}
                onChange={(e) => setCustomOp(e.target.value)}
                className="mt-2 w-full rounded-xl border border-cyan-500/50 bg-slate-950 px-3 py-1.5 text-xs text-slate-100"
                placeholder="Escribe el nombre del proceso..."
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center">
              Tarifa por Pieza ($ COP)
              <Tooltip text="El pago en pesos colombianos acordado por cada unidad o pieza terminada en esa operación." />
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

        {/* Foto de referencia opcional */}
        <div className="flex items-center gap-4 pt-1">
          <label className="cursor-pointer rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-cyan-500 flex items-center">
            📷 {imagePreview ? "Cambiar foto de referencia" : "Adjuntar foto opcional"}
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>
          <Tooltip text="Puedes tomar una foto del atado, la tiqueta o la prenda como comprobante visual guardado en tu cuaderno digital." />
          {imagePreview && (
            <div className="flex items-center gap-2">
              <img src={imagePreview} alt="Preview" className="h-8 w-8 rounded-lg object-cover border border-slate-700" />
              <button onClick={() => setImagePreview(null)} className="text-xs text-red-400 hover:underline">
                Quitar
              </button>
            </div>
          )}
        </div>

        {/* Botones de marcación rápida */}
        <div className="pt-2">
          <p className="text-xs text-slate-400 mb-2 flex items-center">
            Sumar Piezas a mi Billetera Personal:
            <Tooltip text="Toca cualquiera de los botones (+10, +25, +50, +100) para acumular piezas de inmediato o escribe la cantidad exacta y pulsa '+ Sumar'." />
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {[10, 25, 50, 100].map((qty) => (
              <button
                key={qty}
                onClick={() => addLog(qty)}
                className="flex-1 sm:flex-none rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-cyan-500 active:scale-95"
              >
                +{qty} piezas
              </button>
            ))}

            <div className="flex items-center gap-2">
              <input
                type="number"
                value={customQty}
                onChange={(e) => setCustomQty(e.target.value)}
                className="w-20 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 text-center"
              />
              <button
                onClick={() => addLog(parseInt(customQty) || 0)}
                className="rounded-xl border border-cyan-500/40 bg-cyan-950/60 px-4 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-900"
              >
                + Sumar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Historial de mi Cuaderno */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="font-bold text-slate-200 flex items-center">
            Historial de mi Cuaderno ({periodPreset === "week" ? "Esta Semana" : periodPreset === "fortnight" ? "Esta Quincena" : periodPreset === "today" ? "Hoy" : "Rango Seleccionado"})
            <Tooltip text="Muestra las anotaciones dentro del período de liquidación seleccionado. Se almacena localmente en tu teléfono o navegador." />
          </h3>
          {logs.length > 0 && (
            <button
              onClick={clearLogs}
              className="text-xs text-slate-500 hover:text-red-400 transition"
            >
              Limpiar cuaderno
            </button>
          )}
        </div>

        {periodLogs.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">
            No hay anotaciones registradas en las fechas seleccionadas ({startDate} a {endDate}). Añade prendas producidas arriba.
          </p>
        ) : (
          <div className="space-y-2.5 max-h-80 overflow-y-auto">
            {periodLogs.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 text-xs gap-3"
              >
                <div className="flex items-center gap-3">
                  {l.image && (
                    <img src={l.image} alt={l.prenda} className="h-10 w-10 rounded-lg object-cover border border-slate-800" />
                  )}
                  <div>
                    <p className="font-semibold text-slate-200">
                      {l.prenda} ({l.color}) · <span className="text-cyan-300">{l.operacion}</span>
                    </p>
                    <p className="text-slate-500 text-[11px]">{l.formattedDate} · Tarifa: {formatCop(l.tarifa)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-extrabold text-emerald-400 text-sm">+{formatCop(l.total)}</p>
                  <p className="text-slate-400 font-medium">{l.units} piezas</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Generador de Ticket WhatsApp */}
      {showTicketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 flex items-center gap-2">
                🚨 Generar Ticket Formal de Novedad
                <Tooltip text="Reporte estructurado para notificar problemas de confección a tu taller o marca con fecha y número de ticket formal." />
              </h3>
              <button
                onClick={() => setShowTicketModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 flex items-center">
                  Prenda / Referencia
                  <Tooltip text="Indica la referencia exacta de la prenda que tiene la novedad." />
                </label>
                <input
                  type="text"
                  value={ticketPrenda}
                  onChange={(e) => setTicketPrenda(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
                  placeholder="Ej: Jean Dama Azul"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 flex items-center">
                  Motivo de Novedad / Problema
                  <Tooltip text="Clasifica la novedad: Piezas faltantes en el atado cortado, tela defectuosa de corte, o prendas devueltas para desbaratar y corregir en costura." />
                </label>
                <select
                  value={ticketReason}
                  onChange={(e) => setTicketReason(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="missing_piece">⚠️ Pieza Faltante en Atado (Ej: Faltan bolsillos, mangas)</option>
                  <option value="damaged_fabric">✂️ Tela Dañada / Defectuosa de fábrica</option>
                  <option value="quality_return">🔍 Devolución por Control de Calidad (Reproceso de costura)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 flex items-center">
                    Cantidad de Piezas Afectadas
                    <Tooltip text="Número exacto de unidades involucradas en este reporte de novedad." />
                  </label>
                  <input
                    type="number"
                    value={ticketQty}
                    onChange={(e) => setTicketQty(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 flex items-center">
                  Observaciones / Detalle
                  <Tooltip text="Agrega detalles o instrucciones específicas para la persona que leerá este ticket en WhatsApp." />
                </label>
                <textarea
                  value={ticketNotes}
                  onChange={(e) => setTicketNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
                  placeholder="Describe el defecto o pieza faltante..."
                />
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <a
                href={getTicketWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowTicketModal(false)}
                className="w-full text-center rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-950/50 hover:bg-emerald-500"
              >
                📲 Enviar Ticket Formal por WhatsApp
              </a>
              <button
                onClick={() => setShowTicketModal(false)}
                className="w-full text-center rounded-xl border border-slate-800 py-2 text-xs text-slate-400 hover:text-white"
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

