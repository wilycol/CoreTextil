"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import { BRAND_PLANS, SATELLITE_PLANS } from "@/lib/branding";

const PROMPT_MASTER_TEXT = `Actúa como Diseñador Técnico Textil y Patronista Industrial de CoreTextil. Analiza las imágenes adjuntas de esta prenda y genera la ficha técnica completa y el ADN con el siguiente desglose: 1) Ficha técnica general (tipo de prenda, género, silueta, materiales), 2) Lista detallada de piezas cortadas y consumo de insumos por unidad, 3) Tabla de medidas por talla (XS a XL), 4) Árbol secuencial de procesos de ensamble (Corte, Filete, Plana, Collarín, Presille, Pulido) con estimación de tiempo en segundos y costo sugerido por operación.`;

export default function LandingClient() {
  const [copied, setCopied] = useState(false);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(PROMPT_MASTER_TEXT);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-white">
      {/* Background Ambient Glow */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-cyan-600/10 blur-[120px]" />
        <div className="absolute top-96 -left-40 h-[400px] w-[500px] rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2 group">
          <Logo heightClass="h-10" />
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className="rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-900/30 transition hover:bg-cyan-500 hover:shadow-cyan-500/20"
          >
            Entrar con Google
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-20 pt-12 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-4 py-1.5 text-xs font-semibold text-cyan-300 backdrop-blur">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500"></span>
          </span>
          Ecosistema Neural Nexus · Plataforma Textil LATAM (Piloto activo en Cúcuta)
        </div>

        <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
          Tu producción de confección en vivo,{" "}
          <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-emerald-400 bg-clip-text text-transparent">
            de la marca al operario.
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
          Conecta a tu marca, diseñador o taller de corte con los satélites de ensamble y sus operarios.
          Controla cada orden con fichas en IA, atados trazables con QR, liquidación por destajo a 1 clic y reposición de faltantes sin llamadas ni cuadernos.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/auth/login"
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-cyan-900/40 transition hover:scale-[1.02] hover:shadow-cyan-500/30"
          >
            Empezar gratis
          </Link>
          <a
            href="#paso-a-paso"
            className="rounded-xl border border-slate-700 bg-slate-900/60 px-7 py-3.5 text-base font-semibold text-slate-200 backdrop-blur transition hover:border-cyan-500/50 hover:bg-slate-800"
          >
            Ver cómo funciona
          </a>
        </div>
      </section>

      {/* Explicación Neófita: ¿Qué es el ADN de una Prenda? + Vision Engine V2 */}
      <section id="paso-a-paso" className="relative z-10 border-t border-slate-900 bg-slate-900/40 py-20 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">
              Guía Paso a Paso para Neófitos y Expertos
            </span>
            <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">
              ¿Qué es el <span className="text-cyan-400">ADN de una Prenda</span> y cómo lo crea la IA?
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-400 sm:text-base">
              El **ADN de una Prenda** es el mapa genético técnico completo de una pieza de vestir.
              Antes requería horas de trabajo manual; ahora el **Vision Engine V2** de CoreTextil lo extrae en segundos.
            </p>
          </div>

          {/* Componentes del ADN de una Prenda */}
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg backdrop-blur">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-950 text-xl text-cyan-400">
                📋
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-100">1. Ficha Técnica Digital</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Tipo de prenda, silueta, especificaciones de costura, insumos (hilos, cierres, botones) y requerimientos de calidad.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg backdrop-blur">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-950 text-xl text-emerald-400">
                ✂️
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-100">2. Desglose de Piezas</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Listado de piezas cortadas (delantero, trasero, bolsillos, pretina), consumo de tela exacto por unidad y metraje.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg backdrop-blur">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-950 text-xl text-purple-400">
                📐
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-100">3. Tabla de Medidas</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Matriz dimensional por talla (XS a XL) para control estricto de tolerancias de patronaje en el taller satélite.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg backdrop-blur">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-950 text-xl text-amber-400">
                ⚙️
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-100">4. Árbol de Procesos y Costos</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Secuencia paso a paso por operación (Filete, Plana, Collarín, Presille) con estimación de tiempo y costo unitario.
              </p>
            </div>
          </div>

          {/* Workflow en 4 pasos sencillos */}
          <div className="mt-16 rounded-3xl border border-cyan-500/20 bg-gradient-to-b from-slate-900/90 to-slate-950 p-8 shadow-2xl">
            <h3 className="text-center text-xl font-bold text-cyan-300">
              Crea tu primer ADN de Prenda en 4 Pasos Ultra Sencillos
            </h3>

            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
                <span className="absolute -top-3 left-5 rounded-full bg-cyan-600 px-3 py-0.5 text-xs font-bold text-white">
                  Paso 1
                </span>
                <h4 className="mt-2 font-bold text-slate-200">Copia el Prompt Master</h4>
                <p className="mt-1.5 text-xs text-slate-400">
                  Usa nuestro prompt diseñado para diseñadores y patronistas.
                </p>
                <button
                  onClick={handleCopyPrompt}
                  className="mt-4 w-full rounded-xl bg-cyan-950/80 border border-cyan-500/40 py-2 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-900"
                >
                  {copied ? "✓ ¡Prompt Copiado!" : "📋 Copiar Prompt de IA"}
                </button>
              </div>

              <div className="relative rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
                <span className="absolute -top-3 left-5 rounded-full bg-cyan-600 px-3 py-0.5 text-xs font-bold text-white">
                  Paso 2
                </span>
                <h4 className="mt-2 font-bold text-slate-200">Ve a ChatGPT / Gemini</h4>
                <p className="mt-1.5 text-xs text-slate-400">
                  Pega el prompt en la IA y sube la foto o boceto de tu prenda.
                </p>
                <a
                  href="https://chatgpt.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block w-full text-center rounded-xl bg-slate-800 border border-slate-700 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-500"
                >
                  Abrir ChatGPT ↗
                </a>
              </div>

              <div className="relative rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
                <span className="absolute -top-3 left-5 rounded-full bg-cyan-600 px-3 py-0.5 text-xs font-bold text-white">
                  Paso 3
                </span>
                <h4 className="mt-2 font-bold text-slate-200">Sube a Vision Engine V2</h4>
                <p className="mt-1.5 text-xs text-slate-400">
                  Descarga las imágenes generadas e impórtalas en CoreTextil.
                </p>
                <Link
                  href="/auth/login"
                  className="mt-4 inline-block w-full text-center rounded-xl bg-cyan-600/30 border border-cyan-500/50 py-2 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-600/50"
                >
                  Ir al Vision Engine
                </Link>
              </div>

              <div className="relative rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
                <span className="absolute -top-3 left-5 rounded-full bg-emerald-600 px-3 py-0.5 text-xs font-bold text-white">
                  Paso 4
                </span>
                <h4 className="mt-2 font-bold text-slate-200">¡Disfruta la Magia!</h4>
                <p className="mt-1.5 text-xs text-slate-400">
                  El sistema construye automáticamente la orden y genera los códigos QR por atado.
                </p>
                <div className="mt-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 py-2 text-center text-xs font-bold text-emerald-300">
                  ✨ Ficha Técnica Lista
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sección: El Ecosistema "Mi Red" (Triángulo Neural) */}
      <section className="relative z-10 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              Ecosistema Neural Integrado
            </span>
            <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">
              El Triángulo de Conexión en <span className="text-emerald-400">Mi Red</span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-400">
              CoreTextil elimina los cuellos de botella conectando a las 3 partes clave del negocio de confección en vivo.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {/* Card Marcas */}
            <div className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-xl">
              <div className="inline-flex rounded-full bg-cyan-950 px-3 py-1 text-xs font-bold text-cyan-300">
                1. Marcas & Diseñadores
              </div>
              <h3 className="mt-4 text-xl font-bold">Control Total del Lote</h3>
              <ul className="mt-4 space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <span className="text-cyan-400">✓</span> Creación de prendas con IA en segundos.
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-cyan-400">✓</span> Generación de órdenes de corte y atados QR.
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-cyan-400">✓</span> Visibilidad en vivo del progreso en satélites.
                </li>
              </ul>
            </div>

            {/* Card Satélites */}
            <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-xl shadow-emerald-950/20">
              <div className="inline-flex rounded-full bg-emerald-950 px-3 py-1 text-xs font-bold text-emerald-300">
                2. Talleres Satélites
              </div>
              <h3 className="mt-4 text-xl font-bold">Gestión Satelital sin Errores</h3>
              <ul className="mt-4 space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Recepción y escaneo de atados con QR.
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Simulador de costo unitario CFI para no coser a pérdida.
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Ficha interactiva de procesos y avance por marca.
                </li>
              </ul>
            </div>

            {/* Card Operarios */}
            <div className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-xl">
              <div className="inline-flex rounded-full bg-purple-950 px-3 py-1 text-xs font-bold text-purple-300">
                3. Operarios de Ensamble
              </div>
              <h3 className="mt-4 text-xl font-bold">Cuadrilla y Liquidación al Día</h3>
              <ul className="mt-4 space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <span className="text-purple-400">✓</span> Registro rápido de piezas procesadas desde el móvil.
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-400">✓</span> Ficha de perfil interactiva con acumulado diario/semanal.
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-400">✓</span> Liquidación transparente de destajo a 1 clic.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Sección: Módulos Estrella & Innovación */}
      <section className="relative z-10 border-t border-slate-900 bg-slate-900/30 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <div className="text-2xl">📱</div>
              <h4 className="mt-3 font-bold text-slate-100">App Móvil PWA & Android</h4>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Instalable en celulares Android sin necesidad de equipos de cómputo en la planta de confección.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <div className="text-2xl">🏷️</div>
              <h4 className="mt-3 font-bold text-slate-100">Tickets de Faltantes</h4>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Nomenclatura unívoca para reposición inmediata de faltantes sin detener las líneas de costura.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <div className="text-2xl">🧮</div>
              <h4 className="mt-3 font-bold text-slate-100">Simulador de Costos CFI</h4>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Calculadora de costo fijo unitario para satélites. Conoce exactamente tu margen antes de iniciar un lote.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <div className="text-2xl">⚡</div>
              <h4 className="mt-3 font-bold text-slate-100">Liquidación a 1 Clic</h4>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Calcula la nómina por destajo semanal o quincenal en un instante, eliminado errores de cuentas manuales.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Planes para Marcas y Satélites */}
      <section id="planes" className="relative z-10 mx-auto max-w-6xl px-6 py-20">
        <div className="text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">
            Inversión Transparente
          </span>
          <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">
            Planes diseñados para crecer
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Prueba gratis por 60 días sin compromiso para completar 2 a 3 ciclos de corte.
          </p>
        </div>

        {/* Planes Marcas */}
        <h3 className="mt-12 text-center text-xl font-bold text-slate-200">Para Marcas y Diseñadores</h3>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BRAND_PLANS.map((p) => (
            <div
              key={p.id}
              className={`rounded-2xl border p-6 flex flex-col justify-between transition hover:border-cyan-500/60 ${
                p.highlight
                  ? "border-cyan-500 bg-slate-900/90 shadow-xl shadow-cyan-950/40"
                  : "border-slate-800 bg-slate-900/50"
              }`}
            >
              <div>
                <span className="text-xs font-semibold text-cyan-400">{p.audience}</span>
                <h4 className="mt-1 text-lg font-bold text-slate-100">{p.name}</h4>
                <p className="mt-3 text-3xl font-extrabold text-white">{p.priceLabel}</p>
                <p className="text-xs text-slate-500">{p.period}</p>
                <ul className="mt-5 space-y-2 text-xs text-slate-300">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <span className="text-cyan-400">✓</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href="/auth/login"
                className={`mt-6 w-full text-center rounded-xl py-2.5 text-xs font-bold transition ${
                  p.highlight
                    ? "bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                    : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                }`}
              >
                Elegir plan
              </Link>
            </div>
          ))}
        </div>

        {/* Planes Satélites */}
        <h3 className="mt-16 text-center text-xl font-bold text-slate-200">Para Talleres Satélite</h3>
        <div className="mx-auto mt-6 grid max-w-2xl gap-4 sm:grid-cols-2">
          {SATELLITE_PLANS.map((p) => (
            <div
              key={p.id}
              className={`rounded-2xl border p-6 flex flex-col justify-between transition hover:border-emerald-500/60 ${
                p.highlight
                  ? "border-emerald-500 bg-slate-900/90 shadow-xl shadow-emerald-950/40"
                  : "border-slate-800 bg-slate-900/50"
              }`}
            >
              <div>
                <span className="text-xs font-semibold text-emerald-400">{p.audience}</span>
                <h4 className="mt-1 text-lg font-bold text-slate-100">{p.name}</h4>
                <p className="mt-3 text-3xl font-extrabold text-white">{p.priceLabel}</p>
                <p className="text-xs text-slate-500">{p.period}</p>
                <ul className="mt-5 space-y-2 text-xs text-slate-300">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <span className="text-emerald-400">✓</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href="/auth/login"
                className={`mt-6 w-full text-center rounded-xl py-2.5 text-xs font-bold transition ${
                  p.highlight
                    ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                    : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                }`}
              >
                Empieza Gratis
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-900 bg-slate-950 py-10 text-xs text-slate-500">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Logo heightClass="h-6" />
              <span className="text-slate-600">| Ecosistema Neural Nexus</span>
            </div>
            <p className="text-slate-400">
              CoreTextil es una solución especializada en Inteligencia Artificial desarrollada dentro del{" "}
              <a
                href="https://neural-nexus-inky.vercel.app/es"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-cyan-400 transition hover:underline"
              >
                Portal Neural Nexus ↗
              </a>
            </p>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-1.5 text-slate-400">
            <p>© {new Date().getFullYear()} CoreTextil SaaS · Creado en Cúcuta para Colombia y LATAM.</p>
            <p className="text-xs text-slate-500">
              Liderado e impulsado por{" "}
              <a
                href="https://wilycol.github.io/wily-dev/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-slate-300 transition hover:text-cyan-300 hover:underline"
              >
                Wily Col (Lead AI Architect)
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
