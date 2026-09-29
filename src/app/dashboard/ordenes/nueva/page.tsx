import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { GarmentsRow } from "@/lib/db.types";
import NewOrderForm from "./NewOrderForm";

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ garment?: string }>;
}) {
  const { profile } = await getSession();
  const supabase = await createClient();
  const { garment: garmentParam } = await searchParams;

  if (profile.role !== "brand_admin" && profile.role !== "designer") {
    return (
      <p className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-slate-300">
        Solo las marcas emiten órdenes de corte.
      </p>
    );
  }

  const { data: garments } = await supabase
    .from("garments")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">Nueva orden de corte</h1>
      <p className="mt-1 text-slate-400">
        Define la matriz de tendido por talla y color. Generamos los atados con
        código unívoco y sus QR para imprimir.
      </p>
      <div className="mt-8">
        <NewOrderForm
          garments={(garments ?? []) as GarmentsRow[]}
          preselectedGarment={garmentParam ?? null}
        />
      </div>
    </div>
  );
}
