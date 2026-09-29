import Link from "next/link";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { ProductionOrdersRow } from "@/lib/db.types";
import { formatCop } from "@/lib/cop";

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  draft: { text: "Borrador", cls: "bg-slate-800 text-slate-300" },
  cutting: { text: "En corte", cls: "bg-amber-950 text-amber-300" },
  dispatched: { text: "Despachada", cls: "bg-cyan-950 text-cyan-300" },
  in_progress: { text: "En ensamble", cls: "bg-indigo-950 text-indigo-300" },
  completed: { text: "Completada", cls: "bg-emerald-950 text-emerald-300" },
};

export default async function OrdersPage() {
  const { profile } = await getSession();
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from("production_orders")
    .select("*")
    .order("created_at", { ascending: false });

  const rows = (orders ?? []) as ProductionOrdersRow[];
  const isBrand = profile.role !== "satellite_owner" && profile.role !== "operator";

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Órdenes de corte</h1>
        {isBrand && (
          <Link
            href="/dashboard/ordenes/nueva"
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500"
          >
            + Nueva orden
          </Link>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="mt-8 rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-slate-400">
          Aún no hay órdenes.{" "}
          {isBrand
            ? "Crea una prenda y emite tu primera orden de corte."
            : "Cuando una marca te asigne un corte, aparecerá aquí."}
        </p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-left text-slate-400">
              <tr>
                <th className="px-4 py-3">Orden</th>
                <th>Prenda</th>
                <th className="text-right">Unidades</th>
                <th className="text-right">Precio unitario</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => {
                const st = STATUS_LABEL[o.status] ?? STATUS_LABEL.draft;
                return (
                  <tr key={o.id} className="border-t border-slate-800">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/ordenes/${o.id}`}
                        className="font-mono text-cyan-300 hover:underline"
                      >
                        {o.order_number}
                      </Link>
                    </td>
                    <td className="text-slate-300">{o.garment_id}</td>
                    <td className="text-right text-slate-300">{o.total_units}</td>
                    <td className="text-right text-slate-300">
                      {formatCop(o.unit_price_agreed)}
                    </td>
                    <td>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${st.cls}`}>
                        {st.text}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
