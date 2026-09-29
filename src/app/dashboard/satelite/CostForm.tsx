"use client";

import { useState, useTransition } from "react";
import { fixedUnitCost } from "@/lib/costing";
import { formatCop } from "@/lib/cop";
import { saveCostProfile } from "./actions";

type Initial = {
  rent_monthly: number;
  energy_monthly: number;
  consumables_monthly: number;
  maintenance_monthly: number;
  estimated_monthly_units: number;
} | null;

const FIELDS: { key: keyof NonNullable<Initial>; label: string }[] = [
  { key: "rent_monthly", label: "Arriendo mensual" },
  { key: "energy_monthly", label: "Energía mensual" },
  { key: "consumables_monthly", label: "Consumibles (agujas, hilos, lubricante)" },
  { key: "maintenance_monthly", label: "Mantenimiento de máquinas" },
  { key: "estimated_monthly_units", label: "Capacidad mensual (prendas)" },
];

export default function CostForm({ initial }: { initial: Initial }) {
  const [values, setValues] = useState<Record<string, string>>({
    rent_monthly: String(initial?.rent_monthly ?? 0),
    energy_monthly: String(initial?.energy_monthly ?? 0),
    consumables_monthly: String(initial?.consumables_monthly ?? 0),
    maintenance_monthly: String(initial?.maintenance_monthly ?? 0),
    estimated_monthly_units: String(initial?.estimated_monthly_units ?? 1000),
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const numeric = {
    rent_monthly: Number(values.rent_monthly) || 0,
    energy_monthly: Number(values.energy_monthly) || 0,
    consumables_monthly: Number(values.consumables_monthly) || 0,
    maintenance_monthly: Number(values.maintenance_monthly) || 0,
    estimated_monthly_units: Number(values.estimated_monthly_units) || 0,
  };

  const cfi = fixedUnitCost(numeric);

  function submit() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await saveCostProfile(numeric);
      if (res.ok) setSaved(true);
      else setError(res.error ?? "Error inesperado");
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <label key={f.key} className="text-sm">
            <span className="mb-1 block text-slate-400">{f.label}</span>
            <input
              value={values[f.key]}
              onChange={(e) =>
                setValues((v) => ({ ...v, [f.key]: e.target.value }))
              }
              inputMode="numeric"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500"
            />
          </label>
        ))}
      </div>

      <div className="rounded-2xl border border-cyan-900 bg-cyan-950/30 p-5">
        <p className="text-sm text-cyan-200">Tu costo fijo unitario (CFI)</p>
        <p className="mt-1 text-3xl font-extrabold text-cyan-300">
          {formatCop(Math.round(cfi))}
        </p>
        <p className="mt-1 text-xs text-cyan-400/70">
          Por cada prenda que ensambles, este monto cubre tu estructura. Si el
          destajo que te ofrecen no lo cubre con margen, es mejor no aceptar el
          corte.
        </p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {saved && <p className="text-sm text-emerald-400">Costos guardados.</p>}

      <button
        onClick={submit}
        disabled={pending}
        className="w-full rounded-lg bg-cyan-600 px-4 py-3 font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-50"
      >
        {pending ? "Guardando…" : "Guardar costos fijos"}
      </button>
    </div>
  );
}
