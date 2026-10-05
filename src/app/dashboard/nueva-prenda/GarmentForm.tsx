"use client";

import { useRef, useState, useTransition } from "react";
import { inferGarmentDNA, type GarmentDNA } from "@/lib/ai";
import { formatCop } from "@/lib/cop";
import { createGarment, runColabVision } from "./actions";

type Preview = {
  source: "local" | "gemini" | "fallback";
  note: string | null;
  dna: GarmentDNA;
};

const MAX_DIM = 1280; // redimensionado en el navegador antes de enviar

function fileToResizedBase64(
  file: File,
  maxDim: number
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("El archivo no es una imagen válida."));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
        resolve({
          base64: canvas.toDataURL(mimeType, 0.85).split(",")[1],
          mimeType,
        });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function GarmentForm() {
  const [name, setName] = useState("");
  const [referenceCode, setReferenceCode] = useState(
    () => `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
  );
  const [baseRate, setBaseRate] = useState("4000");
  const [photos, setPhotos] = useState<{ base64: string; mimeType: string; url: string }[]>([]);
  const [gpuStatus, setGpuStatus] = useState<"idle" | "booting" | "online">("idle");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement | null>(null);

  function buildLocalPreview() {
    return inferGarmentDNA({
      name,
      referenceCode: referenceCode.trim().toUpperCase(),
      baseRateCop: Number(baseRate) || 2500,
    });
  }

  function generatePreview() {
    if (!name.trim() || !referenceCode.trim()) {
      setError("Escribe el nombre y la referencia de la prenda.");
      return;
    }
    setError(null);
    setPreview({ source: "local", note: null, dna: buildLocalPreview() });
  }

  async function analyzeWithAI() {
    if (!name.trim() || !referenceCode.trim()) {
      setError("Escribe el nombre y la referencia de la prenda.");
      return;
    }
    if (photos.length === 0) {
      setError("Sube al menos una foto (frente, espalda, reverso) para analizar con IA.");
      return;
    }
    setError(null);
    setAnalyzing(true);
    
    // Simulación del orquestador Fénix
    if (gpuStatus === "idle") {
      setGpuStatus("booting");
      // Simulamos la espera mientras Fénix enciende el túnel y responde a Supabase
      await new Promise((r) => setTimeout(r, 2500));
      setGpuStatus("online");
    }

    try {
      const res = await runColabVision({
        referenceCode: referenceCode.trim().toUpperCase(),
        name: name.trim(),
      });
      
      if (res.ok) {
        window.location.href = `/dashboard/prendas/${res.garmentId}`;
      } else {
        setError(res.error);
        setAnalyzing(false);
      }
    } catch (err: any) {
      setError(err.message ?? "Error conectando con el orquestador Fénix.");
      setAnalyzing(false);
    }
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const dnaPayload = preview
        ? {
            name: name.trim(),
            totalSamMinutes: preview.dna.totalSamMinutes,
            suggestedRetailPrice: preview.dna.suggestedRetailPrice,
            parts: preview.dna.parts,
            operations: preview.dna.operations,
            materials: preview.dna.materials,
          }
        : null;

      const res = await createGarment({
        name: name.trim(),
        referenceCode: referenceCode.trim().toUpperCase(),
        baseRateCop: Number(baseRate) || 4000,
        dna: dnaPayload,
      });
      if (!res.ok) setError(res.error ?? "Error inesperado");
    });
  }

  const machineLabel: Record<string, string> = {
    plana: "Plana",
    fileteadora: "Fileteadora",
    collarin: "Collarín",
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block text-slate-400">Nombre de la prenda</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Body manga larga"
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-400">Referencia</span>
          <input
            value={referenceCode}
            onChange={(e) => setReferenceCode(e.target.value)}
            placeholder="Ej: BML-01"
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-400">Destajo total (COP)</span>
          <input
            value={baseRate}
            onChange={(e) => setBaseRate(e.target.value)}
            inputMode="numeric"
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500"
          />
        </label>
      </div>

      {/* Foto / boceto */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-300">
              Foto o boceto de la prenda
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              La IA de visión detecta las piezas y propone la ruta de máquinas.
              La imagen se reduce en tu navegador antes de enviarse.
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={async (e) => {
              const files = Array.from(e.target.files || []).slice(0, 5);
              if (!files.length) return;
              try {
                const newPhotos = await Promise.all(
                  files.map(async (f) => {
                    const resized = await fileToResizedBase64(f, MAX_DIM);
                    return { ...resized, url: `data:${resized.mimeType};base64,${resized.base64}` };
                  })
                );
                setPhotos(newPhotos);
                setPreview(null);
              } catch (err: any) {
                setError(err?.message ?? "No se pudo procesar la imagen.");
              }
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-cyan-500"
          >
            {photos.length > 0 ? `Cambiar imágenes (${photos.length})` : "Subir fotos (Máx 5) 📷"}
          </button>
        </div>

        {photos.length > 0 && (
          <div className="mt-4 flex flex-col items-start gap-4">
            <div className="flex flex-wrap gap-2">
              {photos.map((p, i) => (
                <img
                  key={i}
                  src={p.url}
                  alt={`Prenda ${i + 1}`}
                  className="h-24 w-24 rounded-xl border border-slate-700 object-cover"
                />
              ))}
            </div>
            
            <button
              onClick={analyzeWithAI}
              disabled={analyzing}
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {gpuStatus === "booting"
                ? "Fénix: Encendiendo GPU remota..."
                : analyzing
                ? "Segmentando con SAM 2..."
                : "✨ Generar Despiece Visual (Requiere GPU)"}
            </button>
          </div>
        )}
      </div>

      <button
        onClick={generatePreview}
        className="rounded-lg border border-cyan-600 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-950"
      >
        Generar ADN (estimación local, sin foto)
      </button>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {preview && (
        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {preview.source === "gemini" && (
              <span className="rounded-full bg-indigo-950 px-3 py-1 text-xs font-semibold text-indigo-300">
                ✨ Analizado con IA de visión
              </span>
            )}
            {preview.source === "fallback" && (
              <span className="rounded-full bg-amber-950 px-3 py-1 text-xs font-semibold text-amber-300">
                Estimación local (IA no configurada)
              </span>
            )}
            <span>
              Tiempo total:{" "}
              <b className="text-cyan-300">{preview.dna.totalSamMinutes} min</b>
            </span>
            <span>
              Destajo/pje sugerido:{" "}
              <b className="text-cyan-300">
                {formatCop(preview.dna.suggestedRetailPrice)}
              </b>
            </span>
          </div>
          {preview.note && (
            <p className="rounded-lg bg-amber-950/50 px-3 py-2 text-xs text-amber-300">
              {preview.note}
            </p>
          )}

          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-300">
              Despiece
            </h3>
            <ul className="space-y-1 text-sm text-slate-400">
              {preview.dna.parts.map((p) => (
                <li key={p.part_code}>
                  <code className="rounded bg-slate-800 px-1.5 py-0.5 text-cyan-300">
                    {p.part_code}
                  </code>{" "}
                  {p.name} · {p.material_type}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-300">
              Ruta de máquinas y destajo
            </h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-1">Paso</th>
                  <th>Operación</th>
                  <th>Máquina</th>
                  <th className="text-right">SAM (min)</th>
                  <th className="text-right">Tarifa</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {preview.dna.operations.map((o) => (
                  <tr key={o.step_order} className="border-t border-slate-800">
                    <td className="py-1">{o.step_order}</td>
                    <td>{o.operation_name}</td>
                    <td>{machineLabel[o.machine_type]}</td>
                    <td className="text-right">{o.sam_minutes}</td>
                    <td className="text-right">{formatCop(o.base_rate_cop)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={submit}
            disabled={pending}
            className="w-full rounded-lg bg-cyan-600 px-4 py-3 font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-50"
          >
            {pending ? "Guardando…" : "Guardar prenda y crear orden de corte"}
          </button>
        </div>
      )}
    </div>
  );
}
