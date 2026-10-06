"use client";

import { useState } from "react";
import Link from "next/link";

const MASTER_PROMPT = `Actúa como fotógrafo industrial de producto textil para inspección de fichas técnicas de ropa.
Toma como referencia la prenda que acabo de adjuntar (respetando estrictamente su color, tipo de tela, silueta y detalles de diseño). 

Genera una secuencia de 5 fotografías técnicas de estudio industrial sobre mesa de corte limpia, fondo gris claro neutro (#F4F4F5) e iluminación de catálogo sin sombras duras:

1. FOTO 1 - VISTA FRONTAL EXTENDIDA CON CINTA MÉTRICA:
Prenda completa extendida de frente sobre la mesa en plano cenital de 90 grados (top-down). Debe tener colocada a un costado una cinta métrica textil de costurero amarilla o blanca extendida a lo largo de la prenda para servir como referencia de escala de medición física.

2. FOTO 2 - VISTA TRASERA / REVERSO ESTRUCTURAL:
Prenda extendida completamente por la parte trasera (espalda o posterior del pantalón), en plano cenital recto de 90 grados, mostrando claramente el canesú, costuras traseras, pinzas o bolsillos posteriores.

3. FOTO 3 - DETALLE DE SISAS Y UNIONES DE MANGA O PIERNA:
Una toma de acercamiento (close-up) enfocada en la unión crítica de la sisa/manga con el costado del cuerpo (o la entrepierna/tiro en caso de pantalón o short), mostrando la costura de ensamble de las piezas.

4. FOTO 4 - CUELLO / TAPA COSTURA Y RIB (O PRETINA / ELÁSTICO / CIERRE):
Una toma macro enfocada en la parte superior: el cuello rib con su pisado de tapa costura (para camisetas/camisas) o la pretina con su botón, cierre y elástico (para pantalones/shorts).

5. FOTO 5 - REVERSO MACRO DE COSTURA INTERNA (VISTA INTERIOR / REVÉS):
Una fotografía de acercamiento de la prenda VOLTEADA AL REVÉS (inside-out), mostrando el interior y las costuras de sobrehilado/fileteadora (puntada 504), pespuntes internos y terminación de tela expuesta.

Mantén consistencia absoluta en el tejido, color y proporciones de la prenda en las 5 tomas.`;

const INDIVIDUAL_PROMPTS = [
  {
    step: 1,
    title: "Foto 1: Frontal con Cinta Métrica",
    desc: "Activa la calibración industrial px → cm y medición física en el Módulo 2 del Vision Engine.",
    prompt: `Genera una foto de estudio plano (flat lay 90°) de la VISTA FRONTAL de la prenda adjunta extendida en mesa de corte. Coloca una CINTA MÉTRICA textil de costurero extendida al lado de la prenda como referencia de medición física. Iluminación industrial clara, fondo gris neutro.`,
  },
  {
    step: 2,
    title: "Foto 2: Vista Trasera / Espalda",
    desc: "Permite inspeccionar canesú, tiros posteriores y cortes de espalda.",
    prompt: `Genera una foto de estudio plano de la VISTA TRASERA (espalda o posterior) de la prenda adjunta. Muestra de forma plana el canesú, costura trasera de hombros o tiro posterior sobre mesa de corte.`,
  },
  {
    step: 3,
    title: "Foto 3: Sisas y Uniones de Manga/Pierna",
    desc: "Identifica uniones críticas y curvatura de sisa para despiece de mangas y tiros.",
    prompt: `Genera una foto de acercamiento (close-up) enfocada en la sisa y unión de la manga con el cuerpo (o entrepierna/tiro si es pantalón) de la prenda adjunta, mostrando la costura de ensamble textil.`,
  },
  {
    step: 4,
    title: "Foto 4: Cuello / Rib / Tapa Costura o Pretina",
    desc: "Detecta sesgos, pisado de tapa costura, botones y cierres de la prenda.",
    prompt: `Genera una foto de acercamiento macro del CUELLO con rib y tapa costura (o PRETINA con cierre/botón si es pantalón) de la prenda adjunta, mostrando los insumos y remates.`,
  },
  {
    step: 5,
    title: "Foto 5: Revés Interior (Costura Fileteadora 504)",
    desc: "Permite al Módulo 3 clasificar las puntadas industriales (Fileteadora 504, Plana 301, Collarín 406).",
    prompt: `Genera una foto de cerca de la prenda adjunta VOLTEADA AL REVÉS (inside-out). Debe mostrar el interior de las costuras con puntada de sobrehilado/fileteadora (504) y terminaciones internas.`,
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
              🤖 Asistente de IA Nativa · CoreTextil Vision Engine
            </span>
            <h1 className="mt-3 text-3xl font-extrabold text-white">
              Guía de Generación de Fotos con ChatGPT
            </h1>
            <p className="mt-2 text-sm text-slate-300 max-w-2xl leading-relaxed">
              Cualquier marca, diseñador o emprendedor puede idear una prenda (*deportiva, casual, gala, camisa o pantalón*), generar las 5 fotos de estudio con ChatGPT y subirlas a CoreTextil para obtener la **Ficha Técnica Digital Completa** con despiece 2D e inspección de costuras.
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

      {/* Bloque Prompt Maestro */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>🚀</span> Prompt Maestro de Inspección Completa (5 Fotos)
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

      {/* Pie de Página e Instrucciones de Valor */}
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-6 text-xs text-slate-300 space-y-2">
        <h4 className="font-bold text-emerald-400 text-sm flex items-center gap-2">
          <span>💡</span> ¿Por qué esto democratiza el diseño de moda en CoreTextil?
        </h4>
        <p className="leading-relaxed">
          Gracias al <strong>Vision Engine V2</strong>, cualquier persona (incluso sin conocimientos de patronaje industrial) puede elegir o diseñar una prenda con ChatGPT, obtener las 5 fotos técnicas de inspección y subirlas a CoreTextil. El sistema calcula automáticamente el <strong>despiece 2D, los minutos SAM de taller, las puntadas de confección (504/301/406) y el costo de destajo</strong>.
        </p>
      </div>
    </div>
  );
}
