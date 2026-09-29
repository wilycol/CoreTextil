"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveSizeFactors } from "./actions";

export default function SizeFactorsEditor({
  garmentId,
  initial,
}: {
  garmentId: string;
  initial: Record<string, number>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [sizes, setSizes] = useState<{ size: string; factor: string }[]>(() => {
    const extras = Object.entries(initial).filter(
      ([s]) => !["XS", "S", "M", "L", "XL", "XXL"].includes(s)
    );
    return [
      ...["XS", "S", "M", "L", "XL", "XXL"].map((s) => ({
        size: s,
        factor: initial[s] != null ? String(initial[s]) : "",
      })),
      ...extras.map(([size, factor]) => ({ size, factor: String(factor) })),
    ];
  });

  function update(idx: number, value: string) {
    setSaved(false);
    setSizes((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, factor: value } : row))
    );
  }

  function addRow() {
    setSaved(false);
    setSizes((prev) => [...prev, { size: "", factor: "1" }]);
  }

  function save() {
    setError(null);
    const factors: Record<string, number> = {};
    for (const { size, factor } of sizes) {
      const f = Number(factor);
      if (factor.trim() === "") continue; // vacío = default
      if (!Number.isFinite(f) || f <= 0 || f > 3) {
        setError("Los factores deben ser números entre 0 y 3 (ej: 1.05).");
        return;
      }
      factors[size] = f;
    }
    startTransition(async () => {
      const res = await saveSizeFactors(garmentId, factors);
      if (res.ok) {
        setSaved(true);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="text-sm font-semibold text-slate-900">
        Factores de consumo por talla
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Deja vacío para usar el estándar de la industria: XS 0.95 · S 1 · M 1 ·
        L 1.05 · XL 1.1 · XXL 1.2.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {sizes.map((row, i) => (
          <label key={i} className="text-xs">
            <span className="mb-1 block font-semibold text-slate-600">
              {row.size || "Talla"}
            </span>
            <div className="flex items-center gap-1">
              <input
                value={row.size}
                disabled={i < 6}
                onChange={(e) =>
                  setSizes((prev) =>
                    prev.map((r, j) =>
                      j === i ? { ...r, size: e.target.value.toUpperCase() } : r
                    )
                  )
                }
                placeholder="3T"
                className="w-14 rounded-md border border-slate-300 px-2 py-1.5 text-slate-900 outline-none focus:border-cyan-600 disabled:bg-slate-100"
              />
              <input
                value={row.factor}
                onChange={(e) => update(i, e.target.value)}
                inputMode="decimal"
                placeholder="1.05"
                className="w-16 rounded-md border border-slate-300 px-2 py-1.5 text-slate-900 outline-none focus:border-cyan-600"
              />
            </div>
            <span className="mt-0.5 block text-[10px] text-slate-400">
              multiplicador
            </span>
          </label>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          onClick={addRow}
          className="text-xs font-semibold text-cyan-700 hover:underline"
        >
          + Agregar talla (ej: 3T, 10A)
        </button>
        <button
          onClick={save}
          disabled={pending}
          className="rounded-lg border border-cyan-700 bg-white px-4 py-1.5 text-xs font-semibold text-cyan-800 hover:bg-cyan-50 disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Guardar factores"}
        </button>
        {saved && <span className="text-xs text-emerald-600">Guardado ✓</span>}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </div>
  );
}
