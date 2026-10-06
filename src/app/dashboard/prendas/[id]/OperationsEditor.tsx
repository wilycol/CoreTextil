"use client";

import { useState } from "react";
import { addGarmentOperation, deleteGarmentOperation } from "./actions";
import { formatCop } from "@/lib/cop";

type Operation = {
  id: string;
  step_order: number;
  operation_name: string;
  machine_type: string;
  base_rate_cop: number;
  sam_minutes: number | null;
};

const MACHINE_OPTIONS = [
  { value: "plana", label: "Plana (Una aguja)" },
  { value: "fileteadora", label: "Fileteadora (Overlock)" },
  { value: "collarin", label: "Recubridora (Collarín)" },
  { value: "manual", label: "Manual / Mesa (Hilos, Marcas)" },
  { value: "plancha", label: "Planchado y Doblado" },
  { value: "empaque", label: "Empaquetado y Embalaje" },
];

export default function OperationsEditor({
  garmentId,
  initialOperations,
}: {
  garmentId: string;
  initialOperations: Operation[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [opName, setOpName] = useState("");
  const [machineType, setMachineType] = useState("manual");
  const [rateCop, setRateCop] = useState("");
  const [samMinutes, setSamMinutes] = useState("1.0");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!opName.trim()) {
      setError("Indica el nombre de la operación.");
      return;
    }
    const numRate = Number(rateCop);
    if (isNaN(numRate) || numRate < 0) {
      setError("Tarifa COP inválida.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const res = await addGarmentOperation(garmentId, {
      operation_name: opName.trim(),
      machine_type: machineType,
      base_rate_cop: numRate,
      sam_minutes: Number(samMinutes) || 1.0,
    });

    setIsSaving(false);
    if (res.ok) {
      setOpName("");
      setRateCop("");
      setIsOpen(false);
      window.location.reload();
    } else {
      setError(res.error ?? "No se pudo agregar la operación.");
    }
  }

  async function handleDelete(opId: string) {
    setDeletingId(opId);
    setError(null);
    const res = await deleteGarmentOperation(opId, garmentId);
    setDeletingId(null);
    if (res.ok) {
      window.location.reload();
    } else {
      setError(res.error ?? "No se pudo eliminar la operación.");
    }
  }

  return (
    <div className="space-y-4 print:hidden">
      {error && <p className="text-xs font-semibold text-red-500 bg-red-50 p-2 rounded">{error}</p>}

      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          💡 <strong>Ruta Operativa de Ensamble:</strong> Agrega o ajusta las operaciones reales y los procesos ocultos (ej: despeluzado, planchado, empacado) para que los operarios registren su conteo diario.
        </p>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:bg-cyan-500"
        >
          {isOpen ? "✕ Cancelar" : "+ Agregar Operación Oculta / Manual"}
        </button>
      </div>

      {isOpen && (
        <div className="rounded-xl border border-cyan-200 bg-cyan-50/50 p-4 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-900">
            Nueva Operación para la Ruta de Ensamble
          </h4>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">Nombre Operación</label>
              <input
                type="text"
                placeholder="Ej: Despeluzado y remate de hilos"
                value={opName}
                onChange={(e) => setOpName(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">Tipo de Máquina / Proceso</label>
              <select
                value={machineType}
                onChange={(e) => setMachineType(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {MACHINE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">Tarifa Destajo (COP/pieza)</label>
              <input
                type="number"
                placeholder="Ej: 150"
                value={rateCop}
                onChange={(e) => setRateCop(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">SAM (minutos/pieza)</label>
              <input
                type="number"
                step="0.1"
                placeholder="1.0"
                value={samMinutes}
                onChange={(e) => setSamMinutes(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* Sugerencias Rápidas de Operaciones Ocultas */}
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <span className="text-[11px] text-slate-500 font-semibold">Sugerencias rápidas:</span>
            {[
              { name: "Despeluzado y deshebrado", machine: "manual", rate: 120 },
              { name: "Remate y control de calidad", machine: "manual", rate: 150 },
              { name: "Planchado y doblado", machine: "plancha", rate: 200 },
              { name: "Empaquetado final y embolsado", machine: "empaque", rate: 100 },
            ].map((sug) => (
              <button
                key={sug.name}
                type="button"
                onClick={() => {
                  setOpName(sug.name);
                  setMachineType(sug.machine);
                  setRateCop(String(sug.rate));
                }}
                className="rounded bg-white border border-cyan-300 px-2 py-0.5 text-[10px] font-medium text-cyan-800 hover:bg-cyan-100 transition"
              >
                + {sug.name}
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsOpen(false)}
              disabled={isSaving}
              className="rounded-md border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleAdd}
              disabled={isSaving}
              className="rounded-md bg-cyan-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-cyan-600 disabled:opacity-50"
            >
              {isSaving ? "Guardando..." : "Guardar Operación"}
            </button>
          </div>
        </div>
      )}

      {/* Lista de operaciones existentes con opción de eliminar */}
      {initialOperations.length > 0 && (
        <div className="space-y-1">
          {initialOperations.map((op) => (
            <div key={op.id} className="flex items-center justify-between text-xs py-1 px-2 hover:bg-slate-50 rounded">
              <span className="font-mono text-slate-500 w-6">#{op.step_order}</span>
              <span className="font-medium text-slate-800 flex-1">{op.operation_name}</span>
              <span className="text-slate-500 w-32">{op.machine_type}</span>
              <span className="font-semibold text-slate-900 w-24 text-right">{formatCop(op.base_rate_cop)}</span>
              <button
                onClick={() => handleDelete(op.id)}
                disabled={deletingId === op.id}
                className="ml-3 text-red-400 hover:text-red-600 text-xs font-bold disabled:opacity-50"
                title="Eliminar operación"
              >
                {deletingId === op.id ? "..." : "✕"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
