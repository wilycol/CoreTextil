"use client";

import { useState } from "react";
import Link from "next/link";

const MASTER_PROMPT = `Actúa como fotógrafo industrial de producto textil para inspección de fichas técnicas de ropa.
Toma como referencia la prenda que acabo de adjuntar (respetando strictly su color, tipo de tela, silueta y detalles de diseño). 

IMPORTANTE: Genera 5 ARCHIVOS DE IMAGEN INDEPENDIENTES Y SEPARADOS (una imagen por cada número). NO crees una lámina, infografía ni collage combinando las tomas.

1. FOTO 1 - VISTA FRONTAL EXTENDIDA CON CINTA MÉTRICA NÍTIDA:
Prenda completa extendida de frente sobre la mesa en plano cenital de 90 grados (top-down). Coloca a un costado una CINTA MÉTRICA textil de costurero de color amarillo brillante extendida en línea recta a lo largo de la prenda, con NÚMEROS NEGROS EN CENTÍMETROS (cm) de gran tamaño, nítidos, legibles y de alto contraste para calibración métrica.

2. FOTO 2 - VISTA TRASERA / REVERSO ESTRUCTURAL:
Prenda extendida completamente por la parte trasera (espalda o posterior del pantalón), en plano cenital recto de 90 grados, mostrando claramente el canesú, costuras traseras, pinzas o bolsillos posteriores.

3. FOTO 3 - DETALLE INTERNO DE SISAS Y UNIONES (VOLTEADA AL REVÉS / INSIDE-OUT):
Foto de acercamiento (close-up) de la sisa y unión de manga VOLTEADA AL REVÉS (INSIDE-OUT). Muestra la cara INTERNA de la prenda con las lazadas expuestas del hilo de la costura de ensamble, NO la superficie lisa externa.

4. FOTO 4 - DETALLE INTERNO DE CUELLO / TAPA COSTURA Y RIB (INSIDE-OUT):
Foto macro enfocada en la cara INTERNA / REVÉS del cuello escote y tapa costura (o pretina interna si es pantalón), mostrando el dobladillo expuesto, las puntadas de remate y el reves del elastico/rib.

5. FOTO 5 - REVERSO MACRO DE COSTURA DE FILETEADORA 504 (VISTA INTERIOR):
Fotografía macro de cerca de la prenda VOLTEADA AL REVÉS (inside-out), enfocada en una costura lateral o dobladillo interno, mostrando nítidamente las lazadas de cadeneta de sobrehilado de la máquina Fileteadora 504 (Overlock) y pespuntes expuestos.

Mantén consistencia absoluta en el tejido, color y proporciones de la prenda en las 5 tomas.`;

const INDIVIDUAL_PROMPTS = [
  {
    step: 1,
    title: "Foto 1: Frontal con Cinta Métrica Nítida",
    desc: "Obligatorio: números en cm legibles para calibración física px → cm en Módulo 2.",
    prompt: `Genera una foto de estudio plano (flat lay 90°) de la VISTA FRONTAL de la prenda adjunta extendida en mesa de corte. Coloca a un costado una CINTA MÉTRICA textil de costura amarilla extendida en línea recta, con NÚMEROS NEGROS EN CENTÍMETROS (cm) muy nítidos, grandes y legibles para calibración métrica. Fondo gris neutro.`,
  },
  {
    step: 2,
    title: "Foto 2: Vista Trasera / Espalda Estructural",
    desc: "Permite inspeccionar canesú, tiros posteriores y cortes de espalda.",
    prompt: `Genera una foto de estudio plano de la VISTA TRASERA (espalda o posterior) de la prenda adjunta. Muestra de forma plana el canesú, costura trasera de hombros o tiro posterior sobre mesa de corte.`,
  },
  {
    step: 3,
    title: "Foto 3: Sisas e Interior de Manga (Volteada al Revés / Inside-Out)",
    desc: "Muestra la cara interna con las lazadas de costura expuestas.",
    prompt: `Genera una foto de acercamiento (close-up) enfocada en la sisa y unión de la manga VOLTEADA AL REVÉS (INSIDE-OUT). Debe mostrar la cara interna del tejido y la costura de sobrehilado expuesta.`,
  },
  {
    step: 4,
    title: "Foto 4: Interior del Cuello / Tapa Costura / Pretina Interna",
    desc: "Expone la costura oculta del rib, sesgo y remates del revés.",
    prompt: `Genera una foto macro enfocada en la cara INTERNA / REVÉS del cuello y tapa costura (o pretina interna) de la prenda adjunta, mostrando las costuras interiores y remates.`,
  },
  {
    step: 5,
    title: "Foto 5: Revés Interior (Costura Fileteadora 504 / Overlock)",
    desc: "Clasifica automáticamente si requiere Fileteadora 504, Plana 301 o Collarín 406 en el Módulo 3.",
    prompt: `Genera una foto de cerca de la prenda VOLTEADA AL REVÉS (inside-out). Muestra nítidamente las lazadas de cadeneta de sobrehilado de máquina Fileteadora 504 (Overlock) en una costura interna.`,
  },
];

