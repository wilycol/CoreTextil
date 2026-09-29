"use client";

import { useMemo, useState } from "react";
import type { OpLite } from "./page";
import { fixedUnitCost, profitabilityLight } from "@/lib/costing";
import { formatCop } from "@/lib/cop";

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
  const ops = order ? (opsByGarment[order.garmentId] ?? []) : [];

  const defaultPool = useMemo(
    () => ops.reduce((acc, o) => acc + Number(o.base_rate_cop), 0),
    [ops]
  );
  const [poolOverride, setPoolOverride] = useState<string | null>(null);
  const pool = poolOverride !== null ? Number(poolOverride) || 0 : defaultPool;

  const sim = useMemo(() => {
    // FIX QA: sin costos fijos registrados no hay simulación (antes CFI nulo
    // se trataba como 0 y mostraba un margen irreal).
    if (!order || cfi === null || !Number.isFinite(cfi)) return null;
    const net = order.unitPrice - cfi - pool;
    const marginPct = order.unitPrice > 0 ? (net / order.unitPrice) * 100 : 0;
    return {
      net,
      marginPct,
      light: profitabilityLight(marginPct),
    };
  }, [order, cfi, pool]);

  const byMachine = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const o of ops) {
      totals[o.machine_type] = (totals[o.machine_type] ?? 0) + Number(o.base_rate_cop);
    }
    return totals;
  }, [ops]);

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
              <h2 className="mb-3 text-sm font-semibold text-slate-300">
                Distribución sugerida del destajo por máquina
              </h2>
              <table className="w-full text-sm">
                <thead className="text-left text-slate-500">
                  <tr>
                    <th className="py-1">Operación</th>
                    <th>Máquina</th>
                    <th className="text-right">Destajo</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  {ops.map((o, i) => (
                    <tr key={i} className="border-t border-slate-800">
                      <td className="py-1">{o.operation_name}</td>
                      <td>{MACHINE_LABEL[o.machine_type] ?? o.machine_type}</td>
                      <td className="text-right">{formatCop(Number(o.base_rate_cop))}</td>
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
