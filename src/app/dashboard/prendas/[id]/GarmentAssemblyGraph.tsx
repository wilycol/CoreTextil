"use client";

import React, { useState } from "react";
import Image from "next/image";

interface Part {
  id: string;
  part_code: string;
  name: string;
  material_type?: string;
  image_url?: string;
}

interface Operation {
  id: string;
  step_order: number;
  operation_name: string;
  machine_type: string;
  stitch_type?: string;
  sam_minutes?: number;
  base_rate_cop?: number;
  instruction?: string;
}

interface GarmentAssemblyGraphProps {
  garmentName: string;
  referenceCode: string;
  explodedImageUrl?: string;
  studioRenderUrl?: string;
  parts: Part[];
  operations: Operation[];
}

export default function GarmentAssemblyGraph({
  garmentName,
  referenceCode,
  explodedImageUrl,
  studioRenderUrl,
  parts,
  operations,
}: GarmentAssemblyGraphProps) {
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [selectedOp, setSelectedOp] = useState<Operation | null>(null);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [ticketSuccessMessage, setTicketSuccessMessage] = useState<string | null>(null);
  const [logSuccessMessage, setLogSuccessMessage] = useState<string | null>(null);

  // Mapear posiciones visuales fijas para el diagrama de nodos de ensamble
  const getPartPosition = (partCode: string, index: number) => {
    const code = partCode.toUpperCase();
    if (code.includes("FRONT")) return { col: 2, row: 2, label: "Centro (Frente)" };
    if (code.includes("BACK")) return { col: 2, row: 1, label: "Superior (Espalda)" };
    if (code.includes("SLV_L") || (code.includes("SLV") && index % 2 === 0))
      return { col: 1, row: 2, label: "Izquierda (Manga L)" };
    if (code.includes("SLV_R") || code.includes("SLV"))
      return { col: 3, row: 2, label: "Derecha (Manga R)" };
    if (code.includes("CLLR") || code.includes("CUELLO"))
      return { col: 2, row: 0, label: "Top (Cuello)" };
    return { col: (index % 3) + 1, row: Math.floor(index / 3) + 1, label: `Posición ${index + 1}` };
  };

  const handleTicketSubmit = (partName: string) => {
    setTicketSuccessMessage(`✅ Requisición de pieza '${partName}' generada exitosamente. Notificación enviada al Jefe de Satélite.`);
    setTimeout(() => setTicketSuccessMessage(null), 4000);
  };

  const handleLogSubmit = (partName: string) => {
    setLogSuccessMessage(`✅ Producción registrada: 50 unidades confeccionadas de '${partName}'.`);
    setTimeout(() => setLogSuccessMessage(null), 4000);
  };

  const machineBadge = (mType: string) => {
    const m = mType.toLowerCase();
    if (m.includes("filete")) return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    if (m.includes("collar")) return "bg-purple-500/20 text-purple-300 border-purple-500/30";
    return "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";
  };

  return (
    <div className="my-8 rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-100 shadow-2xl print:hidden">
      {/* Header del Diagrama Interactivo */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-400"></span>
            <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">
              CoreTextil CAD & Assembly Graph Engine V2
            </span>
          </div>
          <h2 className="mt-1 text-xl font-extrabold text-white">
            Diagrama Interactivo de Ensamble y Rompecabezas de Confección
          </h2>
          <p className="text-xs text-slate-400">
            Haz clic en cualquier pieza o línea de costura para ver cotas, lanzar requisiciones o registrar trabajo diario.
          </p>
        </div>

        {/* Reproductor de Pasos de Confección */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 p-1.5">
          <span className="px-2 text-xs font-semibold text-slate-400">Paso:</span>
          <button
            onClick={() => setActiveStep(null)}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
              activeStep === null
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            Ver Todo
          </button>
          {operations.map((op) => (
            <button
              key={op.id}
              onClick={() => {
                setActiveStep(op.step_order);
                setSelectedOp(op);
                setSelectedPart(null);
              }}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                activeStep === op.step_order
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              #{op.step_order}
            </button>
          ))}
        </div>
      </div>

      {/* Mensajes de Alerta de Éxito */}
      {ticketSuccessMessage && (
        <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-950/60 p-3 text-xs font-semibold text-emerald-300 animate-in fade-in">
          {ticketSuccessMessage}
        </div>
      )}
      {logSuccessMessage && (
        <div className="mt-4 rounded-xl border border-cyan-500/40 bg-cyan-950/60 p-3 text-xs font-semibold text-cyan-300 animate-in fade-in">
          {logSuccessMessage}
        </div>
      )}

      {/* Lienzo Principal del Diagrama */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Columna 1 y 2: Mapa de Nodos de Piezas */}
        <div className="relative rounded-2xl border border-slate-800/80 bg-slate-900/50 p-6 lg:col-span-2 min-h-[420px] flex flex-col justify-center">
          <div className="absolute top-3 right-4 flex items-center gap-2 text-[10px] text-slate-500 font-mono">
            <span>Grid 5x5 cm</span> | <span>Piezas: {parts.length}</span>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {parts.map((p, idx) => {
              const isSelected = selectedPart?.id === p.id;
              const isHighlightStep = activeStep !== null;

              return (
                <div
                  key={p.id}
                  onClick={() => {
                    setSelectedPart(p);
                    setSelectedOp(null);
                  }}
                  className={`group relative cursor-pointer overflow-hidden rounded-xl border p-3 transition-all duration-300 ${
                    isSelected
                      ? "border-cyan-400 bg-slate-800/90 shadow-xl shadow-cyan-500/20 scale-[1.03]"
                      : isHighlightStep
                      ? "border-slate-700/50 bg-slate-900/40 opacity-70 hover:opacity-100"
                      : "border-slate-800 bg-slate-900/80 hover:border-cyan-500/50 hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] font-bold text-cyan-300 border border-slate-700">
                      [{p.part_code}]
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {p.material_type || "Tela Principal"}
                    </span>
                  </div>

                  <div className="relative mt-2.5 h-28 w-full overflow-hidden rounded-lg bg-slate-950 border border-slate-800/60">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="h-full w-full object-contain p-1 transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-slate-600">
                        Sin vista previa
                      </div>
                    )}
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <p className="truncate text-xs font-semibold text-white group-hover:text-cyan-300">
                      {p.name}
                    </p>
                    <span className="text-[10px] text-cyan-400 group-hover:translate-x-0.5 transition-transform">
                      Ver →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Línea de operaciones dinámicas */}
          <div className="mt-6 border-t border-slate-800/80 pt-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Líneas de Costura e Interconexión de Ensamblaje:
            </p>
            <div className="flex flex-wrap gap-2">
              {operations.map((op) => {
                const isOpSelected = selectedOp?.id === op.id;
                const isActive = activeStep === op.step_order;

                return (
                  <button
                    key={op.id}
                    onClick={() => {
                      setSelectedOp(op);
                      setSelectedPart(null);
                      setActiveStep(op.step_order);
                    }}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-all ${
                      isOpSelected || isActive
                        ? "border-cyan-400 bg-cyan-950/40 text-cyan-200 font-semibold shadow-lg shadow-cyan-500/10"
                        : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700 hover:text-white"
                    }`}
                  >
                    <span className="font-mono font-bold text-cyan-400">
                      Step #{op.step_order}
                    </span>
                    <span className="truncate max-w-[140px]">{op.operation_name}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[9px] border ${machineBadge(op.machine_type)}`}>
                      {op.machine_type}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Columna 3: Panel Lateral Informativo e Interactivo */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 flex flex-col justify-between">
          {selectedPart ? (
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="rounded bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-300 border border-cyan-500/30">
                    [{selectedPart.part_code}]
                  </span>
                  <h3 className="mt-1 text-base font-bold text-white">
                    {selectedPart.name}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedPart(null)}
                  className="text-xs text-slate-500 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 relative h-48 w-full overflow-hidden rounded-xl bg-slate-950 border border-slate-800">
                {selectedPart.image_url && (
                  <img
                    src={selectedPart.image_url}
                    alt={selectedPart.name}
                    className="h-full w-full object-contain p-2"
                  />
                )}
              </div>

              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-800 py-1 text-slate-400">
                  <span>Material / Tela:</span>
                  <b className="text-white">{selectedPart.material_type || "Tela Principal"}</b>
                </div>
                <div className="flex justify-between border-b border-slate-800 py-1 text-slate-400">
                  <span>Escala Cad:</span>
                  <b className="text-white">1:1 Industrial</b>
                </div>
                <div className="flex justify-between py-1 text-slate-400">
                  <span>Estado de Corte:</span>
                  <b className="text-emerald-400">Verificado en Mesa</b>
                </div>
              </div>

              {/* Botones de Acción Interactivos para el Operario */}
              <div className="mt-6 space-y-2.5">
                <button
                  onClick={() => handleTicketSubmit(selectedPart.name)}
                  className="w-full rounded-xl border border-rose-500/40 bg-rose-950/40 py-2.5 text-xs font-bold text-rose-300 hover:bg-rose-900/60 hover:text-white transition-all shadow-md shadow-rose-950/50"
                >
                  🎫 Generar Requisición (Pieza Faltante/Dañada)
                </button>
                <button
                  onClick={() => handleLogSubmit(selectedPart.name)}
                  className="w-full rounded-xl border border-cyan-500/40 bg-cyan-950/40 py-2.5 text-xs font-bold text-cyan-300 hover:bg-cyan-900/60 hover:text-white transition-all shadow-md shadow-cyan-950/50"
                >
                  📊 Registrar Avance Diario (+50 Unidades)
                </button>
              </div>
            </div>
          ) : selectedOp ? (
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="rounded bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-300 border border-cyan-500/30">
                    Paso #{selectedOp.step_order}
                  </span>
                  <h3 className="mt-1 text-base font-bold text-white">
                    {selectedOp.operation_name}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedOp(null)}
                  className="text-xs text-slate-500 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Máquina Industrial:</span>
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold border ${machineBadge(selectedOp.machine_type)}`}>
                    {selectedOp.machine_type}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Puntada Estándar ISO:</span>
                  <b className="text-cyan-300 font-mono">{selectedOp.stitch_type || "504"}</b>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Tiempo Estándar (SAM):</span>
                  <b className="text-white">{selectedOp.sam_minutes || "2.5"} min</b>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Tarifa Destajo:</span>
                  <b className="text-emerald-400">${selectedOp.base_rate_cop || 300} COP</b>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-800/80 bg-slate-900/90 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Instrucciones de Confección:
                </p>
                <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                  {selectedOp.instruction || "Realizar costura según especificación de ficha técnica y tensión de máquina calibrada."}
                </p>
              </div>

              <div className="mt-6">
                <button
                  onClick={() => handleLogSubmit(`Operación Paso #${selectedOp.step_order}`)}
                  className="w-full rounded-xl border border-purple-500/40 bg-purple-950/40 py-2.5 text-xs font-bold text-purple-300 hover:bg-purple-900/60 hover:text-white transition-all shadow-md shadow-purple-950/50"
                >
                  ⏱️ Registrar Avance de Operación en Línea
                </button>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center p-4">
              <div className="h-12 w-12 rounded-2xl bg-slate-800/60 border border-slate-700 flex items-center justify-center text-cyan-400 text-xl">
                🧩
              </div>
              <h4 className="mt-3 text-sm font-bold text-white">
                Selecciona una Pieza o Costura
              </h4>
              <p className="mt-1 text-xs text-slate-400 max-w-[220px]">
                Haz clic en una pieza del mapa para abrir su ficha técnica, generar un ticket de reposición o reportar avance.
              </p>
            </div>
          )}

          {/* Footer de información */}
          <div className="mt-6 border-t border-slate-800 pt-3 text-[10px] text-slate-500 flex justify-between">
            <span>Prenda: {garmentName}</span>
            <span>Ref: {referenceCode}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
