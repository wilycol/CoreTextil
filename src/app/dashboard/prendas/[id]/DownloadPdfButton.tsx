"use client";

import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getTechSheetPdfData, type TechSheetPdfData } from "./actions";
import { formatCop } from "@/lib/cop";
import {
  DEFAULT_SIZE_FACTORS,
  editableSizes,
  scaledQuantity,
  sizeFactor,
} from "@/lib/sizeFactors";

const MACHINE: Record<string, string> = {
  plana: "Plana",
  fileteadora: "Fileteadora",
  collarin: "Collarín",
};

function buildPdf(d: TechSheetPdfData): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 40;
  const contentW = pageW - marginX * 2;

  // ---------- Encabezado ----------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(14, 116, 144); // cyan-700
  doc.text("CORETEXTIL · FICHA TÉCNICA", marginX, 46);

  doc.setTextColor(17, 24, 39);
  doc.setFontSize(17);
  doc.text(d.name, marginX, 66);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Ref. ${d.referenceCode}`, marginX, 82);

  const rightLines = [
    `SAM total: ${d.totalSamMinutes ?? "—"} min`,
    `Destajo/pje: ${formatCop(
      d.operations.reduce((a, o) => a + Number(o.base_rate_cop), 0)
    )}`,
    `Precio sugerido: ${
      d.suggestedRetailPrice != null ? formatCop(d.suggestedRetailPrice) : "—"
    }`,
  ];
  doc.setFontSize(9);
  rightLines.forEach((line, i) => {
    doc.text(line, pageW - marginX, 46 + i * 12, { align: "right" });
  });

  doc.setDrawColor(17, 24, 39);
  doc.setLineWidth(1.2);
  doc.line(marginX, 92, pageW - marginX, 92);

  const materialsCost = d.materials.reduce(
    (a, m) => a + m.quantity_per_garment * m.unit_cost_cop,
    0
  );
  const totalReal = d.operations.reduce((a, o) => a + Number(o.base_rate_cop), 0) + materialsCost;

  // ---------- 1 · Despiece ----------
  autoTable(doc, {
    startY: 106,
    margin: { left: marginX, right: marginX },
    head: [["1 · Despiece", "", ""]],
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [51, 65, 85],
      fontStyle: "bold",
      fontSize: 8,
    },
    body: d.parts.length
      ? d.parts.map((p) => [p.part_code, p.name, p.material_type ?? "—"])
      : [["—", "Sin piezas registradas", "—"]],
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 3.5, textColor: [30, 41, 59], lineColor: [226, 232, 240] },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 70 },
      2: { textColor: [100, 116, 139] },
    },
    didDrawPage: () => undefined,
  });

  // ---------- 2 · Ruta de máquinas y destajo ----------
  const opsRows = d.operations.map((o) => [
    String(o.step_order),
    o.operation_name,
    MACHINE[o.machine_type] ?? o.machine_type,
    o.sam_minutes != null ? String(o.sam_minutes) : "—",
    formatCop(Number(o.base_rate_cop)),
  ]);
  const totalRate = d.operations.reduce((a, o) => a + Number(o.base_rate_cop), 0);
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 16,
    margin: { left: marginX, right: marginX },
    head: [["#", "2 · Ruta de máquinas y destajo", "Máquina", "SAM", "Tarifa COP"]],
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [51, 65, 85],
      fontStyle: "bold",
      fontSize: 8,
    },
    body: opsRows.length
      ? [...opsRows, [
          "",
          { content: "Total por prenda", styles: { fontStyle: "bold", halign: "right" } },
          "",
          "",
          { content: formatCop(totalRate), styles: { fontStyle: "bold" } },
        ]]
      : [["—", "Sin operaciones registradas", "—", "—", "—"]],
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 3.5, textColor: [30, 41, 59], lineColor: [226, 232, 240] },
    columnStyles: {
      0: { cellWidth: 24 },
      3: { halign: "right", cellWidth: 44 },
      4: { halign: "right", cellWidth: 80 },
    },
  });

  // ---------- 3 · Materiales e insumos ----------
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 16,
    margin: { left: marginX, right: marginX },
    head: [["3 · Materiales e insumos", "Consumo", "Costo unitario", "Costo/prenda"]],
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [51, 65, 85],
      fontStyle: "bold",
      fontSize: 8,
    },
    body: d.materials.length
      ? [
          ...d.materials.map((m) => [
            m.name,
            `${m.quantity_per_garment} ${m.unit}`,
            `${formatCop(m.unit_cost_cop)}/${m.unit}`,
            formatCop(m.quantity_per_garment * m.unit_cost_cop),
          ]),
          [
            { content: "Total materiales", styles: { fontStyle: "bold", halign: "right" } },
            "",
            "",
            {
              content: formatCop(materialsCost),
              styles: { fontStyle: "bold" },
            },
          ],
        ]
      : [["Sin materiales registrados", "—", "—", "—"]],
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 3.5, textColor: [30, 41, 59], lineColor: [226, 232, 240] },
    columnStyles: {
      1: { halign: "right", cellWidth: 90 },
      2: { halign: "right", cellWidth: 90 },
      3: { halign: "right", cellWidth: 90 },
    },
  });

  // ---------- 4 · Consumo y costo por talla ----------
  const sizes = editableSizes(d.sizeFactors);
  const sizeRows = sizes.map((s) => {
    const factor = sizeFactor(d.sizeFactors, s);
    const cost = d.materials.reduce(
      (a, m) =>
        a + scaledQuantity(m.quantity_per_garment, factor) * m.unit_cost_cop,
      0
    );
    return [s, `×${factor}`, formatCop(Math.round(cost))];
  });
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 16,
    margin: { left: marginX, right: marginX },
    head: [["4 · Consumo por talla", "Factor", "Costo materiales/prenda"]],
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [51, 65, 85],
      fontStyle: "bold",
      fontSize: 8,
    },
    body: sizeRows,
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 3.5, textColor: [30, 41, 59], lineColor: [226, 232, 240] },
    columnStyles: {
      0: { cellWidth: 130, fontStyle: "bold" },
      1: { halign: "right", cellWidth: 90 },
      2: { halign: "right", cellWidth: 130 },
    },
  });
  doc.setFontSize(7.5);
  doc.setTextColor(120, 130, 145);
  doc.text(
    "Consumo base = talla M. Factores por defecto: " +
      Object.entries(DEFAULT_SIZE_FACTORS)
        .map(([k, v]) => `${k} ${v}`)
        .join(" · "),
    marginX,
    (doc as any).lastAutoTable.finalY + 10
  );

  // ---------- 5 · Costos y margen ----------
  const startY5 = (doc as any).lastAutoTable.finalY + 22;
  autoTable(doc, {
    startY: startY5,
    margin: { left: marginX, right: marginX },
    head: [["5 · Costos y margen real", "COP"]],
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [51, 65, 85],
      fontStyle: "bold",
      fontSize: 8,
    },
    body: [
      ["Destajo de confección", formatCop(totalRate)],
      ["Materiales e insumos", formatCop(materialsCost)],
      [
        { content: "Costo total real", styles: { fontStyle: "bold" } },
        { content: formatCop(totalReal), styles: { fontStyle: "bold" } },
      ],
      [
        "Precio sugerido venta",
        d.suggestedRetailPrice != null ? formatCop(d.suggestedRetailPrice) : "—",
      ],
      [
        "Margen bruto real",
        d.suggestedRetailPrice != null
          ? formatCop(d.suggestedRetailPrice - totalReal)
          : "—",
      ],
    ],
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 3.5, textColor: [30, 41, 59], lineColor: [226, 232, 240] },
    columnStyles: { 1: { halign: "right", cellWidth: 120 } },
  });

  // ---------- 6 · Notas para el taller ----------
  const notes = [
    "Verifica el código del atado REF-TALLA-COLOR-NN antes de iniciar.",
    "Calcula la tela del atado con el factor de su talla (sección 4).",
    "Reporta faltantes con la pieza exacta del despiece.",
    "El destajo por operación se paga según la ruta de la sección 2.",
  ];
  let y = (doc as any).lastAutoTable.finalY + 22;
  const pageH = doc.internal.pageSize.getHeight();
  if (y > pageH - 110) {
    doc.addPage();
    y = 60;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text("6 · NOTAS PARA EL TALLER", marginX, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(60, 70, 85);
  notes.forEach((n, i) => {
    doc.text(`• ${n}`, marginX, y + 14 + i * 12);
  });

  // ---------- Pie en cada página ----------
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(140, 150, 160);
    doc.text(
      "Documento generado por CoreTextil SaaS",
      marginX,
      pageH - 24
    );
    doc.text(
      `Emitida: ${new Date().toLocaleDateString("es-CO")} · Ref. ${d.referenceCode} · Pág. ${i}/${total}`,
      pageW - marginX,
      pageH - 24,
      { align: "right" }
    );
  }

  return doc;
}

export default function DownloadPdfButton({ garmentId }: { garmentId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setError(null);
    setLoading(true);
    try {
      const res = await getTechSheetPdfData(garmentId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const doc = buildPdf(res.data);
      doc.save(`Ficha-${res.data.referenceCode}.pdf`);
    } catch (e: any) {
      setError(e?.message ?? "No se pudo generar el PDF.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={download}
        disabled={loading}
        className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-50 print:hidden"
      >
        {loading ? "Generando PDF…" : "⬇ Descargar PDF"}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
