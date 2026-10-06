import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import RedClient from "./RedClient";

export const dynamic = "force-dynamic";

export default async function RedPage() {
  const { profile } = await getSession();
  const supabase = await createClient();

  const isBrand = ["brand_admin", "designer", "cutter"].includes(profile.role);
  const isSatellite = profile.role === "satellite_owner";

  if (!isBrand && !isSatellite) {
    redirect("/dashboard");
  }

  // SI ES MARCA: Carga su red de talleres satélites vinculados
  if (isBrand) {
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

    const [{ data: operationsList }, { data: logsList }] = await Promise.all([
      garmentIds.length > 0
        ? supabase
            .from("garment_operations")
            .select("id, garment_id, step_order, operation_name, machine_type, base_rate_cop, sam_minutes")
            .in("garment_id", garmentIds)
            .order("step_order")
        : Promise.resolve({ data: [] }),
      activeOrderIds.length > 0
        ? supabase
            .from("daily_production_logs")
            .select("order_id, operation_id, units_completed")
            .in("order_id", activeOrderIds)
        : Promise.resolve({ data: [] }),
    ]);

    const opsByGarment: Record<string, any[]> = {};
    (operationsList ?? []).forEach((op: any) => {
      if (!opsByGarment[op.garment_id]) opsByGarment[op.garment_id] = [];
      opsByGarment[op.garment_id].push(op);
    });

    const logsMap: Record<string, number> = {};
    (logsList ?? []).forEach((log: any) => {
      const key = `${log.order_id}:${log.operation_id}`;
      logsMap[key] = (logsMap[key] || 0) + Number(log.units_completed || 0);
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
          const garmentOps = opsByGarment[o.garment_id] || [];
          const opsCount = garmentOps.length;
          const totalUnits = Number(o.total_units || 0);

          const operationsDetail = garmentOps.map((op: any) => {
            const loggedForOp = logsMap[`${o.id}:${op.id}`] || 0;
            let opPct = 0;
            if (o.status === "completed") {
              opPct = 100;
            } else if (totalUnits > 0) {
              opPct = Math.min(100, Math.round((loggedForOp / totalUnits) * 100));
            }
            return {
              id: op.id,
              step_order: op.step_order,
              operation_name: op.operation_name,
              machine_type: op.machine_type,
              base_rate_cop: Number(op.base_rate_cop),
              sam_minutes: op.sam_minutes != null ? Number(op.sam_minutes) : null,
              logged_units: loggedForOp,
              target_units: totalUnits,
              progress_percentage: opPct,
            };
          });

          const targetOpUnits = opsCount > 0 ? totalUnits * opsCount : totalUnits;
          const loggedOpUnits = operationsDetail.reduce((sum, op) => sum + op.logged_units, 0);

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
            operations: operationsDetail,
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
              Administra los talleres satélite vinculados a tu marca y consulta sus órdenes en curso.
            </p>
          </div>
        </div>
        <RedClient role="brand" satellites={satellites} />
      </div>
    );
  }

  // SI ES TALLER SATÉLITE: Carga sus marcas clientes vinculadas y su cuadrilla de operarios
  const [{ data: links }, { data: activeOrders }, { data: operatorsList }] = await Promise.all([
    supabase
      .from("satellite_links")
      .select("created_at, brand_tenant_id")
      .eq("satellite_user_id", profile.id),
    supabase
      .from("production_orders")
      .select("id, order_number, tenant_id, status, total_units, garment_id, garments(name)")
      .eq("satellite_user_id", profile.id),
    supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url, created_at")
      .eq("satellite_owner_id", profile.id)
      .eq("role", "operator"),
  ]);

  const brandTenantIds = Array.from(new Set((links ?? []).map((l: any) => l.brand_tenant_id)));

  const { data: brandTenants } = brandTenantIds.length > 0
    ? await supabase.from("tenants").select("id, name, nit_rut, logo_url, admin_phone, admin_address").in("id", brandTenantIds)
    : { data: [] };

  const tenantMap: Record<string, any> = {};
  (brandTenants ?? []).forEach((t: any) => {
    tenantMap[t.id] = t;
  });

  const activeOrderList = activeOrders ?? [];
  const activeOrderIds = activeOrderList.map((o: any) => o.id);
  const garmentIds = Array.from(new Set(activeOrderList.map((o: any) => o.garment_id).filter(Boolean)));

  const [{ data: operationsList }, { data: logsList }] = await Promise.all([
    garmentIds.length > 0
      ? supabase
          .from("garment_operations")
          .select("id, garment_id, step_order, operation_name, machine_type, base_rate_cop, sam_minutes")
          .in("garment_id", garmentIds)
          .order("step_order")
      : Promise.resolve({ data: [] }),
    activeOrderIds.length > 0
      ? supabase
          .from("daily_production_logs")
          .select("order_id, operation_id, operator_id, units_completed, earned_amount, logged_at")
          .in("order_id", activeOrderIds)
      : Promise.resolve({ data: [] }),
  ]);

  const opsByGarment: Record<string, any[]> = {};
  (operationsList ?? []).forEach((op: any) => {
    if (!opsByGarment[op.garment_id]) opsByGarment[op.garment_id] = [];
    opsByGarment[op.garment_id].push(op);
  });

  const logsMap: Record<string, number> = {};
  (logsList ?? []).forEach((log: any) => {
    const key = `${log.order_id}:${log.operation_id}`;
    logsMap[key] = (logsMap[key] || 0) + Number(log.units_completed || 0);
  });

  // Agrupar órdenes por marca cliente
  const brandOrdersMap: Record<string, any[]> = {};
  activeOrderList.forEach((o: any) => {
    if (!brandOrdersMap[o.tenant_id]) brandOrdersMap[o.tenant_id] = [];
    brandOrdersMap[o.tenant_id].push(o);
  });

  const brandNetwork = (links ?? []).map((l: any) => {
    const brand = tenantMap[l.brand_tenant_id];
    const orders = brandOrdersMap[l.brand_tenant_id] || [];

    return {
      id: l.brand_tenant_id,
      name: brand?.name || "Marca Cliente",
      logo_url: brand?.logo_url || null,
      nit_rut: brand?.nit_rut || null,
      phone: brand?.admin_phone || null,
      address: brand?.admin_address || null,
      joined_at: l.created_at,
      active_orders_count: orders.length,
      orders: orders.map((o: any) => {
        const garmentOps = opsByGarment[o.garment_id] || [];
        const opsCount = garmentOps.length;
        const totalUnits = Number(o.total_units || 0);

        const operationsDetail = garmentOps.map((op: any) => {
          const loggedForOp = logsMap[`${o.id}:${op.id}`] || 0;
          let opPct = 0;
          if (o.status === "completed") {
            opPct = 100;
          } else if (totalUnits > 0) {
            opPct = Math.min(100, Math.round((loggedForOp / totalUnits) * 100));
          }
          return {
            id: op.id,
            step_order: op.step_order,
            operation_name: op.operation_name,
            machine_type: op.machine_type,
            base_rate_cop: Number(op.base_rate_cop),
            sam_minutes: op.sam_minutes != null ? Number(op.sam_minutes) : null,
            logged_units: loggedForOp,
            target_units: totalUnits,
            progress_percentage: opPct,
          };
        });

        const targetOpUnits = opsCount > 0 ? totalUnits * opsCount : totalUnits;
        const loggedOpUnits = operationsDetail.reduce((sum, op) => sum + op.logged_units, 0);

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
          operations: operationsDetail,
        };
      }),
    };
  });

  // Agrupar métricas de cuadrilla por operario para el día de hoy
  const todayStr = new Date().toISOString().slice(0, 10);
  const operatorMetrics: Record<string, { piecesToday: number; walletToday: number }> = {};
  (logsList ?? []).forEach((log: any) => {
    if (log.logged_at === todayStr) {
      if (!operatorMetrics[log.operator_id]) {
        operatorMetrics[log.operator_id] = { piecesToday: 0, walletToday: 0 };
      }
      operatorMetrics[log.operator_id].piecesToday += Number(log.units_completed || 0);
      operatorMetrics[log.operator_id].walletToday += Number(log.earned_amount || 0);
    }
  });

  const operators = (operatorsList ?? []).map((op: any) => ({
    id: op.id,
    full_name: op.full_name,
    email: op.email,
    avatar_url: op.avatar_url,
    joined_at: op.created_at,
    piecesToday: operatorMetrics[op.id]?.piecesToday || 0,
    walletToday: operatorMetrics[op.id]?.walletToday || 0,
  }));

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Mi Red & Cuadrilla de Taller</h1>
          <p className="mt-1 text-slate-400">
            Administra tus Marcas Clientes vinculadas, consulta sus órdenes de corte en curso y gestiona tu cuadrilla de operarios.
          </p>
        </div>
      </div>
      <RedClient role="satellite" brandNetwork={brandNetwork} operators={operators} />
    </div>
  );
}
