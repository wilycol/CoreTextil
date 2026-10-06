import Link from "next/link";
import { BRAND_PLANS, SATELLITE_PLANS } from "@/lib/branding";
import { formatCop } from "@/lib/cop";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2 group">
          <img
            src="/logo.png"
            alt="CoreTextil"
            className="h-10 w-auto object-contain transition-transform group-hover:scale-105"
          />
        </Link>
        <Link
          href="/auth/login"
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500"
        >
          Entrar con Google
        </Link>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-10 text-center">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
          Ecosistema Neural Nexus · Cúcuta, Norte de Santander
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl">
          Tu lote avanzando en vivo, del corte al operario.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-400">
          Conecta tu taller de corte con los satélites de ensamble y sus
          operarios. Nada de llamadas, cuadernos de destajo ni piezas
          perdidas: órdenes, atados con QR, liquidación a un clic y tickets
          de faltantes con nomenclatura unívoca.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/auth/login"
            className="rounded-xl bg-cyan-600 px-6 py-3 font-semibold text-white transition hover:bg-cyan-500"
          >
            Empezar gratis
          </Link>
          <a
            href="#planes"
            className="rounded-xl border border-slate-700 px-6 py-3 font-semibold text-slate-200 transition hover:border-cyan-500"
          >
            Ver planes
          </a>
        </div>
      </section>

      <section id="planes" className="mx-auto max-w-6xl px-6 pb-20">
        <h2 className="text-center text-2xl font-bold">Planes para marcas</h2>
        <p className="mt-1 text-center text-sm text-slate-400">
          Piloto de 60 días sin costo para completar 2 a 3 ciclos de corte.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BRAND_PLANS.map((p) => (
            <div
              key={p.id}
              className={`rounded-2xl border p-5 ${
                p.highlight
                  ? "border-cyan-500 bg-slate-900 shadow-lg shadow-cyan-900/30"
                  : "border-slate-800 bg-slate-900/60"
              }`}
            >
              <h3 className="font-semibold text-cyan-300">{p.name}</h3>
              <p className="mt-2 text-2xl font-extrabold">{p.priceLabel}</p>
              <p className="text-xs text-slate-500">{p.period}</p>
              <ul className="mt-4 space-y-1 text-sm text-slate-400">
                {p.features.map((f) => (
                  <li key={f}>· {f}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <h2 className="mt-16 text-center text-2xl font-bold">
          Para talleres satélite
        </h2>
        <div className="mx-auto mt-8 grid max-w-2xl gap-4 sm:grid-cols-2">
          {SATELLITE_PLANS.map((p) => (
            <div
              key={p.id}
              className={`rounded-2xl border p-5 ${
                p.highlight
                  ? "border-emerald-500 bg-slate-900 shadow-lg shadow-emerald-900/30"
                  : "border-slate-800 bg-slate-900/60"
              }`}
            >
              <h3 className="font-semibold text-emerald-300">{p.name}</h3>
              <p className="mt-2 text-2xl font-extrabold">{p.priceLabel}</p>
              <p className="text-xs text-slate-500">{p.period}</p>
              <ul className="mt-4 space-y-1 text-sm text-slate-400">
                {p.features.map((f) => (
                  <li key={f}>· {f}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-slate-500">
          Simulador de costos incluido: conoce tu costo fijo unitario (CFI)
          antes de aceptar un corte y nunca más coser a pérdida.
        </p>
      </section>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600">
        CoreTextil SaaS · MVP {new Date().getFullYear()}
      </footer>
    </main>
  );
}
