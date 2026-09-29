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
      const res = await logProduction(bundle.id, op.id, units);
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

  if (data.orders.length === 0) {
    return (
      <p className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-slate-300">
        Todavía no tienes atados asignados. Cuando tu marca despache un corte a
        tu taller, aparecerá aquí.
      </p>
    );
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
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-3 text-base text-slate-100 outline-none focus:border-cyan-500"
        >
          {data.orders.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      {/* Paso 2: atado */}
      <div>
        <p className="mb-2 text-sm text-slate-400">2 · Atado</p>
        <div className="flex flex-wrap gap-2">
          {orderBundles.map((b) => (
            <button
              key={b.id}
              onClick={() => {
                setBundleId(b.id);
                setOpId(null);
              }}
              className={`rounded-xl border px-3 py-2 text-left font-mono text-sm transition ${
                b.id === bundleId
                  ? "border-cyan-500 bg-cyan-950 text-cyan-200"
                  : "border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-600"
              }`}
            >
              {b.code}
              <span className="ml-2 text-xs text-slate-400">
                {b.units}u
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Paso 3: operación */}
      {bundle && (
        <div>
          <p className="mb-2 text-sm text-slate-400">3 · Operación</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {garmentOps.map((o) => {
              const rem = Math.max(
                0,
                bundle.units - (done[`${bundle.id}:${o.id}`] ?? 0)
              );
              return (
                <button
                  key={o.id}
                  onClick={() => setOpId(o.id)}
                  disabled={rem === 0}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition disabled:opacity-40 ${
                    o.id === opId
                      ? "border-cyan-500 bg-cyan-950 text-cyan-200"
                      : "border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-600"
                  }`}
                >
                  <span>
                    {o.name}
                    <span className="ml-2 text-xs text-slate-400">
                      {MACHINE_LABEL[o.machine] ?? o.machine}
                    </span>
                  </span>
                  <span className="text-xs text-slate-400">
                    {formatCop(o.rate)} · faltan {rem}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Paso 4: marcación rápida */}
      {bundle && op && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <p className="text-sm text-slate-400">
            4 · Registrar piezas{" "}
            <span className="text-slate-500">
              (máximo {remaining} para este atado)
            </span>
          </p>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {[10, 25, 50].map((n) => (
              <button
                key={n}
                onClick={() => mark(Math.min(n, remaining))}
                disabled={pending || remaining === 0}
                className="rounded-xl bg-cyan-600 py-4 text-xl font-extrabold text-white transition active:scale-95 hover:bg-cyan-500 disabled:opacity-40"
              >
                +{n}
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              inputMode="numeric"
              className="w-24 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500"
            />
            <button
              onClick={() => mark(Math.min(Number(custom) || 0, remaining))}
              disabled={pending || remaining === 0}
              className="flex-1 rounded-lg border border-cyan-600 px-4 py-2 font-semibold text-cyan-300 transition hover:bg-cyan-950 disabled:opacity-40"
            >
              Registrar cantidad
            </button>
          </div>

          {message && (
            <p className="mt-3 rounded-lg bg-emerald-950 px-3 py-2 text-sm text-emerald-300">
              {message}
            </p>
          )}
          {error && (
            <p className="mt-3 rounded-lg bg-red-950 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
