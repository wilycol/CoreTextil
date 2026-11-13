import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { OrderBundlesRow, ProductionOrdersRow } from "@/lib/db.types";
import { formatCop } from "@/lib/cop";
import PrintButton from "./PrintButton";
import LiquidationPanel from "./LiquidationPanel";
import OrderNegotiationClient from "./OrderNegotiationClient";
import DeleteOrderButton from "./DeleteOrderButton";
import GarmentAssemblyViewer2D from "@/components/GarmentAssemblyViewer2D";

const STATUS_LABEL: Record<string, string> = {
  draft: "Borrador",
  cutting: "En corte",
  dispatched: "Despachada",
  in_progress: "En ensamble",
  completed: "Completada",
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { profile } = await getSession();

  const { data: order } = await supabase
    .from("production_orders")
    .select("*")
    .eq("id", id)
    .single();

  if (!order) notFound();

  const { data: bundles } = await supabase
    .from("order_bundles")
    .select("*")
    .eq("order_id", id)
    .order("bundle_code");

  const bundleRows = (bundles ?? []) as OrderBundlesRow[];
  const o = order as ProductionOrdersRow;

  // ---- Carga de datos de prenda, operaciones, logs y tickets para el Visor 2D ----
  const [{ data: garment }, { data: allOps }, { data: tickets }, { data: logs }] = await Promise.all([
    supabase
      .from("garments")
      .select("name, reference_code")
      .eq("id", o.garment_id)
      .maybeSingle(),
    supabase
      .from("garment_operations")
      .select("*")
      .eq("garment_id", o.garment_id)
      .order("step_order", { ascending: true }),
    supabase
      .from("material_tickets")
      .select("id, status")
      .eq("order_id", id)
      .in("status", ["pending_satellite", "approved_satellite", "in_cutting_room"]),
    supabase
      .from("daily_production_logs")
      .select("bundle_id, operation_id, units_completed")
      .eq("order_id", id),
  ]);

  const totalOps = (allOps ?? []).length;
  const completedByOp: Record<string, number> = {};
  const acc: Record<string, Record<string, number>> = {};
  for (const l of (logs ?? []) as any[]) {
    acc[l.bundle_id] ??= {};
    acc[l.bundle_id][l.operation_id] =
      (acc[l.bundle_id][l.operation_id] ?? 0) + Number(l.units_completed);
    completedByOp[l.operation_id] =
      (completedByOp[l.operation_id] ?? 0) + Number(l.units_completed);
  }

  // ---- Avance y liquidación (entregadas vs por ensamblar) ----
  const isBrandOwner = profile.tenant_id === o.tenant_id;
  let deliveredUnits = 0;
  let alreadyLiquidated = false;

  if (totalOps > 0) {
    for (const b of bundleRows) {
      const perOp = acc[b.id] ?? {};
      const opsDone = Object.values(perOp).filter(
        (u) => u >= b.units_count
      ).length;
      if (opsDone >= totalOps) deliveredUnits += b.units_count;
    }
  }

  if (isBrandOwner) {
    const { data: liq } = await supabase
      .from("order_liquidations")
      .select("id")
      .eq("order_id", id)
      .maybeSingle();
    alreadyLiquidated = !!liq;
  }

  const hasAnyAlert = (tickets ?? []).length > 0;
  const viewerOperations = (allOps ?? []).map((op: any) => ({
    id: op.id,
    stepOrder: op.step_order,
    operationName: op.operation_name,
    machineType: op.machine_type,
    rateCop: Number(op.base_rate_cop),
    samMinutes: op.sam_minutes ? Number(op.sam_minutes) : null,
    unitsCompleted: completedByOp[op.id] ?? 0,
    totalUnits: o.total_units,
    hasAlert: hasAnyAlert,
  }));

  const pendingUnits = Math.max(0, o.total_units - deliveredUnits);

  // QR por atado: codifica el código unívoco REF-TALLA-COLOR-NN
  const qrByBundle = new Map<string, string>();
  for (const b of bundleRows) {
    const url = await QRCode.toDataURL(b.bundle_code, {
      margin: 1,
      width: 160,
    });
    qrByBundle.set(b.id, url);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-mono text-2xl font-bold text-cyan-300">
            {o.order_number}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {o.total_units} unidades · {formatCop(o.unit_price_agreed)} por
            prenda · Lote:{" "}
            {formatCop(o.total_units * o.unit_price_agreed)} ·{" "}
            {STATUS_LABEL[o.status] ?? o.status}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isBrandOwner && (
            <DeleteOrderButton
              orderId={o.id}
              status={o.status}
              assignmentStatus={o.assignment_status}
            />
          )}
          <PrintButton />
        </div>
      </div>

      <div className="mt-4">
        <OrderNegotiationClient
          orderId={o.id}
          currentStatus={o.assignment_status}
          isSatellite={profile.role === "satellite_owner"}
        />
      </div>

      {/* Visor 2D Interactivo de Avance de Ensamble de la Prenda */}
      <div className="mt-6">
        <GarmentAssemblyViewer2D
          operations={viewerOperations}
          garmentName={garment?.name || "Prenda"}
          referenceCode={garment?.reference_code || "REF"}
          totalOrderUnits={o.total_units}
        />
      </div>

      {isBrandOwner && (
        <div className="mt-8">
          <LiquidationPanel
            orderId={o.id}
            deliveredUnits={deliveredUnits}
            pendingUnits={pendingUnits}
            unitPrice={Number(o.unit_price_agreed)}
            alreadyLiquidated={alreadyLiquidated}
          />
        </div>
      )}

      <h2 className="mt-8 text-lg font-semibold">
        Atados ({bundleRows.length}) — escanea el QR al recibir cada bulto
      </h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {bundleRows.map((b) => (
          <div
            key={b.id}
            className="rounded-2xl border border-slate-800 bg-white p-4 text-slate-900"
          >
            <p className="font-mono text-sm font-bold">{b.bundle_code}</p>
            <p className="mt-1 text-sm text-slate-600">
              Talla {b.size} · {b.color} · {b.units_count} unidades
            </p>
            {qrByBundle.get(b.id) && (
              <img
                src={qrByBundle.get(b.id)!}
                alt={`QR ${b.bundle_code}`}
                className="mt-3 h-36 w-36"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
