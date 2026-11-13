"use client";

import { useState, useMemo } from "react";

export type OperationProgress = {
  id: string;
  stepOrder: number;
  operationName: string;
  machineType: string;
  rateCop: number;
  samMinutes?: number | null;
  unitsCompleted: number;
  totalUnits: number;
  hasAlert?: boolean;
};

type ZoneType = "hombros" | "cuello" | "mangas" | "costados" | "ruedos" | "pechera";

// Mapeo heurístico inteligente de operaciones a zonas 2D de la silueta
function detectZone(operationName: string): ZoneType {
  const op = operationName.toLowerCase();
  if (op.includes("hombro") || op.includes("hombrera")) return "hombros";
  if (op.includes("cuello") || op.includes("rib") || op.includes("sesgo") || op.includes("escote")) return "cuello";
  if (op.includes("manga") && !op.includes("ruedo") && !op.includes("dobladill")) return "mangas";
  if (op.includes("costado") || op.includes("cerrar") || op.includes("lateral")) return "costados";
  if (op.includes("ruedo") || op.includes("dobladill") || op.includes("bajo") || op.includes("faldon")) return "ruedos";
  if (op.includes("pechera") || op.includes("boton") || op.includes("presille") || op.includes("bolsillo")) return "pechera";
  return "costados";
}

function getStatus(completed: number, total: number, hasAlert?: boolean) {
  if (hasAlert) return { label: "Novedad / Alerta", color: "rose", hex: "#ef4444" };
  if (completed >= total && total > 0) return { label: "Completado 100%", color: "emerald", hex: "#10b981" };
  if (completed > 0) {
    const pct = Math.round((completed / total) * 100);
    return { label: `En proceso (${pct}%)`, color: "amber", hex: "#f59e0b" };
  }
  return { label: "Pendiente", color: "slate", hex: "#475569" };
}

