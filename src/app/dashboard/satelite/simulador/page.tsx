import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import SimClient from "./SimClient";

export type OpLite = {
  id: string;
  operation_name: string;
  machine_type: string;
  base_rate_cop: number;
};

export default async function SimulatorPage() {
  const { profile } = await getSession();
  if (profile.role !== "satellite_owner" && profile.role !== "superadmin")
    redirect("/dashboard");

  const supabase = await createClient();

  let ordersQuerySim = supabase
    .from("production_orders")
    .select("id, order_number, unit_price_agreed, garment_id, garments(name)")
    .order("created_at", { ascending: false });
  if (profile.role !== "superadmin") {
    ordersQuerySim = ordersQuerySim.eq("satellite_user_id", profile.id);
  }

  const [{ data: costProfile }, { data: orders }] = await Promise.all([
    supabase
      .from("satellite_cost_profiles")
      .select("*")
      .eq("satellite_user_id", profile.id)
      .maybeSingle(),
    ordersQuerySim.limit(30),
  ]);

  const orderList = (orders ?? []).map((o: any) => ({
    id: o.id as string,
    label: `${o.order_number} · ${(o.garments as any)?.name ?? ""}`,
    unitPrice: Number(o.unit_price_agreed),
    garmentId: o.garment_id as string,
  }));

  // Operaciones por prenda (para distribuir la bolsa de operarios)
  const opsByGarment: Record<string, OpLite[]> = {};
  const garmentIds = [...new Set(orderList.map((o) => o.garmentId))];
  for (const gid of garmentIds) {
    const { data: ops } = await supabase
      .from("garment_operations")
      .select("id, operation_name, machine_type, base_rate_cop")
      .eq("garment_id", gid)
      .order("step_order");
    opsByGarment[gid] = (ops ?? []) as OpLite[];
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">Simulador de rentabilidad</h1>
      <p className="mt-1 text-slate-400">
        Antes de aceptar un corte, mira si te deja margen: ingreso por unidad,
        menos tu costo fijo unitario (CFI), menos la bolsa de operarios.
      </p>
      <div className="mt-8">
        <SimClient
          orders={orderList}
          opsByGarment={opsByGarment}
          cfi={costProfile ? Number(costProfile.rent_monthly + costProfile.energy_monthly + costProfile.consumables_monthly + costProfile.maintenance_monthly) / Math.max(1, Number(costProfile.estimated_monthly_units)) : null}
        />
      </div>
    </div>
  );
}
