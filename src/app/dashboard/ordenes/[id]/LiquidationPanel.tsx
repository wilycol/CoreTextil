"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatCop } from "@/lib/cop";
import { liquidateOrder } from "./actions";

export default function LiquidationPanel({
  orderId,
  deliveredUnits,
  pendingUnits,
  unitPrice,
  alreadyLiquidated,
}: {
  orderId: string;
  deliveredUnits: number;
  pendingUnits: number;
  unitPrice: number;
  alreadyLiquidated: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ total: number; units: number } | null>(null);
  const [pending, startTransition] = useTransition();

  const disabled = alreadyLiquidated || deliveredUnits === 0;

  function pay() {
    if (
      !confirm(
        `¿Liquidar ${deliveredUnits} prendas entregadas a ${formatCop(unitPrice)} c/u?\n` +
          `Total: ${formatCop(deliveredUnits * unitPrice)}`
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await liquidateOrder(orderId);
      if (res.ok) {
        setDone({ total: res.totalCop, units: res.units });
        router.refresh();
      } else {
        setError(res.error ?? "No se pudo liquidar.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <h2 className="text-sm font-semibold text-slate-300">
        Liquidación por corte (por piezas entregadas)
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-900 bg-emerald-950/40 p-4">
          <p className="text-xs text-emerald-300/80">Prendas entregadas</p>
          <p className="mt-1 text-xl font-extrabold text-emerald-300">
            {deliveredUnits}
          </p>
          <p className="text-xs text-emerald-400/60">
            {formatCop(deliveredUnits * unitPrice)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-400">Por ensamblar</p>
          <p className="mt-1 text-xl font-extrabold text-slate-200">
            {pendingUnits}
          </p>
          <p className="text-xs text-slate-500">
            {formatCop(pendingUnits * unitPrice)}
          </p>
        </div>
        <div className="flex flex-col justify-center">
          {done ? (
            <p className="text-sm font-semibold text-emerald-300">
              Liquidadas {done.units} prendas · {formatCop(done.total)}
            </p>
          ) : (
            <button
              onClick={pay}
              disabled={pending || disabled}
              className="rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-40"
            >
              {alreadyLiquidated
                ? "Orden ya liquidada"
                : pending
                  ? "Liquidando…"
                  : `Liquidar ${deliveredUnits} prendas`}
            </button>
          )}
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      <p className="mt-3 text-xs text-slate-500">
        Se liquida lo entregado: una prenda cuenta como entregada cuando todas
        sus operaciones están marcadas en el atado. Al liquidar, la orden pasa
        a «Completada».
      </p>
    </div>
  );
}
