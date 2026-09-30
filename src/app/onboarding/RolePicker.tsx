"use client";

import { useState, useTransition } from "react";
import { completeOnboarding } from "./actions";

const OPTIONS = [
  {
    role: "brand_admin",
    title: "Soy marca / taller de corte",
    text: "Diseño prendas con ADN asistido por IA, emito órdenes de corte y sigo el avance de cada lote en vivo.",
    cta: "Crear mi marca",
  },
  {
    role: "satellite_owner",
    title: "Soy taller satélite de ensamble",
    text: "Recibo cortes, controlo costos fijos antes de aceptar un lote y liquido el destajo de mis operarios a un clic.",
    cta: "Registrar mi taller",
  },
] as const;

export default function RolePicker() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [bossEmail, setBossEmail] = useState("");

  function choose(role: "brand_admin" | "satellite_owner" | "operator") {
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
      <div className="grid gap-4 sm:grid-cols-3">
        {OPTIONS.map((o) => (
          <button
            key={o.role}
            onClick={() => choose(o.role as any)}
            disabled={pending}
            className="rounded-xl border border-slate-700 bg-slate-900 p-5 text-left transition hover:border-cyan-500 hover:bg-slate-800/80 disabled:opacity-50"
          >
            <h2 className="font-semibold text-cyan-300">{o.title}</h2>
            <p className="mt-2 text-sm text-slate-400">{o.text}</p>
            <span className="mt-4 inline-block rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white">
              {pending ? "Creando…" : o.cta}
            </span>
          </button>
        ))}

        <div className="rounded-xl border border-slate-700 bg-slate-900 p-5 text-left transition hover:border-cyan-500 hover:bg-slate-800/80">
          <h2 className="font-semibold text-cyan-300">Soy operario libre</h2>
          <p className="mt-2 text-sm text-slate-400">Escaneo atados y trabajo por destajo. (Pronto podrás publicar tu CV para buscar talleres).</p>
          <div className="mt-4 flex flex-col gap-2">
            <button
              onClick={() => choose("operator")}
              disabled={pending}
              className="w-full rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
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
