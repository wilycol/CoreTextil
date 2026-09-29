import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import TicketsClient, { type TicketsData } from "./TicketsClient";

const REASON_LABEL: Record<string, string> = {
  missing_piece: "Pieza faltante",
  damaged_fabric: "Tela dañada",
  shortage_supplies: "Insumos insuficientes",
};

export default async function TicketsPage() {
  const { profile } = await getSession();
  const supabase = await createClient();

  // Tickets visibles según RLS (marca: los de su tenant; satélite/operario: los suyos)
  const { data: tickets } = await supabase
    .from("material_tickets")
    .select(
      "id, status, reason, quantity_needed, created_at, bundle_id, order_id, operator_id, order_bundles(bundle_code), garment_parts(name)"
    )
    .order("created_at", { ascending: false });

  // Atados disponibles para reportar (operario y jefe de satélite)
  let createBundles: TicketsData["bundles"] = [];
  if (profile.role === "operator" || profile.role === "satellite_owner") {
    const satelliteId =
      profile.role === "operator" ? profile.satellite_owner_id : profile.id;

    const { data: orders } = await supabase
      .from("production_orders")
      .select("id")
      .eq("satellite_user_id", satelliteId);

    const orderIds = (orders ?? []).map((o) => o.id);
    if (orderIds.length) {
      const { data: bundles } = await supabase
        .from("order_bundles")
        .select("id, code: bundle_code")
        .in("order_id", orderIds);
      createBundles = (bundles ?? []).map((b: any) => ({
        id: b.id,
        code: b.code,
      }));
    }
  }

  const data: TicketsData = {
    role: profile.role,
    bundles: createBundles,
    tickets: (tickets ?? []).map((t: any) => ({
      id: t.id,
      status: t.status,
      reason: REASON_LABEL[t.reason] ?? t.reason,
      quantity: t.quantity_needed,
      bundleCode: t.order_bundles?.bundle_code ?? "—",
      partName: t.garment_parts?.name ?? null,
      createdAt: t.created_at,
    })),
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">Tickets de faltantes</h1>
      <p className="mt-1 text-slate-400">
        Canal único entre operario → jefe de satélite → mesa de corte de la
        marca. Nada se pierde: cada ticket nace de un atado con nomenclatura
        unívoca.
      </p>
      <div className="mt-8">
        <TicketsClient data={data} />
      </div>
    </div>
  );
}