export default function GarmentAssemblyViewer2D({
  operations,
  garmentName,
  referenceCode,
  totalOrderUnits,
}: {
  operations: OperationProgress[];
  garmentName: string;
  referenceCode: string;
  totalOrderUnits: number;
}) {
  const [hoveredZone, setHoveredZone] = useState<ZoneType | null>(null);
  const [selectedOpId, setSelectedOpId] = useState<string | null>(null);

  // Agrupar operaciones por zona
  const zoneStatusMap = useMemo(() => {
    const map: Record<ZoneType, { completed: number; total: number; hasAlert: boolean }> = {
      hombros: { completed: 0, total: 0, hasAlert: false },
      cuello: { completed: 0, total: 0, hasAlert: false },
      mangas: { completed: 0, total: 0, hasAlert: false },
      costados: { completed: 0, total: 0, hasAlert: false },
      ruedos: { completed: 0, total: 0, hasAlert: false },
      pechera: { completed: 0, total: 0, hasAlert: false },
    };

    operations.forEach((op) => {
      const zone = detectZone(op.operationName);
      map[zone].completed += op.unitsCompleted;
      map[zone].total += op.totalUnits;
      if (op.hasAlert) map[zone].hasAlert = true;
    });

    return map;
  }, [operations]);

  // Colores por zona
  const zoneColors = useMemo(() => {
    const res: Record<ZoneType, string> = {} as any;
    (Object.keys(zoneStatusMap) as ZoneType[]).forEach((z) => {
      const { completed, total, hasAlert } = zoneStatusMap[z];
      res[z] = getStatus(completed, total, hasAlert).hex;
    });
    return res;
  }, [zoneStatusMap]);

  // Si hay una operación seleccionada o hovered, destacar su zona
  const activeZone = useMemo(() => {
    if (hoveredZone) return hoveredZone;
    if (selectedOpId) {
      const op = operations.find((o) => o.id === selectedOpId);
      if (op) return detectZone(op.operationName);
    }
    return null;
  }, [hoveredZone, selectedOpId, operations]);

  // Porcentaje global de ensamble de la orden
  const globalPct = useMemo(() => {
    const totalPossible = operations.reduce((acc, o) => acc + o.totalUnits, 0);
    const totalDone = operations.reduce((acc, o) => acc + o.unitsCompleted, 0);
    if (!totalPossible) return 0;
    return Math.min(100, Math.round((totalDone / totalPossible) * 100));
  }, [operations]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-md shadow-xl">
      {/* Header del visor */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-cyan-950 px-2.5 py-0.5 text-xs font-bold text-cyan-400 border border-cyan-800/60">
              Gemelo Digital 2D
            </span>
            <span className="text-xs font-medium text-slate-400">
              Ref: <strong className="text-slate-200">{referenceCode}</strong> · {garmentName}
            </span>
          </div>
          <h2 className="mt-1 text-lg font-bold text-slate-100 flex items-center gap-2">
            Avance de Ensamble de la Prenda
          </h2>
        </div>

        {/* Semáforo Global */}
        <div className="flex items-center gap-3 bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-2">
          <div className="text-right">
            <div className="text-xs text-slate-400">Avance General</div>
            <div className="font-mono text-lg font-bold text-cyan-300">{globalPct}%</div>
          </div>
          <div className="w-16 h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${globalPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Convención de colores */}
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-400 border-b border-slate-800/50 pb-3">
        <span className="font-semibold text-slate-300">Convención en Planta:</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block shadow-sm shadow-emerald-500/50" />
          Completado (100%)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400 inline-block shadow-sm shadow-amber-400/50" />
          En proceso en máquinas
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-600 inline-block" />
          Pendiente de costura
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500 inline-block shadow-sm shadow-rose-500/50" />
          Cuello de botella / Ticket
        </span>
      </div>

      {/* Grid: Silueta 2D a la izquierda, lista interactiva de operaciones a la derecha */}
      <div className="mt-6 grid gap-8 lg:grid-cols-12 items-center">
        {/* Gráfico SVG Silueta 2D */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="relative w-full max-w-[280px] aspect-[1/1.1]">
            <svg
              viewBox="0 0 300 320"
              className="w-full h-full drop-shadow-2xl select-none"
              style={{ overflow: "visible" }}
            >
              <defs>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Fondo del cuerpo de la prenda (Silueta base) */}
              <path
                d="M 90 45 L 60 55 L 20 110 L 55 135 L 75 100 L 75 280 L 225 280 L 225 100 L 245 135 L 280 110 L 240 55 L 210 45 Q 150 75 90 45 Z"
                fill="#0f172a"
                stroke="#1e293b"
                strokeWidth="2"
              />

              {/* 1. ZONA HOMBROS */}
              <g
                onMouseEnter={() => setHoveredZone("hombros")}
                onMouseLeave={() => setHoveredZone(null)}
                className="cursor-pointer transition-all duration-300"
              >
                {/* Hombro Izquierdo */}
                <path
                  d="M 90 45 L 60 55"
                  stroke={zoneColors.hombros}
                  strokeWidth={activeZone === "hombros" ? "6" : "3.5"}
                  strokeLinecap="round"
                  strokeDasharray={zoneColors.hombros === "#475569" ? "4 3" : undefined}
                  filter={activeZone === "hombros" ? "url(#glow)" : undefined}
                />
                {/* Hombro Derecho */}
                <path
                  d="M 210 45 L 240 55"
                  stroke={zoneColors.hombros}
                  strokeWidth={activeZone === "hombros" ? "6" : "3.5"}
                  strokeLinecap="round"
                  strokeDasharray={zoneColors.hombros === "#475569" ? "4 3" : undefined}
                  filter={activeZone === "hombros" ? "url(#glow)" : undefined}
                />
              </g>

              {/* 2. ZONA CUELLO */}
              <g
                onMouseEnter={() => setHoveredZone("cuello")}
                onMouseLeave={() => setHoveredZone(null)}
                className="cursor-pointer transition-all duration-300"
              >
                <path
                  d="M 90 45 Q 150 90 210 45 Q 150 65 90 45 Z"
                  fill={zoneColors.cuello}
                  fillOpacity={activeZone === "cuello" ? "0.45" : "0.2"}
                  stroke={zoneColors.cuello}
                  strokeWidth={activeZone === "cuello" ? "4" : "2.5"}
                  strokeLinecap="round"
                  filter={activeZone === "cuello" ? "url(#glow)" : undefined}
                />
              </g>

              {/* 3. ZONA MANGAS (Pegar mangas a sisa) */}
              <g
                onMouseEnter={() => setHoveredZone("mangas")}
                onMouseLeave={() => setHoveredZone(null)}
                className="cursor-pointer transition-all duration-300"
              >
                {/* Sisa Izquierda */}
                <path
                  d="M 60 55 Q 70 80 75 100"
                  stroke={zoneColors.mangas}
                  strokeWidth={activeZone === "mangas" ? "6" : "3.5"}
                  strokeLinecap="round"
                  strokeDasharray={zoneColors.mangas === "#475569" ? "4 3" : undefined}
                  filter={activeZone === "mangas" ? "url(#glow)" : undefined}
                />
                {/* Sisa Derecha */}
                <path
                  d="M 240 55 Q 230 80 225 100"
                  stroke={zoneColors.mangas}
                  strokeWidth={activeZone === "mangas" ? "6" : "3.5"}
                  strokeLinecap="round"
                  strokeDasharray={zoneColors.mangas === "#475569" ? "4 3" : undefined}
                  filter={activeZone === "mangas" ? "url(#glow)" : undefined}
                />
                {/* Relleno tenue de mangas si están activas */}
                <polygon
                  points="60,55 20,110 55,135 75,100"
                  fill={zoneColors.mangas}
                  fillOpacity={activeZone === "mangas" ? "0.25" : "0.08"}
                />
                <polygon
                  points="240,55 280,110 245,135 225,100"
                  fill={zoneColors.mangas}
                  fillOpacity={activeZone === "mangas" ? "0.25" : "0.08"}
                />
              </g>

              {/* 4. ZONA COSTADOS (Cerrar costados con fileteadora) */}
              <g
                onMouseEnter={() => setHoveredZone("costados")}
                onMouseLeave={() => setHoveredZone(null)}
                className="cursor-pointer transition-all duration-300"
              >
                {/* Costado Izquierdo */}
                <path
                  d="M 75 100 L 75 280"
                  stroke={zoneColors.costados}
                  strokeWidth={activeZone === "costados" ? "6" : "3.5"}
                  strokeLinecap="round"
                  strokeDasharray={zoneColors.costados === "#475569" ? "4 3" : undefined}
                  filter={activeZone === "costados" ? "url(#glow)" : undefined}
                />
                {/* Costado Derecho */}
                <path
                  d="M 225 100 L 225 280"
                  stroke={zoneColors.costados}
                  strokeWidth={activeZone === "costados" ? "6" : "3.5"}
                  strokeLinecap="round"
                  strokeDasharray={zoneColors.costados === "#475569" ? "4 3" : undefined}
                  filter={activeZone === "costados" ? "url(#glow)" : undefined}
                />
              </g>

              {/* 5. ZONA RUEDOS (Dobladillar faldón y mangas con collarín) */}
              <g
                onMouseEnter={() => setHoveredZone("ruedos")}
                onMouseLeave={() => setHoveredZone(null)}
                className="cursor-pointer transition-all duration-300"
              >
                {/* Ruedo Manga Izquierda */}
                <path
                  d="M 20 110 L 55 135"
                  stroke={zoneColors.ruedos}
                  strokeWidth={activeZone === "ruedos" ? "5" : "3"}
                  strokeLinecap="round"
                  strokeDasharray="3 2"
                  filter={activeZone === "ruedos" ? "url(#glow)" : undefined}
                />
                {/* Ruedo Manga Derecha */}
                <path
                  d="M 280 110 L 245 135"
                  stroke={zoneColors.ruedos}
                  strokeWidth={activeZone === "ruedos" ? "5" : "3"}
                  strokeLinecap="round"
                  strokeDasharray="3 2"
                  filter={activeZone === "ruedos" ? "url(#glow)" : undefined}
                />
                {/* Ruedo Faldón (Inferior) */}
                <path
                  d="M 75 280 L 225 280"
                  stroke={zoneColors.ruedos}
                  strokeWidth={activeZone === "ruedos" ? "6" : "4"}
                  strokeLinecap="round"
                  strokeDasharray="4 3"
                  filter={activeZone === "ruedos" ? "url(#glow)" : undefined}
                />
              </g>

              {/* Indicador de zona activa flotante */}
              {activeZone && (
                <text
                  x="150"
                  y="180"
                  textAnchor="middle"
                  fill="#f8fafc"
                  fontSize="12"
                  fontWeight="bold"
                  className="bg-slate-900"
                >
                  Zona: {activeZone.toUpperCase()}
                </text>
              )}
            </svg>
          </div>
          <p className="mt-3 text-center text-xs text-slate-400">
            Haz clic o pasa el ratón sobre las costuras para inspeccionar la operación en planta.
          </p>
        </div>

        {/* Lista interactiva de operaciones por proceso */}
        <div className="lg:col-span-7 space-y-2.5 max-h-[380px] overflow-y-auto pr-2">
          {operations.length === 0 ? (
            <p className="text-sm text-slate-400">No hay operaciones configuradas para esta prenda.</p>
          ) : (
            operations.map((op) => {
              const zone = detectZone(op.operationName);
              const isSelected = selectedOpId === op.id;
              const isZoneActive = activeZone === zone;
              const status = getStatus(op.unitsCompleted, op.totalUnits, op.hasAlert);
              const pct = op.totalUnits > 0 ? Math.round((op.unitsCompleted / op.totalUnits) * 100) : 0;

              return (
                <div
                  key={op.id}
                  onClick={() => setSelectedOpId(isSelected ? null : op.id)}
                  onMouseEnter={() => setHoveredZone(zone)}
                  onMouseLeave={() => setHoveredZone(null)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                    isSelected || isZoneActive
                      ? "border-cyan-400/80 bg-slate-800/90 shadow-md shadow-cyan-950/50"
                      : "border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-slate-300">
                        {op.stepOrder}
                      </span>
                      <span className="font-semibold text-sm text-slate-200">
                        {op.operationName}
                      </span>
                    </div>

                    <span
                      className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      style={{
                        backgroundColor: `${status.hex}22`,
                        color: status.hex,
                        border: `1px solid ${status.hex}55`,
                      }}
                    >
                      {status.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <span className="rounded bg-slate-800/80 px-1.5 py-0.5 text-[10px] text-cyan-300 font-mono">
                        {op.machineType}
                      </span>
                      {op.samMinutes ? <span>· {op.samMinutes} SAM</span> : null}
                    </span>

                    <span className="font-mono text-slate-300">
                      <strong>{op.unitsCompleted}</strong> / {op.totalUnits} unids ({pct}%)
                    </span>
                  </div>

                  {/* Barra de progreso de la operación */}
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden mt-1">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: status.hex,
                      }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

