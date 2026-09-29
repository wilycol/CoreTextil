"use client";

import { useState, useTransition } from "react";
import { createTicket, approveTicket, dispatchTicket } from "./actions";

export type TicketsData = {
  role: string;
  bundles: { id: string; code: string }[];
  tickets: {
    id: string;
    status: string;
    reason: string;
    quantity: number;
    bundleCode: string;
    partName: string | null;
    createdAt: string;
  }[];
};

const STATUS_FLOW: Record<string, { text: string; cls: string }> = {
  pending_satellite: {
    text: "1 · Esperando jefe de satélite",
    cls: "bg-amber-950 text-amber-300",
  },
  approved_satellite: {
    text: "2 · En mesa de corte (marca)",
    cls: "bg-cyan-950 text-cyan-300",
  },
  in_cutting_room: {
    text: "3 · Cortando reposición",
    cls: "bg-indigo-950 text-indigo-300",
  },
  dispatched: {
    text: "4 · En camino al satélite",
    cls: "bg-cyan-950 text-cyan-300",
  },
  resolved: { text: "Resuelto", cls: "bg-emerald-950 text-emerald-300" },
  cancelled: { text: "Cancelado", cls: "bg-slate-800 text-slate-400" },
};

const REASONS = [
  { value: "missing_piece", label: "Pieza faltante" },
  { value: "damaged_fabric", label: "Tela dañada" },
  { value: "shortage_supplies", label: "Insumos insuficientes" },
];

export default function TicketsClient({ data }: { data: TicketsData }) {
  const [bundleId, setBundleId] = useState("");
  const [reason, setReason] = useState("missing_piece");
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canCreate = data.role === "operator" || data.role === "satellite_owner";
  const isOwner = data.role === "satellite_owner";
  const isBrand =
    data.role === "brand_admin" || data.role === "designer" || data.role === "cutter";

  function create() {
    setError(null);
    setOk(null);
    if (!bundleId) return setError("Elige el atado con el problema.");
    startTransition(async () => {
      const res = await createTicket(
        bundleId,
        Number(quantity) || 0,
        reason as "missing_piece" | "damaged_fabric" | "shortage_supplies"
      );
      if (res.ok) {
        setOk("Ticket creado. Tu jefe de taller lo validará en planta.");
        setBundleId("");
      } else setError(res.error ?? "Error inesperado");
    });
  }

  function act(
    fn: (id: string) => Promise<{ ok: boolean; error?: string }>,
    id: string,
    msg: string
  ) {
    setError(null);
    setOk(null);
    startTransition(async () => {
      const res = await fn(id);
      if (res.ok) setOk(msg);
      else setError(res.error ?? "Error inesperado");
    });
  }

  return (
    <div className="space-y-8">
      {canCreate && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-sm font-semibold text-slate-300">
            Reportar faltante
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block text-slate-400">Atado</span>
              <select
                value={bundleId}
                onChange={(e) => setBundleId(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100 outline-none focus:border-cyan-500"
              >
                <option value="">Selecciona…</option>
                {data.bundles.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-400">Motivo</span>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500"
              >
                {REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-400">Cantidad</span>
              <input
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                inputMode="numeric"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500"
              />
            </label>
          </div>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          {ok && <p className="mt-3 text-sm text-emerald-400">{ok}</p>}
          <button
            onClick={create}
            disabled={pending}
            className="mt-4 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-50"
          >
            {pending ? "Enviando…" : "Crear ticket"}
          </button>
        </div>
      )}

      {!canCreate && (error || ok) && (
        <p className={`text-sm ${error ? "text-red-400" : "text-emerald-400"}`}>
          {error ?? ok}
        </p>
      )}

      <div className="space-y-3">
        {data.tickets.length === 0 ? (
          <p className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-slate-400">
            No hay tickets todavía.
          </p>
        ) : (
          data.tickets.map((t) => {
            const st = STATUS_FLOW[t.status] ?? STATUS_FLOW.cancelled;
            return (
              <div
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-mono text-sm font-bold text-cyan-300">
                    {t.bundleCode}
                    {t.partName && (
                      <span className="ml-2 font-sans text-xs font-normal text-slate-400">
                        {t.partName}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-slate-300">
                    {t.reason} · {t.quantity} unidad(es)
                  </p>
                  <span
                    className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${st.cls}`}
                  >
                    {st.text}
                  </span>
                </div>

                <div className="flex gap-2">
                  {isOwner && t.status === "pending_satellite" && (
                    <>
                      <button
                        onClick={() =>
                          act(approveTicket, t.id, "Ticket aprobado. La marca fue notificada.")
                        }
                        disabled={pending}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                      >
                        Validar y aprobar
                      </button>
                    </>
                  )}
                  {isBrand && t.status === "approved_satellite" && (
                    <button
                      onClick={() =>
                        act(dispatchTicket, t.id, "Reposición despachada al satélite.")
                      }
                      disabled={pending}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                    >
                      Cortar y despachar
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
