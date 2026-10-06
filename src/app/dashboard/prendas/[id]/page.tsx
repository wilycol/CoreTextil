import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { formatCop } from "@/lib/cop";
import {
  DEFAULT_SIZE_FACTORS,
  editableSizes,
  sanitizeSizeFactors,
  sizeFactor,
  scaledQuantity,
} from "@/lib/sizeFactors";
import PrintHint from "./PrintHint";
import SizeFactorsEditor from "./SizeFactorsEditor";
import DownloadPdfButton from "./DownloadPdfButton";
import MaterialsButtons from "./MaterialsButtons";
import GarmentAssemblyGraph from "./GarmentAssemblyGraph";
import OperationsEditor from "./OperationsEditor";
import { deleteMaterialAction } from "./actions";

export default async function TechSheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await getSession();
  const supabase = await createClient();

  const { data: garment } = await supabase
    .from("garments")
    .select("*")
    .eq("id", id)
    .single();

  if (!garment) notFound();
  const g = garment as any;

  const [{ data: parts }, { data: ops }, { data: materials }] = await Promise.all([
    supabase.from("garment_parts").select("*").eq("garment_id", id).order("part_code"),
    supabase
      .from("garment_operations")
      .select("*")
      .eq("garment_id", id)
      .order("step_order"),
    supabase.from("garment_materials").select("*").eq("garment_id", id).order("name"),
  ]);

  const machineLabel: Record<string, string> = {
    plana: "Plana",
    fileteadora: "Fileteadora",
    collarin: "Collarín",
  };

  const totalRate = (ops ?? []).reduce(
    (a: number, o: any) => a + Number(o.base_rate_cop),
    0
  );
  const materialsCost = (materials ?? []).reduce(
    (a: number, m: any) => a + Number(m.quantity_per_garment) * Number(m.unit_cost_cop),
    0
  );
  const totalRealCost = totalRate + materialsCost;

  // ---- Consumo por talla ----
  const sizeFactors = sanitizeSizeFactors(g.size_factors);
  const sizes = editableSizes(sizeFactors);
  const sizeRows = sizes.map((s) => {
    const factor = sizeFactor(sizeFactors, s);
    const units = (materials ?? []).reduce(
      (a: number, m: any) => a + scaledQuantity(Number(m.quantity_per_garment), factor) * Number(m.unit_cost_cop),
      0
    );
    return { size: s, factor, units: Math.round(units) };
  });

  return (
    <div className="mx-auto max-w-3xl">
      {/* Barra de acciones (no se imprime) */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/dashboard/prendas"
          className="text-sm text-slate-400 hover:text-cyan-300"
        >
          ← Volver a prendas
        </Link>
        <div className="flex flex-wrap gap-2">
          <DownloadPdfButton garmentId={g.id} />
          <PrintHint />
        </div>
      </div>

      <article className="tech-sheet rounded-2xl border border-slate-200 bg-white p-8 text-slate-900 shadow-sm">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-slate-900 pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-cyan-700">
              CoreTextil · Ficha técnica
            </p>
            <h1 className="mt-1 text-2xl font-extrabold">{g.name}</h1>
            <p className="mt-1 font-mono text-sm text-slate-600">
              Ref. {g.reference_code}
            </p>
          </div>
          <div className="text-right text-sm text-slate-600">
            <p>
              SAM total:{" "}
              <b className="text-slate-900">
                {g.total_sam_minutes ?? "—"} min
              </b>
            </p>
            <p>
              Destajo/pje:{" "}
              <b className="text-slate-900">
                {formatCop(totalRate)}
              </b>
            </p>
            <p>
              Costo real:{" "}
              <b className="text-slate-900">{formatCop(totalRealCost)}</b>
            </p>
          </div>
        </header>

        {/* Diagrama Interactivo de Nodos de Ensamble y Rompecabezas 2D */}
        <GarmentAssemblyGraph
          garmentName={g.name}
          referenceCode={g.reference_code}
          explodedImageUrl={g.ai_exploded_image_url}
          studioRenderUrl={g.front_image_url}
          parts={parts ?? []}
          operations={ops ?? []}
        />

        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide">
            1 · Despiece
          </h2>
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="text-left text-slate-600">
                <th className="py-1">Código</th>
                <th>Pieza</th>
                <th>Material</th>
              </tr>
            </thead>
            <tbody>
              {(parts ?? []).map((p: any) => (
                <tr key={p.id} className="border-t border-slate-200">
                  <td className="py-1.5 font-mono font-semibold">
                    {p.part_code}
                  </td>
                  <td>{p.name}</td>
                  <td className="text-slate-600">{p.material_type ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide">
            2 · Ruta de máquinas y destajo
          </h2>
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="text-left text-slate-600">
                <th className="py-1">#</th>
                <th>Operación</th>
                <th>Máquina</th>
                <th className="text-right">SAM</th>
                <th className="text-right">Tarifa COP</th>
              </tr>
            </thead>
            <tbody>
              {(ops ?? []).map((o: any) => (
                <tr key={o.id} className="border-t border-slate-200">
                  <td className="py-1.5">{o.step_order}</td>
                  <td>{o.operation_name}</td>
                  <td>{machineLabel[o.machine_type] ?? o.machine_type}</td>
                  <td className="text-right">{o.sam_minutes ?? "—"}</td>
                  <td className="text-right">{formatCop(Number(o.base_rate_cop))}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-slate-400 font-bold">
                <td colSpan={4} className="py-1.5 text-right">
                  Total por prenda
                </td>
                <td className="text-right">{formatCop(totalRate)}</td>
              </tr>
            </tbody>
          </table>

          {/* Editor Interactivo para Validación de Ruta y Procesos Ocultos por Satélites / Marca */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <OperationsEditor garmentId={g.id} initialOperations={ops ?? []} />
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide">
            3 · Materiales e insumos por prenda
          </h2>
          {(materials ?? []).length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">
              Sin materiales registrados. Agrégalos para calcular el costo real.
            </p>
          ) : (
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="py-1">Material</th>
                  <th className="text-right">Consumo</th>
                  <th className="text-right">Costo unitario</th>
                  <th className="text-right">Costo/prenda</th>
                </tr>
              </thead>
              <tbody>
                {(materials ?? []).map((m: any) => (
                  <tr key={m.id} className="border-t border-slate-200">
                    <td className="py-1.5">{m.name}</td>
                    <td className="text-right text-slate-600">
                      {Number(m.quantity_per_garment)} {m.unit}
                    </td>
                    <td className="text-right text-slate-600">
                      {formatCop(Number(m.unit_cost_cop))}/{m.unit}
                    </td>
                    <td className="text-right font-semibold">
                      {formatCop(Number(m.quantity_per_garment) * Number(m.unit_cost_cop))}
                    </td>
                    <td className="w-8 print:hidden">
                      <form action={deleteMaterialAction}>
                        <input type="hidden" name="materialId" value={m.id} />
                        <input
                          type="hidden"
                          name="garmentId"
                          value={g.id}
                        />
                        <button
                          className="text-slate-400 hover:text-red-600"
                          aria-label={`Quitar ${m.name}`}
                        >
                          ✕
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-400 font-bold">
                  <td colSpan={4} className="py-1.5 text-right">
                    Total materiales
                  </td>
                  <td className="text-right">{formatCop(materialsCost)}</td>
                  <td className="print:hidden" />
                </tr>
              </tbody>
            </table>
          )}
          <p className="mt-2 text-xs text-slate-500">
            Consumo base (talla M). Las tallas mayores consumen más: mira la
            tabla por talla más abajo.
          </p>
          <div className="mt-3 print:hidden">
            <MaterialsButtons garmentId={g.id} />
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide">
            4 · Consumo y costo por talla
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Multiplicador sobre el consumo base según talla (se puede editar).
            La columna «Costo/prenda» recalcula los materiales de la sección 3.
          </p>
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="text-left text-slate-600">
                <th className="py-1">Talla</th>
                <th className="text-right">Factor</th>
                <th className="text-right">Costo materiales/prenda</th>
              </tr>
            </thead>
            <tbody>
              {sizeRows.map((r) => (
                <tr key={r.size} className="border-t border-slate-200">
                  <td className="py-1.5 font-mono font-semibold">{r.size}</td>
                  <td className="text-right text-slate-600">×{r.factor}</td>
                  <td className="text-right font-semibold">{formatCop(r.units)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 print:hidden">
            <SizeFactorsEditor garmentId={g.id} initial={sizeFactors} />
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide">
              5 · Costos y margen real
            </h2>
            <ul className="mt-2 space-y-1 text-sm">
              <li className="flex justify-between border-b border-slate-200 py-1">
                <span>Destajo de confección</span>
                <b>{formatCop(totalRate)}</b>
              </li>
              <li className="flex justify-between border-b border-slate-200 py-1">
                <span>Materiales e insumos</span>
                <b>{formatCop(materialsCost)}</b>
              </li>
              <li className="flex justify-between border-b border-slate-400 py-1 text-base">
                <span className="font-bold">Costo total real</span>
                <b>{formatCop(totalRealCost)}</b>
              </li>
              <li className="flex justify-between border-b border-slate-200 py-1">
                <span>Precio sugerido venta</span>
                <b>
                  {g.suggested_retail_price
                    ? formatCop(Number(g.suggested_retail_price))
                    : "—"}
                </b>
              </li>
              <li className="flex justify-between py-1">
                <span>Margen bruto real</span>
                <b className="text-cyan-700">
                  {g.suggested_retail_price
                    ? formatCop(
                        Number(g.suggested_retail_price) - totalRealCost
                      )
                    : "—"}
                </b>
              </li>
            </ul>
            <p className="mt-2 text-xs text-slate-500">
              El costo total no incluye costos fijos del taller satélite ni
              logística.
            </p>
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide">
              6 · Notas para el taller
            </h2>
            <ul className="mt-2 list-inside list-disc text-sm text-slate-700">
              <li>
                Verifica el código del atado <b>REF-TALLA-COLOR-NN</b> antes de
                iniciar.
              </li>
              <li>
                Calcula la tela del atado con el factor de su talla (sección 4).
              </li>
              <li>Reporta faltantes con la pieza exacta del despiece.</li>
              <li>
                El destajo por operación se paga según la ruta de la sección 2.
              </li>
            </ul>
          </div>
        </section>

        <footer className="mt-8 flex justify-between border-t border-slate-300 pt-3 text-xs text-slate-500">
          <span>Documento generado por CoreTextil SaaS</span>
          <span>
            Emitida: {new Date().toLocaleDateString("es-CO")} · Ref.{" "}
            {g.reference_code}
          </span>
        </footer>
      </article>
    </div>
  );
}
