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

const MAX_DIM = 1280; // Redimensionado en el navegador antes de enviar

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

// Guía de tomas fotográficas para el usuario
const PHOTO_GUIDE_STEPS = [
  {
    step: 1,
    title: "Foto 1: Vista Frontal Extendida",
    desc: "Extiende la prenda plana en un mesón. Si es camisa/franela, ubica las mangas a 45°. Si es pantalón, abre las botas.",
    tip: "📏 Coloca la cinta métrica a un costado para activar la Escala Industrial 1:1.",
    icon: "👕",
  },
  {
    step: 2,
    title: "Foto 2: Vista Trasera Completa",
    desc: "Voltea la prenda y tómahle una foto plana desde arriba (90°) cubriendo toda la espalda.",
    tip: "Asegúrate de que no haya arrugas sobre la mesa.",
    icon: "🔄",
  },
  {
    step: 3,
    title: "Foto 3: Detalle de Sisas y Mangas",
    desc: "Acercamiento foto a la unión de la sisa y la manga para que la IA identifique la curva del molde.",
    tip: "Buena iluminación evita sombras engañosas.",
    icon: "🔍",
  },
  {
    step: 4,
    title: "Foto 4: Cuello / Cintura o Abrochadura",
    desc: "Foto cercana al escote/cuello (rib, solapa o botones) opret pretina de pantalón.",
    tip: "Identifica si requiere botones, cierres o elastano.",
    icon: "👔",
  },
  {
    step: 5,
    title: "Foto 5: Reverso de Costura Interna",
    desc: "Voltea un dobladillo o costura interna por el revés para identificar el tipo de puntada.",
    tip: "La IA detectará automáticamente si es Fileteadora 504, Collarín 406 o Plana 301.",
    icon: "🪡",
  },
];

