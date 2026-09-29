"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { GarmentsRow } from "@/lib/db.types";
import { formatCop } from "@/lib/cop";
import { createOrder } from "./actions";

type MatrixRow = { size: string; color: string; units: number };

export default function NewOrderForm({
  garments,
  preselectedGarment,
}: {
  garments: GarmentsRow[];
  preselectedGarment: string | null;
}) {
  const router = useRouter();
  const [garmentId, setGarmentId] = useState(preselectedGarment ?? garments[0]?.id ?? "");
  const [satelliteEmail, setSatelliteEmail] = useState("");
  const [unitPrice, setUnitPrice] = useState("4000");
  const [rows, setRows] = useState<MatrixRow[]>([
    { size: "S", color: "NEGRO", units: 0 },
    { size: "M", color: "NEGRO", units: 0 },
    { size: "L", color: "NEGRO", units: 0 },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const totalUnits = useMemo(
    () => rows.reduce((acc, r) => acc + (Number(r.units) || 0), 0),
    [rows]
  );

  function updateRow(i: number, patch: Partial<MatrixRow>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function submit() {
    setError(null);
    if (!garmentId) return setError("Selecciona una prenda (o crea una primero).");
    if (totalUnits <= 0) return setError("La matriz debe sumar al menos 1 unidad.");
    startTransition(async () => {
      const res = await createOrder({
        garmentId,
        satelliteEmail: satelliteEmail.trim() || null,
        unitPriceAgreed: Number(unitPrice) || 0,
        matrix: rows
          .map((r) => ({
            size: r.size.trim().toUpperCase(),
            color: r.color.trim().toUpperCase().replace(/\s+/g, "-"),
            units: Number(r.units) || 0,
          }))
          .filter((r) => r.units > 0),
      });
      if (res.ok) {
        router.push(`/dashboard/ordenes/${res.orderId}`);
      } else {
        setError(res.error ?? "Error inesperado");
      }
    });
  }

  if (garments.length === 0) {
    return (
      <p className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-slate-300">
        Primero crea una prenda en{" "}
        <a href="/dashboard/nueva-prenda" className="text-cyan-300 underline">
          ADN de prenda
        </a>
        .
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-slate-400">Prenda</span>
          <select
            value={garmentId}
            onChange={(e) => setGarmentId(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500"
          >
            {garments.map((g) => (
              <option key={g.id} value={g.id}>
                {g.reference_code} · {g.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-400">
            Email del satélite (opcional, se vincula al enviar)
          </span>
          <input
            value={satelliteEmail}
            onChange={(e) => setSatelliteEmail(e.target.value)}
            type="email"
            placeholder="taller@ejemplo.com"
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-400">
            Destajo total por prenda (COP)
          </span>
          <input
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            inputMode="numeric"
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500"
          />
        </label>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-300">
            Matriz de tendido (talla × color)
          </h2>
          <button
            onClick={() =>
              setRows((rs) => [...rs, { size: "M", color: "NEGRO", units: 0 }])
            }
            className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:border-cyan-500"
          >
            + Fila
          </button>
        </div>
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={r.size}
                onChange={(e) => updateRow(i, { size: e.target.value })}
                placeholder="Talla"
                className="w-24 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500"
              />
              <input
                value={r.color}
                onChange={(e) => updateRow(i, { color: e.target.value })}
                placeholder="Color"
                className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500"
              />
              <input
                value={r.units}
                onChange={(e) =>
                  updateRow(i, { units: Number(e.target.value) || 0 })
                }
                inputMode="numeric"
                placeholder="Unidades"
                className="w-28 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500"
              />
              <button
                onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}
                className="rounded-lg px-2 py-1 text-slate-500 hover:text-red-400"
                aria-label="Quitar fila"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-slate-400">
          Total: <b className="text-cyan-300">{totalUnits}</b> unidades ·
          Valor del lote:{" "}
          <b className="text-cyan-300">
            {formatCop(totalUnits * (Number(unitPrice) || 0))}
          </b>
        </p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        onClick={submit}
        disabled={pending}
        className="w-full rounded-lg bg-cyan-600 px-4 py-3 font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-50"
      >
        {pending ? "Creando orden…" : "Crear orden y generar atados con QR"}
      </button>
    </div>
  );
}
