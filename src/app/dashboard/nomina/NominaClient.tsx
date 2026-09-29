"use client";

import { useMemo, useState, useTransition } from "react";
import { formatCop } from "@/lib/cop";
import { savePayroll } from "./actions";

export type NominaData = {
  team: { id: string; full_name: string }[];
  entries: { operatorId: string; units: number; earned: number; loggedAt: string }[];
  history: {
    periodStart: string;
    periodEnd: string;
    total: number;
    units: number;
    operatorCount: number;
  }[];
};

const PERIODS = [
  { id: "semana", label: "Esta semana" },
  { id: "quincena", label: "Quincena actual" },
  { id: "mes", label: "Mes en curso" },
] as const;

function periodRange(id: string): { start: string; end: string; label: string } {
  const now = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (id === "semana") {
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    return { start: iso(monday), end: iso(now), label: `Semana del ${iso(monday)}` };
  }
  if (id === "quincena") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    if (now.getDate() > 15) {
      const start2 = new Date(now.getFullYear(), now.getMonth(), 16);
      return { start: iso(start2), end: iso(now), label: "Quincena 2" };
    }
    return { start: iso(start), end: iso(now), label: "Quincena 1" };
  }
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  return { start: iso(first), end: iso(now), label: "Mes en curso" };
}

export default function NominaClient({ data }: { data: NominaData }) {
  const [periodId, setPeriodId] = useState<string>("semana");
  const range = periodRange(periodId);
  const [startDate, setStartDate] = useState(range.start);
  const [endDate, setEndDate] = useState(range.end);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // FIX QA: agregado por rango elegido (antes se mostraba siempre la semana)
  const agg = useMemo(() => {
    const map = new Map<string, { units: number; earned: number }>();
    for (const e of data.entries) {
      const d = e.loggedAt.slice(0, 10);
      if (d < startDate || d > endDate) continue;
      const cur = map.get(e.operatorId) ?? { units: 0, earned: 0 };
      map.set(e.operatorId, { units: cur.units + e.units, earned: cur.earned + e.earned });
    }
    return map;
  }, [data.entries, startDate, endDate]);

  const rows = data.team
    .map((t) => ({
      ...t,
      units: agg.get(t.id)?.units ?? 0,
      earned: agg.get(t.id)?.earned ?? 0,
    }))
    .sort((a, b) => b.earned - a.earned);

  const totalEarned = rows.reduce((a, r) => a + r.earned, 0);
  const totalUnits = rows.reduce((a, r) => a + r.units, 0);
  const active = rows.filter((r) => r.units > 0).length;

  function pickPeriod(id: string) {
    setPeriodId(id);
    const r = periodRange(id);
    setStartDate(r.start);
    setEndDate(r.end);
    setSaved(null);
  }

  function save() {
    setError(null);
    setSaved(null);
    startTransition(async () => {
      const res = await savePayroll(startDate, endDate);
      if (res.ok) setSaved(`Liquidación guardada del ${startDate} al ${endDate}.`);
      else setError(res.error ?? "No se pudo guardar.");
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            onClick={() => pickPeriod(p.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              periodId === p.id
                ? "bg-cyan-600 text-white"
                : "border border-slate-700 text-slate-300 hover:border-cyan-500"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3 text-sm">
        <label>
          <span className="mb-1 block text-slate-400">Desde</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setSaved(null); }}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500"
          />
        </label>
        <label>
          <span className="mb-1 block text-slate-400">Hasta</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setSaved(null); }}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500"
          />
        </label>
        <button
          onClick={save}
          disabled={pending || active === 0}
          className="ml-auto rounded-lg bg-emerald-600 px-5 py-2.5 font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-40"
        >
          {pending ? "Guardando…" : "Guardar liquidación"}
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {saved && <p className="text-sm text-emerald-400">{saved}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-left text-slate-400">
            <tr>
              <th className="px-4 py-3">Operario</th>
              <th className="text-right">Piezas</th>
              <th className="text-right">Destajo ganado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-800">
                <td className="px-4 py-3 text-slate-200">{r.full_name}</td>
                <td className="text-right text-slate-300">{r.units}</td>
                <td className="text-right font-semibold text-emerald-300">
                  {formatCop(r.earned)}
                </td>
              </tr>
            ))}
            <tr className="border-t border-slate-700 bg-slate-900/70 font-bold">
              <td className="px-4 py-3">Total ({active} activos)</td>
              <td className="text-right">{totalUnits}</td>
              <td className="text-right text-emerald-300">{formatCop(totalEarned)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {data.history.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-300">
            Liquidaciones guardadas
          </h2>
          <ul className="space-y-2 text-sm text-slate-400">
            {data.history.map((h, i) => (
              <li key={i} className="flex justify-between gap-4">
                <span>
                  {h.periodStart} → {h.periodEnd}
                </span>
                <span>
                  {h.units} pzas · {h.operatorCount} operarios ·{" "}
                  <b className="text-emerald-300">{formatCop(h.total)}</b>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