export default function GarmentForm() {
  const [name, setName] = useState("");
  const [referenceCode, setReferenceCode] = useState(
    () => `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
  );
  const [baseRate, setBaseRate] = useState("4000");
  const [photos, setPhotos] = useState<{ base64: string; mimeType: string; url: string; label: string }[]>([]);
  const [activeGuideStep, setActiveGuideStep] = useState<number>(1);
  const [showPhotoGuide, setShowPhotoGuide] = useState<boolean>(true);
  const [gpuStatus, setGpuStatus] = useState<"idle" | "booting" | "online">("idle");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Historial simulado de escaneos guardados en borrador
  const [scanHistory] = useState([
    {
      id: "scan-1",
      name: "Franela Básica Cuello Redondo",
      ref: "REF-FRAN-01",
      date: "Hoy 08:30 AM",
      partsCount: 5,
      samMinutes: 22.4,
      status: "Borrador IA",
    },
    {
      id: "scan-2",
      name: "Chaqueta Sport Impermeable",
      ref: "REF-CHQ-09",
      date: "Ayer 04:15 PM",
      partsCount: 8,
      samMinutes: 38.0,
      status: "En Inspección",
    },
  ]);

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

    if (gpuStatus === "idle") {
      setGpuStatus("booting");
      await new Promise((r) => setTimeout(r, 2000));
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
      {/* Campos de Nombre, Referencia y Destajo */}
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block text-slate-400">Nombre de la prenda</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Franela Básica Cuello Redondo"
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

      {/* GUÍA INTERACTIVA DE TOMA FOTOGRÁFICA */}
      <div className="rounded-2xl border border-cyan-500/30 bg-slate-900/90 p-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">📸</span>
            <div>
              <h2 className="text-sm font-bold text-white">
                Guía de Fotografía para Inspección IA (Recomendado)
              </h2>
              <p className="text-xs text-slate-400">
                Sigue estos consejos para que la IA extraiga los moldes 2D y la ruta de máquinas a 100% de precisión.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowPhotoGuide(!showPhotoGuide)}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
          >
            {showPhotoGuide ? "Ocultar guía ▲" : "Ver guía de tomas ▼"}
          </button>
        </div>

        {showPhotoGuide && (
          <div className="mt-4">
            <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
              {PHOTO_GUIDE_STEPS.map((s) => (
                <button
                  key={s.step}
                  onClick={() => setActiveGuideStep(s.step)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    activeGuideStep === s.step
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-md shadow-cyan-500/10"
                      : "bg-slate-800/60 text-slate-400 hover:text-white"
                  }`}
                >
                  <span>{s.icon}</span>
                  <span>{s.title.split(":")[0]}</span>
                </button>
              ))}
            </div>

            {/* Contenido del paso activo de la guía */}
            {PHOTO_GUIDE_STEPS.filter((s) => s.step === activeGuideStep).map((s) => (
              <div key={s.step} className="mt-3 rounded-xl border border-slate-800 bg-slate-950 p-4 animate-in fade-in">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{s.icon}</span>
                  <div>
                    <h3 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">{s.title}</h3>
                    <p className="mt-1 text-xs text-slate-300 leading-relaxed">{s.desc}</p>
                    <p className="mt-2 text-xs font-semibold text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-500/30 inline-block">
                      {s.tip}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Zona de Carga de Fotos */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-300">
              Cargar fotos de la prenda (Frente, Espalda, Reverso, Detalle)
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              La IA de visión detectará las piezas recortadas y propondrá la ruta de máquinas.
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
                const labels = ["Frente", "Espalda", "Manga/Sisa", "Cuello/Cintura", "Costura Interna"];
                const newPhotos = await Promise.all(
                  files.map(async (f, idx) => {
                    const resized = await fileToResizedBase64(f, MAX_DIM);
                    return { 
                      ...resized, 
                      url: `data:${resized.mimeType};base64,${resized.base64}`,
                      label: labels[idx] || `Foto ${idx + 1}`
                    };
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
            className="rounded-lg border border-cyan-500/50 bg-cyan-950/40 px-4 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-900/60 transition-all shadow-md shadow-cyan-950/50"
          >
            {photos.length > 0 ? `Cambiar imágenes (${photos.length})` : "Subir fotos (Máx 5) 📷"}
          </button>
        </div>

        {photos.length > 0 && (
          <div className="mt-4 flex flex-col items-start gap-4">
            <div className="flex flex-wrap gap-3">
              {photos.map((p, i) => (
                <div key={i} className="relative group">
                  <img
                    src={p.url}
                    alt={`Prenda ${i + 1}`}
                    className="h-28 w-28 rounded-xl border border-slate-700 object-cover shadow-md"
                  />
                  <span className="absolute bottom-1 left-1 right-1 rounded bg-slate-950/90 px-1 py-0.5 text-center text-[9px] font-bold text-cyan-300 border border-slate-800">
                    {p.label}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={analyzeWithAI}
              disabled={analyzing}
              className="rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-500/20 transition hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50"
            >
              {gpuStatus === "booting"
                ? "🔥 Fénix: Encendiendo GPU remota en Colab..."
                : analyzing
                ? "✨ Vision Engine V2: Segmentando piezas y resolviendo despiece..."
                : "✨ Analizar con Vision Engine V2 (IA en GPU)"}
            </button>
          </div>
        )}
      </div>

      {/* HISTORIAL DE ESCANEOS Y BORRADORES DE DISEÑADOR */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>📜</span> Historial de Escaneos y Borradores de Diseños
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Revisa tus inspecciones previas y prototipos analizados sin enviar a corte todavía.
            </p>
          </div>
          <span className="text-xs text-slate-500 font-mono">{scanHistory.length} escaneos guardados</span>
        </div>

        <div className="mt-3 space-y-2">
          {scanHistory.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3 hover:border-slate-700 transition-colors"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-white">{s.name}</span>
                  <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-cyan-400">
                    {s.ref}
                  </span>
                  <span className="rounded bg-amber-500/20 text-amber-300 px-2 py-0.5 text-[10px] font-bold border border-amber-500/30">
                    {s.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {s.date} • {s.partsCount} Piezas identificadas • {s.samMinutes} min SAM
                </p>
              </div>

              <button
                onClick={() => {
                  setName(s.name);
                  setReferenceCode(s.ref);
                }}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800"
              >
                Cargar en Formulario →
              </button>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={generatePreview}
        className="rounded-lg border border-cyan-600 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-950"
      >
        Generar ADN (estimación local, sin foto)
      </button>

      {error && <p className="text-sm text-red-400 font-semibold bg-red-950/40 p-3 rounded-xl border border-red-500/30">{error}</p>}

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
            className="w-full rounded-lg bg-cyan-600 px-4 py-3 font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-50 shadow-lg shadow-cyan-600/20"
          >
            {pending ? "Guardando…" : "Guardar prenda y crear orden de corte"}
          </button>
        </div>
      )}
    </div>
  );
}
