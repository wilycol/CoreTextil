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

{/* Componente del Cuaderno Digital de Trabajo Personal para Operarios libres */}
function PersonalLogbook() {
  const [prenda, setPrenda] = useState("Jean de Dama");
  const [operacion, setOperacion] = useState("Fileteadora");
  const [tarifa, setTarifa] = useState("600");
  const [customQty, setCustomQty] = useState("10");

  const [logs, setLogs] = useState<
    {
      id: string;
      prenda: string;
      operacion: string;
      tarifa: number;
      units: number;
      total: number;
      date: string;
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
  const todayLogs = logs.filter((l) => l.date === todayStr);

  const walletToday = todayLogs.reduce((acc, l) => acc + l.total, 0);
  const piecesToday = todayLogs.reduce((acc, l) => acc + l.units, 0);

  function addLog(units: number) {
    const rate = parseFloat(tarifa) || 0;
    if (units <= 0 || rate <= 0) return;

    const newLog = {
      id: Date.now().toString(),
      prenda: prenda || "Prenda General",
      operacion: operacion || "Ensamblado",
      tarifa: rate,
      units,
      total: rate * units,
      date: todayStr,
    };

    const updated = [newLog, ...logs];
    setLogs(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("coretextil_personal_logs", JSON.stringify(updated));
    }
  }

  function clearLogs() {
    if (confirm("¿Deseas reiniciar las notas de tu cuaderno personal?")) {
      setLogs([]);
      if (typeof window !== "undefined") {
        localStorage.removeItem("coretextil_personal_logs");
      }
    }
  }

  const shareText = `Hola Don Carlos, estoy usando el Cuaderno Digital de CoreTextil para llevar las cuentas de mi destajo. Registre su taller gratis en https://coretextil.vercel.app para que la nómina de todos salga lista a 1 clic.`;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/40 p-5 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
              📖 Mi Cuaderno Digital de Destajo (Uso Personal)
            </span>
            <h2 className="mt-1 text-2xl font-extrabold text-slate-100">
              Billetera Personal del Día
            </h2>
          </div>
          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-500 shadow-lg shadow-emerald-950/40"
          >
            📲 Invitar a mi taller satélite
          </a>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 rounded-xl bg-slate-900/80 p-4 border border-slate-800">
          <div>
            <p className="text-xs text-slate-400">Ganado Hoy ($ COP)</p>
            <p className="text-3xl font-extrabold text-emerald-400">
              {formatCop(walletToday)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Piezas Contadas Hoy</p>
            <p className="text-3xl font-extrabold text-cyan-300">
              {piecesToday} <span className="text-sm font-normal text-slate-400">uds</span>
            </p>
          </div>
        </div>
      </div>

      {/* Formulario de registro rápido personal */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <h3 className="font-bold text-slate-200">Anotar Producción en mi Cuaderno</h3>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Prenda / Ref</label>
            <input
              type="text"
              value={prenda}
              onChange={(e) => setPrenda(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
              placeholder="Ej: Jean Dama"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Operación / Máquina</label>
            <input
              type="text"
              value={operacion}
              onChange={(e) => setOperacion(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
              placeholder="Ej: Fileteadora"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Tarifa por Pieza ($ COP)</label>
            <input
              type="number"
              value={tarifa}
              onChange={(e) => setTarifa(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
              placeholder="Ej: 600"
            />
          </div>
        </div>

        {/* Botones de marcación rápida */}
        <div className="pt-2">
          <p className="text-xs text-slate-400 mb-2">Sumar Piezas a mi Billetera Personal:</p>
          <div className="flex flex-wrap items-center gap-3">
            {[10, 25, 50].map((qty) => (
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
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-200">Historial de mi Cuaderno</h3>
          {logs.length > 0 && (
            <button
              onClick={clearLogs}
              className="text-xs text-slate-500 hover:text-red-400 transition"
            >
              Limpiar notas
            </button>
          )}
        </div>

        {logs.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">
            Tu cuaderno está limpio. Añade tus primeras piezas producidas arriba.
          </p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {logs.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/60 px-4 py-2.5 text-xs"
              >
                <div>
                  <p className="font-semibold text-slate-200">{l.prenda} · {l.operacion}</p>
                  <p className="text-slate-500">{l.date} · Tarifa: {formatCop(l.tarifa)}</p>
                </div>
                <div className="text-right">
                  <p className="font-extrabold text-emerald-400">+{formatCop(l.total)}</p>
                  <p className="text-slate-400 font-medium">{l.units} piezas</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
