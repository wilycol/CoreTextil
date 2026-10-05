"use client";

import { useMemo, useState, useTransition } from "react";
import type { OpLite } from "./page";
import { fixedUnitCost, profitabilityLight } from "@/lib/costing";
import { formatCop } from "@/lib/cop";
import { saveSatelliteRates } from "./actions";

type OrderLite = {
  id: string;
  label: string;
  unitPrice: number;
  garmentId: string;
};

const MACHINE_LABEL: Record<string, string> = {
  plana: "Plana",
  fileteadora: "Fileteadora",
  collarin: "Collarín",
};

export default function SimClient({
  orders,
  opsByGarment,
  cfi,
}: {
  orders: OrderLite[];
  opsByGarment: Record<string, OpLite[]>;
  cfi: number | null;
}) {
  const [orderId, setOrderId] = useState(orders[0]?.id ?? "");
  const order = orders.find((o) => o.id === orderId) ?? null;
  const originalOps = order ? (opsByGarment[order.garmentId] ?? []) : [];

  // State to hold custom piecemeal rates per operation ID
  const [customRates, setCustomRates] = useState<Record<string, number>>({});
  
  const ops = useMemo(() => {
    return originalOps.map((op) => ({
      ...op,
      base_rate_cop: customRates[op.id] ?? op.base_rate_cop,
    }));
  }, [originalOps, customRates]);

  const defaultPool = useMemo(
    () => ops.reduce((acc, o) => acc + Number(o.base_rate_cop), 0),
    [ops]
  );
  const [poolOverride, setPoolOverride] = useState<string | null>(null);
  const pool = poolOverride !== null ? Number(poolOverride) || 0 : defaultPool;

  const sim = useMemo(() => {
    if (!order || cfi === null || !Number.isFinite(cfi)) return null;
    const net = order.unitPrice - cfi - pool;
    const marginPct = order.unitPrice > 0 ? (net / order.unitPrice) * 100 : 0;
    return {
      net,
      marginPct,
      light: profitabilityLight(marginPct),
    };
  }, [order, cfi, pool]);

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleSaveRates() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const payload = Object.entries(customRates).map(([id, rate]) => ({
        operation_id: id,
        satellite_rate_cop: rate,
      }));
      
      if (payload.length === 0) {
        setError("No hay cambios para guardar.");
        return;
      }

      const res = await saveSatelliteRates(payload);
      if (res.ok) {
        setSuccess("Tarifas personalizadas guardadas con éxito.");
      } else {
        setError(res.error ?? "No se pudieron guardar las tarifas.");
      }
    });
  }

  function handleRateChange(opId: string, value: string) {
    const num = parseInt(value, 10);
    setCustomRates((prev) => ({
      ...prev,
      [opId]: isNaN(num) ? 0 : num,
    }));
  }

  if (orders.length === 0) {
    return (
      <p className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-slate-300">
        Cuando una marca te asigne una orden, la simulas aquí.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {cfi === null && (
        <p className="rounded-xl border border-amber-800 bg-amber-950/40 p-4 text-sm text-amber-300">
          Primero registra tus costos fijos en{" "}
          <a href="/dashboard/satelite" className="underline">
            Mi taller
          </a>{" "}
          para que la simulación sea real.
        </p>
      )}

      <label className="block text-sm">
        <span className="mb-1 block text-slate-400">Orden a simular</span>
        <select
          value={orderId}
          onChange={(e) => {
            setOrderId(e.target.value);
            setPoolOverride(null);
          }}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500"
        >
          {orders.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      {order && sim && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs text-slate-400">Ingreso por unidad</p>
              <p className="mt-1 text-lg font-bold">
                {formatCop(order.unitPrice)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs text-slate-400">Costo fijo (CFI)</p>
              <p className="mt-1 text-lg font-bold text-amber-300">
                −{formatCop(Math.round(cfi ?? 0))}
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs text-slate-400">Bolsa operarios</p>
              <p className="mt-1 text-lg font-bold text-cyan-300">
                −{formatCop(pool)}
              </p>
            </div>
            <div className={`rounded-xl border p-4 ${sim.light.cls}`}>
              <p className="text-xs opacity-80">Margen neto ({sim.light.label})</p>
              <p className="mt-1 text-lg font-bold">
                {formatCop(Math.round(sim.net))}
              </p>
              <p className="text-xs opacity-70">{sim.marginPct.toFixed(1)}% por unidad</p>
            </div>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block text-slate-400">
              Bolsa de operarios (ajústala para negociar)
            </span>
            <input
              value={poolOverride ?? String(defaultPool)}
              onChange={(e) => setPoolOverride(e.target.value)}
              inputMode="numeric"
              className="w-48 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500"
            />
          </label>

          {ops.length > 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-300">
                  Distribución del destajo por máquina
                </h2>
                <button
                  onClick={handleSaveRates}
                  disabled={pending}
                  className="rounded bg-cyan-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-50"
                >
                  {pending ? "Guardando..." : "Guardar mis Tarifas"}
                </button>
              </div>
              
              {error && <p className="mb-2 text-xs text-red-400">{error}</p>}
              {success && <p className="mb-2 text-xs text-emerald-400">{success}</p>}

              <table className="w-full text-sm">
                <thead className="text-left text-slate-500">
                  <tr>
                    <th className="py-2">Operación</th>
                    <th>Máquina</th>
                    <th className="text-right">Destajo (COP)</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  {ops.map((o, i) => (
                    <tr key={i} className="border-t border-slate-800">
                      <td className="py-2 pr-2">{o.operation_name}</td>
                      <td className="pr-2">{MACHINE_LABEL[o.machine_type] ?? o.machine_type}</td>
                      <td className="text-right py-2">
                        <input
                          type="number"
                          value={o.base_rate_cop}
                          onChange={(e) => handleRateChange(o.id, e.target.value)}
                          className="w-24 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-right text-slate-100 outline-none focus:border-cyan-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
