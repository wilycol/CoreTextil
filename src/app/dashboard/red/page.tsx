import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import RedClient from "./RedClient";

export const dynamic = "force-dynamic";

export default async function RedPage() {
  const { profile } = await getSession();
  const supabase = await createClient();

  if (profile.role !== "brand_admin" && profile.role !== "designer" && profile.role !== "cutter") {
    redirect("/dashboard");
  }

  // Carga paralela de enlaces, perfiles de dueños, configuración de talleres y órdenes activas con prendas
  const [{ data: links }, { data: profilesList }, { data: costProfiles }, { data: activeOrders }] = await Promise.all([
    supabase
      .from("satellite_links")
      .select("created_at, satellite_user_id")
      .eq("brand_tenant_id", profile.tenant_id),
    supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url"),
    supabase
      .from("satellite_cost_profiles")
      .select("*"),
    supabase
      .from("production_orders")
      .select("id, order_number, satellite_user_id, status, total_units, garment_id, garments(name)")
      .eq("tenant_id", profile.tenant_id),
  ]);

  const activeOrderList = activeOrders ?? [];
  const activeOrderIds = activeOrderList.map((o: any) => o.id);
  const garmentIds = Array.from(new Set(activeOrderList.map((o: any) => o.garment_id).filter(Boolean)));

  // Carga de operaciones de prenda y de logs de producción diarios de operarios
  const [{ data: operationsList }, { data: logsList }] = await Promise.all([
    garmentIds.length > 0
      ? supabase.from("garment_operations").select("id, garment_id").in("garment_id", garmentIds)
      : Promise.resolve({ data: [] }),
    activeOrderIds.length > 0
      ? supabase.from("daily_production_logs").select("order_id, units_completed").in("order_id", activeOrderIds)
      : Promise.resolve({ data: [] }),
  ]);

  // Agrupar conteo de operaciones por prenda
  const opsCountByGarment: Record<string, number> = {};
  (operationsList ?? []).forEach((op: any) => {
    opsCountByGarment[op.garment_id] = (opsCountByGarment[op.garment_id] || 0) + 1;
  });

  // Agrupar unidades operativas registradas por orden en daily_production_logs
  const loggedUnitsByOrder: Record<string, number> = {};
  (logsList ?? []).forEach((log: any) => {
    loggedUnitsByOrder[log.order_id] = (loggedUnitsByOrder[log.order_id] || 0) + Number(log.units_completed || 0);
  });

  const profilesMap: Record<string, any> = {};
  (profilesList ?? []).forEach((p: any) => {
    profilesMap[p.id] = p;
  });

  const costProfilesMap: Record<string, any> = {};
  (costProfiles ?? []).forEach((cp: any) => {
    costProfilesMap[cp.satellite_user_id] = cp;
  });

  const ordersMap: Record<string, any[]> = {};
  activeOrderList.forEach((o: any) => {
    if (o.satellite_user_id) {
      if (!ordersMap[o.satellite_user_id]) ordersMap[o.satellite_user_id] = [];
      ordersMap[o.satellite_user_id].push(o);
    }
  });

  const satellites = (links ?? []).map((l: any) => {
    const owner = profilesMap[l.satellite_user_id];
    const cp = costProfilesMap[l.satellite_user_id];
    const orders = ordersMap[l.satellite_user_id] || [];

    return {
      id: l.satellite_user_id,
      name: cp?.commercial_name || (owner?.full_name ? `Taller Satélite (${owner.full_name})` : "Taller Satélite"),
      owner_name: owner?.full_name || "Dueño de Taller",
      email: owner?.email || "Sin correo de contacto",
      logo_url: cp?.logo_url || owner?.avatar_url || null,
      max_operators: cp?.max_operators || 0,
      available_machines: cp?.available_machines || [],
      is_configured: Boolean(cp?.commercial_name),
      joined_at: l.created_at,
      active_orders_count: orders.length,
      orders: orders.map((o: any) => {
        const opsCount = opsCountByGarment[o.garment_id] || 0;
        const totalUnits = Number(o.total_units || 0);
        const targetOpUnits = opsCount > 0 ? totalUnits * opsCount : totalUnits;
        const loggedOpUnits = loggedUnitsByOrder[o.id] || 0;
        let progressPercentage = 0;
        if (o.status === "completed") {
          progressPercentage = 100;
        } else if (targetOpUnits > 0) {
          progressPercentage = Math.min(100, Math.round((loggedOpUnits / targetOpUnits) * 100));
        }

        return {
          id: o.id,
          order_number: o.order_number,
          status: o.status,
          total_units: totalUnits,
          garment_name: o.garments?.name || "Prenda en confección",
          operations_count: opsCount,
          logged_op_units: loggedOpUnits,
          target_op_units: targetOpUnits,
          progress_percentage: progressPercentage,
        };
      }),
    };
  });

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Mi Red de Talleres</h1>
          <p className="mt-1 text-slate-400">
            Administra los talleres satélite que están vinculados a tu marca y consulta sus órdenes en curso.
          </p>
        </div>
      </div>
      <RedClient satellites={satellites} />
    </div>
  );
}
