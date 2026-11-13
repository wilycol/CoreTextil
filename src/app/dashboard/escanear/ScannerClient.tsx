"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import jsQR from "jsqr";
import { formatCop } from "@/lib/cop";
import { getBundleSheet, receiveBundle, type ReceivedBundle, type BundleSheet } from "./actions";
import GarmentAssemblyViewer2D from "@/components/GarmentAssemblyViewer2D";
import { logProduction } from "../operario/actions";

type Mode = "idle" | "scanning" | "confirm" | "done";

export default function ScannerClient({
  initialCode,
}: {
  initialCode: string | null;
}) {
  const [mode, setMode] = useState<Mode>(initialCode ? "confirm" : "idle");
  const [code, setCode] = useState(initialCode ?? "");
  const [manual, setManual] = useState("");
  const [result, setResult] = useState<ReceivedBundle | null>(null);
  const [sheet, setSheet] = useState<BundleSheet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Estados de marcación rápida en vivo por atado
  const [liveCompleted, setLiveCompleted] = useState<Record<string, number>>({});
  const [selectedOpId, setSelectedOpId] = useState<string | null>(null);
  const [markingCustomQty, setMarkingCustomQty] = useState("10");
  const [markingSuccess, setMarkingSuccess] = useState<string | null>(null);
  const [markingError, setMarkingError] = useState<string | null>(null);
  const [isMarking, startMarkingTransition] = useTransition();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  const cooldownRef = useRef(0);

  const stopCamera = useCallback(() => {
    activeRef.current = false;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const handleDetected = useCallback((raw: string) => {
    const value = raw.trim();
    if (!value) return;
    stopCamera();
    setCode(value);
    setError(null);
    setMode("confirm");
  }, [stopCamera]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Este navegador no permite cámara (o la página no es HTTPS). Usa el código manual."
        );
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();

      activeRef.current = true;
      setMode("scanning");

      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

      const tick = () => {
        if (!activeRef.current) return;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const found = jsQR(img.data, img.width, img.height, {
            inversionAttempts: "dontInvert",
          });
          const now = Date.now();
          if (found?.data && now - cooldownRef.current > 1500) {
            cooldownRef.current = now;
            handleDetected(found.data);
            return;
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (e: any) {
      setCameraError(
        e?.name === "NotAllowedError"
          ? "No diste permiso de cámara. Habilítalo o usa el código manual."
          : (e?.message ?? "No se pudo abrir la cámara.")
      );
      setMode("idle");
    }
  }, [handleDetected]);

  useEffect(() => stopCamera, [stopCamera]);

  // Ficha técnica resumida de la prenda del atado (qué coser y a cuánto)
  useEffect(() => {
    if (mode !== "confirm" && mode !== "done") return;
    let alive = true;
    setSheet(null);
    getBundleSheet(code).then((res) => {
      if (alive && res.ok) setSheet(res.sheet);
    });
    return () => {
      alive = false;
    };
  }, [mode, code]);

  useEffect(() => {
    if (sheet?.operations) {
      const initialMap: Record<string, number> = {};
      sheet.operations.forEach((o) => {
        initialMap[o.id] = o.units_completed || 0;
      });
      setLiveCompleted(initialMap);
      if (sheet.operations[0]) {
        setSelectedOpId(sheet.operations[0].id);
      }
    }
  }, [sheet]);

  function handleQuickMark(opId: string, units: number) {
    if (!sheet) return;
    setMarkingError(null);
    setMarkingSuccess(null);

    const safeUnits = Math.floor(Number(units));
    if (!Number.isFinite(safeUnits) || safeUnits <= 0) {
      setMarkingError("Cantidad inválida.");
      return;
    }

    startMarkingTransition(async () => {
      const res = await logProduction(sheet.bundleId, opId, safeUnits);
      if (res.ok) {
        setLiveCompleted((prev) => ({
          ...prev,
          [opId]: (prev[opId] || 0) + safeUnits,
        }));
        const targetOp = sheet.operations.find((o) => o.id === opId);
        setMarkingSuccess(
          `✅ ¡Marcaste ${safeUnits} piezas en "${targetOp?.operation_name}"! (+${formatCop(res.earned)} a tu billetera)`
        );
      } else {
        setMarkingError(res.error || "No se pudo registrar la producción.");
      }
    });
  }

  function confirmReceive() {
    setError(null);
    startTransition(async () => {
      const res = await receiveBundle(code);
      if (res.ok) {
        setResult(res.data);
        setMode("done");
      } else {
        setError(res.error ?? "No se pudo recibir el atado.");
      }
    });
  }

  function reset() {
    setResult(null);
    setCode("");
    setManual("");
    setError(null);
    setMarkingSuccess(null);
    setMarkingError(null);
    setMode("idle");
  }

  // ---------- Confirmación ----------
  if (mode === "confirm") {
    return (
      <div className="space-y-4 rounded-2xl border border-cyan-900 bg-slate-900/60 p-5">
        <p className="text-sm text-slate-400">Atado detectado</p>
        <p className="font-mono text-2xl font-extrabold text-cyan-300">{code}</p>
        {sheet && (
          <BundleSheetCard sheet={sheet} compact />
        )}
        {error && (
          <p className="rounded-lg bg-red-950 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={confirmReceive}
            disabled={pending}
            className="flex-1 rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {pending ? "Confirmando…" : "Confirmar recepción"}
          </button>
          <button
            onClick={reset}
            className="rounded-lg border border-slate-700 px-4 py-3 font-semibold text-slate-300 hover:border-cyan-500"
          >
            Cancelar
          </button>
        </div>
        <p className="text-xs text-slate-500">
          ¿No es el atado correcto? Vuelve a escanear; la recepción solo se
          registra al confirmar.
        </p>
      </div>
    );
  }

  // ---------- Resultado ----------
  if (mode === "done" && result) {
    const currentViewerOps = sheet
      ? sheet.operations.map((o) => ({
          id: o.id,
          stepOrder: o.step_order,
          operationName: o.operation_name,
          machineType: o.machine_type,
          rateCop: o.base_rate_cop,
          samMinutes: o.sam_minutes,
          unitsCompleted: liveCompleted[o.id] ?? o.units_completed ?? 0,
          totalUnits: sheet.units,
        }))
      : [];

    const activeOp =
      sheet?.operations.find((o) => o.id === selectedOpId) ||
      sheet?.operations[0] ||
      null;
    const activeCompleted = activeOp
      ? liveCompleted[activeOp.id] ?? activeOp.units_completed ?? 0
      : 0;
    const activeRemaining = activeOp && sheet
      ? Math.max(0, sheet.units - activeCompleted)
      : 0;

    let prerequisiteWarning: string | null = null;
    if (activeOp?.prerequisite_operation_id) {
      const prereqOp = sheet?.operations.find(
        (o) => o.id === activeOp.prerequisite_operation_id
      );
      if (prereqOp) {
        const prereqDone =
          liveCompleted[prereqOp.id] ?? prereqOp.units_completed ?? 0;
        if (prereqDone < activeCompleted + 1) {
          prerequisiteWarning = `⚠️ Secuencia de ensamble: La operación previa "${prereqOp.operation_name}" tiene solo ${prereqDone}/${sheet?.units} piezas terminadas en este atado.`;
        }
      }
    }

    return (
      <div className="space-y-6">
        {/* Banner de estado del atado */}
        <div className="rounded-2xl border border-emerald-800 bg-emerald-950/40 p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-900/80 px-2.5 py-0.5 text-xs font-bold text-emerald-300 border border-emerald-700/50">
                {result.alreadyReceived ? "Atado en Planta" : "Atado Recibido"}
              </span>
              <span className="font-mono text-sm text-slate-300">
                Orden {result.orderNumber}
              </span>
            </div>
            <h1 className="mt-1 font-mono text-2xl font-extrabold text-emerald-300">
              {result.bundleCode}
            </h1>
            <p className="text-sm text-emerald-200/80">
              Talla <strong className="text-white">{result.size}</strong> · Color{" "}
              <strong className="text-white">{result.color}</strong> ·{" "}
              <strong className="text-white">{result.units}</strong> unidades
            </p>
          </div>

          <button
            onClick={reset}
            className="rounded-xl border border-emerald-600/80 bg-emerald-900/40 px-4 py-2.5 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-800/60 active:scale-95 flex items-center gap-2 shadow-lg"
          >
            📷 Escanear otro atado
          </button>
        </div>

        {/* Visor 2D Interactivo de la Prenda y Avance del Atado */}
        {sheet && (
          <GarmentAssemblyViewer2D
            operations={currentViewerOps}
            garmentName={sheet.garmentName}
            referenceCode={sheet.referenceCode}
            totalOrderUnits={sheet.units}
          />
        )}

        {/* Consola de Marcación Directa por Operación */}
        {sheet && activeOp && (
          <div className="rounded-2xl border border-cyan-800/80 bg-slate-900/90 p-5 shadow-2xl backdrop-blur-md space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs uppercase font-bold text-cyan-400 tracking-wider">
                  Marcación Rápida en Máquina
                </span>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <span>Paso {activeOp.step_order}:</span> {activeOp.operation_name}
                </h3>
                <p className="text-xs text-slate-400">
                  Máquina: <strong className="text-slate-200">{activeOp.machine_type}</strong> · Tarifa:{" "}
                  <strong className="text-emerald-400">{formatCop(activeOp.base_rate_cop)}</strong> / pieza
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 block">Avance de esta operación</span>
                <span className="font-mono text-base font-bold text-cyan-300">
                  {activeCompleted} / {sheet.units} uds
                </span>
                <span className="text-xs text-slate-400 block">
                  {activeRemaining > 0 ? `Quedan ${activeRemaining}` : "✅ Completado"}
                </span>
              </div>
            </div>

            {/* Selector de operación rápida */}
            <div>
              <span className="text-xs text-slate-400 block mb-2 font-medium">
                ¿Qué operación estás confeccionando en tu máquina?
              </span>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {sheet.operations.map((o) => {
                  const isCurrent = o.id === activeOp.id;
                  const doneUnits = liveCompleted[o.id] ?? o.units_completed ?? 0;
                  const isFinished = doneUnits >= sheet.units;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => {
                        setSelectedOpId(o.id);
                        setMarkingError(null);
                        setMarkingSuccess(null);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isCurrent
                          ? "border-cyan-400 bg-cyan-950/60 shadow-md shadow-cyan-950/50"
                          : "border-slate-800 bg-slate-950/50 hover:border-slate-700 hover:bg-slate-900"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300">
                          Paso {o.step_order}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            isFinished
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                              : doneUnits > 0
                              ? "bg-amber-950 text-amber-300 border border-amber-800"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {isFinished ? "100%" : `${doneUnits}/${sheet.units}`}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-slate-100 truncate">
                        {o.operation_name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {o.machine_type} · {formatCop(o.base_rate_cop)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Advertencia de secuencia */}
            {prerequisiteWarning && (
              <div className="rounded-xl border border-amber-800/80 bg-amber-950/40 p-3 text-xs text-amber-300">
                {prerequisiteWarning}
              </div>
            )}

            {/* Mensajes de feedback */}
            {markingSuccess && (
              <div className="rounded-xl border border-emerald-800 bg-emerald-950/60 p-3 text-xs text-emerald-300 font-medium animate-fade-in">
                {markingSuccess}
              </div>
            )}
            {markingError && (
              <div className="rounded-xl border border-rose-800 bg-rose-950/60 p-3 text-xs text-rose-300 font-medium">
                {markingError}
              </div>
            )}

            {/* Botones de marcación táctiles */}
            {activeRemaining > 0 ? (
              <div className="space-y-3 pt-2">
                <div className="flex flex-wrap items-center justify-between text-xs text-slate-400">
                  <span>Marca las piezas que acabas de coser en este atado:</span>
                  <span>
                    Tope disponible:{" "}
                    <strong className="text-cyan-300">{activeRemaining} piezas</strong>
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[10, 25, 50].map((step) => (
                    <button
                      key={step}
                      type="button"
                      disabled={isMarking || step > activeRemaining}
                      onClick={() => handleQuickMark(activeOp.id, step)}
                      className="flex-1 rounded-xl bg-cyan-600 py-3 text-base font-bold text-white transition hover:bg-cyan-500 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-cyan-950/40"
                    >
                      +{step}
                    </button>
                  ))}
                  {activeRemaining > 0 && (
                    <button
                      type="button"
                      disabled={isMarking}
                      onClick={() => handleQuickMark(activeOp.id, activeRemaining)}
                      className="flex-1 rounded-xl bg-emerald-600 py-3 text-base font-bold text-white transition hover:bg-emerald-500 active:scale-95 disabled:opacity-40 shadow-lg shadow-emerald-950/40"
                    >
                      Todo ({activeRemaining})
                    </button>
                  )}
                </div>

                {/* Marcación manual por input */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
                  <span className="text-xs text-slate-400">Otra cantidad:</span>
                  <input
                    type="number"
                    min={1}
                    max={activeRemaining}
                    value={markingCustomQty}
                    onChange={(e) => setMarkingCustomQty(e.target.value)}
                    className="w-20 rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-center text-sm font-mono text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={
                      isMarking ||
                      Number(markingCustomQty) <= 0 ||
                      Number(markingCustomQty) > activeRemaining
                    }
                    onClick={() => handleQuickMark(activeOp.id, Number(markingCustomQty))}
                    className="rounded-xl bg-slate-800 px-4 py-1.5 text-xs font-semibold text-slate-200 border border-slate-700 hover:bg-slate-700 active:scale-95 disabled:opacity-40"
                  >
                    {isMarking ? "Guardando…" : "Sumar cantidad"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-800/80 bg-emerald-950/30 p-4 text-center">
                <p className="text-sm font-bold text-emerald-300">
                  🎉 ¡Operación "{activeOp.operation_name}" completada al 100% en este atado!
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Se confeccionaron todas las {sheet.units} unidades de este bulto.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Ficha técnica compacta de insumos */}
        {sheet && (
          <div className="mt-4">
            <BundleSheetCard sheet={sheet} />
          </div>
        )}
      </div>
    );
  }

  // ---------- Idle / Escaneando ----------
  return (
    <div className="space-y-5">
      {mode === "idle" ? (
        <button
          onClick={startCamera}
          className="w-full rounded-2xl bg-cyan-600 px-4 py-6 text-lg font-extrabold text-white transition hover:bg-cyan-500 active:scale-[0.99]"
        >
          📷 Abrir cámara y escanear
        </button>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-700 bg-black">
          <video
            ref={videoRef}
            playsInline
            muted
            className="h-72 w-full object-cover"
          />
          <div className="flex items-center justify-between px-4 py-2 text-sm text-slate-300">
            <span>Apunta al QR de la etiqueta del atado…</span>
            <button
              onClick={() => {
                stopCamera();
                setMode("idle");
              }}
              className="text-red-400 hover:underline"
            >
              Detener
            </button>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />

      {cameraError && (
        <p className="rounded-lg border border-amber-800 bg-amber-950/50 px-3 py-2 text-sm text-amber-300">
          {cameraError}
        </p>
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <p className="mb-2 text-sm text-slate-400">
          ¿Cámara ocupada o QR dañado? Escribe el código de la etiqueta:
        </p>
        <div className="flex gap-2">
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="BML-01-M-NEGRO-01"
            className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-cyan-500"
          />
          <button
            onClick={() => handleDetected(manual)}
            disabled={!manual.trim()}
            className="rounded-lg border border-cyan-600 px-4 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-950 disabled:opacity-40"
          >
            Buscar
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Ficha técnica resumida de la prenda ----------
function BundleSheetCard({
  sheet,
  compact = false,
}: {
  sheet: BundleSheet;
  compact?: boolean;
}) {
  const MACHINE: Record<string, string> = {
    plana: "Plana",
    fileteadora: "Fileteadora",
    collarin: "Collarín",
  };

  return (
    <div
      className={`rounded-xl border p-4 text-left ${
        compact
          ? "border-slate-700 bg-slate-900/80"
          : "border-emerald-800 bg-emerald-950/30"
      }`}
    >
      <p className="text-xs uppercase tracking-wide text-slate-400">
        Qué coser · ficha resumida
      </p>
      <p className="mt-0.5 font-semibold text-slate-100">
        {sheet.referenceCode} · {sheet.garmentName}
      </p>
      <p className="mt-0.5 text-xs text-slate-400">
        Talla {sheet.size} · {sheet.units} unidades
        {sheet.totalSamMinutes != null ? ` · ${sheet.totalSamMinutes} min/pje` : ""}
        · Destajo por prenda: {formatCop(sheet.destajoTotalCop)}
      </p>

      <ol className="mt-3 space-y-1 text-sm text-slate-200">
        {sheet.operations.map((o) => (
          <li key={o.step_order} className="flex items-center justify-between gap-3">
            <span>
              <b className="text-cyan-300">{o.step_order}.</b> {o.operation_name}
              <span className="ml-2 text-xs text-slate-400">
                {MACHINE[o.machine_type] ?? o.machine_type}
              </span>
            </span>
            <span className="text-xs text-slate-400">
              {formatCop(Number(o.base_rate_cop))}
            </span>
          </li>
        ))}
      </ol>

      {sheet.materials.length > 0 && (
        <div className="mt-3 border-t border-slate-700/60 pt-2">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Materiales por prenda (talla {sheet.size})
          </p>
          <ul className="mt-1 space-y-0.5 text-xs text-slate-300">
            {sheet.materials.map((m, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span>
                  {m.name} · {Number(m.quantity_per_garment)} {m.unit}
                </span>
                <span className="text-slate-400">
                  {formatCop(Number(m.quantity_per_garment) * Number(m.unit_cost_cop))}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 rounded-lg bg-slate-800/60 px-2.5 py-1.5 text-xs text-emerald-300">
            Para todo el atado ({sheet.units} u × talla {sheet.size}):{" "}
            <b>
              {sheet.materials.map((m) => `${m.quantity_for_bundle} ${m.unit}`).join(" + ")}
            </b>{" "}
            · Costo: {formatCop(sheet.materialsCostForBundle)}
          </p>
        </div>
      )}
    </div>
  );
}
