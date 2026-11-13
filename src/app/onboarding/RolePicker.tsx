"use client";

import { useState, useTransition } from "react";
import { completeOnboarding } from "./actions";

const OPTIONS = [
  {
    role: "factory_admin",
    title: "🏭 Fábrica Integrada (Corte + Confección)",
    text: "Tengo mesa de corte y planta de costura propia. Diseño con IA, emito atados QR, dirijo mi cuadrilla y liquido nómina.",
    cta: "Registrar mi fábrica",
    highlight: true,
  },
  {
    role: "brand_admin",
    title: "🏷️ Marca / Taller de corte",
    text: "Diseño con IA, emito órdenes de corte y tercerizo el ensamble a talleres satélites.",
    cta: "Crear mi marca",
    highlight: false,
  },
  {
    role: "satellite_owner",
    title: "🧵 Taller satélite de ensamble",
    text: "Recibo cortes externos, controlo costos fijos y liquido el destajo de mis operarios a un clic.",
    cta: "Registrar mi taller",
    highlight: false,
  },
] as const;

export default function RolePicker() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [bossEmail, setBossEmail] = useState("");

  function choose(role: "brand_admin" | "satellite_owner" | "operator" | "factory_admin") {
    setError(null);
    startTransition(async () => {
      const res = await completeOnboarding(role, role === "operator" ? bossEmail : undefined);
      if (!res.ok) {
        setError(res.error ?? "Error inesperado");
      } else {
        window.location.href = "/dashboard";
      }
    });
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {OPTIONS.map((o) => (
          <button
            key={o.role}
            onClick={() => choose(o.role as any)}
            disabled={pending}
            className={`rounded-xl border p-5 text-left transition disabled:opacity-50 flex flex-col justify-between ${
              o.highlight
                ? "border-cyan-400 bg-slate-900/90 shadow-lg shadow-cyan-950/40 hover:border-cyan-300 hover:bg-slate-800"
                : "border-slate-700 bg-slate-900 hover:border-cyan-500 hover:bg-slate-800/80"
            }`}
          >
            <div>
              {o.highlight && (
                <span className="mb-2 inline-block rounded-full bg-cyan-900/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                  Ciclo Completo
                </span>
              )}
              <h2 className="font-semibold text-cyan-300">{o.title}</h2>
              <p className="mt-2 text-sm text-slate-400">{o.text}</p>
            </div>
            <span
              className={`mt-4 inline-block w-full rounded-lg px-4 py-2 text-center text-sm font-semibold text-white ${
                o.highlight ? "bg-cyan-500 hover:bg-cyan-400" : "bg-cyan-600 hover:bg-cyan-500"
              }`}
            >
              {pending ? "Creando…" : o.cta}
            </span>
          </button>
        ))}

        <div className="rounded-xl border border-slate-700 bg-slate-900 p-5 text-left transition hover:border-cyan-500 hover:bg-slate-800/80 flex flex-col justify-between">
          <div>
            <h2 className="font-semibold text-cyan-300">🧵 Soy operario libre</h2>
            <p className="mt-2 text-sm text-slate-400">
              Escaneo atados y marco piezas por destajo con botones rápidos desde mi celular.
            </p>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <button
              onClick={() => choose("operator")}
              disabled={pending}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-50"
            >
              {pending ? "Registrando..." : "Entrar como Operario"}
            </button>
          </div>
        </div>
      </div>
      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
    </div>
  );
}
