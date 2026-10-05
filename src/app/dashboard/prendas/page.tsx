import Link from "next/link";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { formatCop } from "@/lib/cop";

export default async function GarmentsPage() {
  const { profile } = await getSession();
  const supabase = await createClient();

  if (!["brand_admin", "designer", "cutter"].includes(profile.role)) {
    return (
      <p className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-slate-300">
        El catálogo y las fichas técnicas son para marcas y diseñadores.
      </p>
    );
  }

  const { data: garments } = await supabase
    .from("garments")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Prendas</h1>
          <p className="mt-1 text-slate-400">
            Abre la ficha técnica de cada prenda e imprímela para entregarla al
            taller satélite junto con el corte.
          </p>
        </div>
        <Link
          href="/dashboard/nueva-prenda"
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500"
        >
          + Nueva prenda
        </Link>
      </div>

      {(garments ?? []).length === 0 ? (
        <p className="mt-8 rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-slate-400">
          Aún no hay prendas. Crea la primera con el ADN de prenda.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {(garments ?? []).map((g: any) => (
            <Link
              key={g.id}
              href={`/dashboard/prendas/${g.id}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 transition-all hover:border-cyan-500 hover:bg-slate-900"
            >
              {g.front_image_url ? (
                <div className="aspect-[4/5] w-full overflow-hidden bg-slate-800">
                  <img
                    src={g.front_image_url}
                    alt={g.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              ) : (
                <div className="flex aspect-[4/5] w-full items-center justify-center bg-slate-800/50">
                  <span className="text-slate-600">Sin foto</span>
                </div>
              )}
              <div className="p-5 flex-1 flex flex-col">
                <p className="font-mono text-xs text-cyan-300">
                  {g.reference_code}
                </p>
                <h2 className="mt-1 font-semibold text-slate-100">{g.name}</h2>
                <p className="mt-2 text-sm text-slate-400">
                  {g.total_sam_minutes ?? "—"} min ·{" "}
                  {g.suggested_retail_price
                    ? `${formatCop(Number(g.suggested_retail_price))}/pje`
                    : "sin tarifa"}
                </p>
                <div className="mt-auto pt-4 text-xs text-slate-500">
                  Ver ficha técnica imprimible →
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