export default function VisionGuidePage() {
  const [copiedIndex, setCopiedIndex] = useState<number | "master" | null>(null);

  function copyToClipboard(text: string, index: number | "master") {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2500);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-4">
      {/* Header Banner */}
      <div className="rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute right-4 top-4 text-7xl opacity-10 pointer-events-none">✨</div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-bold text-cyan-300 border border-cyan-500/40">
              🤖 Asistente de IA Nativa · CoreTextil Vision Engine V2
            </span>
            <h1 className="mt-3 text-3xl font-extrabold text-white">
              Guía de Generación de Fotos con ChatGPT
            </h1>
            <p className="mt-2 text-sm text-slate-300 max-w-2xl leading-relaxed">
              Genera las 5 fotos de estudio independientes con ChatGPT y subidas a CoreTextil para obtener la **Ficha Técnica Digital Completa** con despiece 2D e inspección de puntadas industriales (504, 301, 406).
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <a
              href="https://chatgpt.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:scale-105"
            >
              <span>🔗</span> Abrir ChatGPT en Vivo
            </a>
            <Link
              href="/dashboard/nueva-prenda"
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
            >
              🚀 Ir a Crear Prenda en App
            </Link>
          </div>
        </div>
      </div>

      {/* Reglas Clave para ChatGPT */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-cyan-500/30 bg-slate-900/80 p-4">
          <span className="text-xl block mb-1">🖼️</span>
          <strong className="text-xs text-cyan-300 block">1. Fotos Separadas</strong>
          <p className="text-[11px] text-slate-400 mt-0.5">Pide 5 imágenes independientes, NUNCA un collage o lámina.</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/80 p-4">
          <span className="text-xl block mb-1">🔄</span>
          <strong className="text-xs text-emerald-300 block">2. Revés (Inside-Out)</strong>
          <p className="text-[11px] text-slate-400 mt-0.5">Muestra la cara interna expuesta para detectar Fileteadora 504.</p>
        </div>
        <div className="rounded-2xl border border-amber-500/30 bg-slate-900/80 p-4">
          <span className="text-xl block mb-1">📏</span>
          <strong className="text-xs text-amber-300 block">3. Cinta Métrica Legible</strong>
          <p className="text-[11px] text-slate-400 mt-0.5">Números en cm nítidos para calibración métrica px → cm.</p>
        </div>
      </div>

      {/* Bloque Prompt Maestro */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>🚀</span> Prompt Maestro de Inspección Completa (5 Fotos Separadas)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Copia este texto en ChatGPT junto a una foto de referencia de cualquier prenda.
            </p>
          </div>
          <button
            onClick={() => copyToClipboard(MASTER_PROMPT, "master")}
            className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-cyan-500 shadow-md shadow-cyan-600/30"
          >
            {copiedIndex === "master" ? "✅ ¡Copiado al Portapapeles!" : "📋 Copiar Prompt Maestro"}
          </button>
        </div>

        <pre className="rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed overflow-x-auto">
          {MASTER_PROMPT}
        </pre>
      </div>

      {/* Prompts Individuales por Ángulo */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span>📷</span> Prompts Individuales por Ángulo Fotográfico
        </h2>
        <p className="text-xs text-slate-400">
          Usa estos bloques si prefieres solicitar cada foto de forma individual en ChatGPT:
        </p>

        <div className="grid gap-4 sm:grid-cols-1">
          {INDIVIDUAL_PROMPTS.map((p) => (
            <div
              key={p.step}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3 hover:border-cyan-500/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-cyan-300">
                    #{p.step} · {p.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">{p.desc}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(p.prompt, p.step)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition"
                >
                  {copiedIndex === p.step ? "✅ Copiado" : "📋 Copiar"}
                </button>
              </div>

              <div className="rounded-xl border border-slate-800/80 bg-slate-950 p-3 font-mono text-xs text-slate-300">
                "{p.prompt}"
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
