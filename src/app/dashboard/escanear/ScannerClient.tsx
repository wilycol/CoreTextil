"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import jsQR from "jsqr";
import { formatCop } from "@/lib/cop";
import { getBundleSheet, receiveBundle, type ReceivedBundle, type BundleSheet } from "./actions";

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
    return (
      <div className="space-y-5 rounded-2xl border border-emerald-800 bg-emerald-950/40 p-6">
        <div>
          <p className="text-sm text-emerald-300/80">
            {result.alreadyReceived
              ? "Este atado ya estaba recibido"
              : "Atado recibido en tu taller"}
          </p>
          <p className="mt-1 font-mono text-2xl font-extrabold text-emerald-300">
            {result.bundleCode}
          </p>
          <p className="mt-1 text-emerald-200/80">
            Orden {result.orderNumber} · Talla {result.size} · {result.color} ·{" "}
            {result.units} unidades
          </p>
          {sheet && <BundleSheetCard sheet={sheet} />}
          {result.alreadyReceived && (
            <p className="mt-2 text-xs text-emerald-400/70">
              No se duplicó nada: la recepción es única por atado.
            </p>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href={`/dashboard/operario?bundle=${encodeURIComponent(result.bundleCode)}`}
            className="rounded-lg bg-cyan-600 px-4 py-3 text-center font-semibold text-white hover:bg-cyan-500"
          >
            Marcar producción de este atado
          </Link>
          <button
            onClick={reset}
            className="rounded-lg border border-emerald-700 px-4 py-3 font-semibold text-emerald-200 hover:border-emerald-400"
          >
            Escanear otro atado
          </button>
        </div>
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
