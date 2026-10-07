"use client";

import { useState } from "react";
import type { FreeOperator } from "./page";

export default function TalentoClient({ operators }: { operators: FreeOperator[] }) {
  const [activeTab, setActiveTab] = useState<"operators" | "satellites" | "brands">("operators");
  const [search, setSearch] = useState("");

  const filtered = operators.filter((op) => {
    const term = search.toLowerCase();
    const matchName = op.full_name.toLowerCase().includes(term);
    const matchSpecialty = op.specialties.some((s) => s.toLowerCase().includes(term));
    const matchMachine = op.machines.some((m) => m.toLowerCase().includes(term));
    return matchName || matchSpecialty || matchMachine;
  });

  return (
    <div className="space-y-6">
      {/* Selector de Categorías de la Bolsa de Empleo y Maquila */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab("operators")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === "operators"
              ? "bg-cyan-600 text-white shadow-lg shadow-cyan-950/50"
              : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
          }`}
        >
          🧵 Operarios Libres ({operators.length})
        </button>
        <button
          onClick={() => setActiveTab("satellites")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
            activeTab === "satellites"
              ? "bg-cyan-600 text-white shadow-lg shadow-cyan-950/50"
              : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
          }`}
        >
          🏭 Talleres Satélites Buscando Marcas
          <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
            Próximamente
          </span>
        </button>
        <button
          onClick={() => setActiveTab("brands")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
            activeTab === "brands"
              ? "bg-cyan-600 text-white shadow-lg shadow-cyan-950/50"
              : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
          }`}
        >
          🏷️ Marcas Buscando Capacidad de Maquila
          <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
            Próximamente
          </span>
        </button>
      </div>

      {activeTab === "operators" ? (
        <>
          <input
            type="text"
            placeholder="Buscar por nombre, especialidad (ej. Jean) o máquina..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs text-slate-100 outline-none focus:border-cyan-500"
          />

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-center text-slate-400">
          No se encontraron operarios libres con esos criterios.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((op) => {
            const waLink = op.phone_whatsapp
              ? `https://wa.me/${op.phone_whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
                  `Hola ${op.full_name}, te escribo desde la plataforma CoreTextil. Vi tu perfil técnico y me gustaría ofrecerte trabajo en mi taller.`
                )}`
              : "#";

            return (
              <div key={op.id} className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-slate-700">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-slate-100">{op.full_name}</h3>
                  <p className="text-sm text-cyan-400 font-medium">{op.years_of_experience} años de exp.</p>
                </div>
                
                <div className="flex-1 space-y-4">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Especialidades</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {op.specialties.map((s, i) => (
                        <span key={i} className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                          {s}
                        </span>
                      ))}
                      {op.specialties.length === 0 && <span className="text-xs text-slate-500">No indicó</span>}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Máquinas</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {op.machines.map((m, i) => (
                        <span key={i} className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                          {m}
                        </span>
                      ))}
                      {op.machines.length === 0 && <span className="text-xs text-slate-500">No indicó</span>}
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t border-slate-800 pt-4">
                  {op.phone_whatsapp ? (
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noreferrer"
                      className="block w-full rounded-lg bg-[#25D366]/10 py-2 text-center text-sm font-semibold text-[#25D366] transition hover:bg-[#25D366]/20"
                    >
                      Contactar por WhatsApp
                    </a>
                  ) : (
                    <span className="block w-full rounded-lg bg-slate-800 py-2 text-center text-sm font-semibold text-slate-500">
                      Sin número de WhatsApp
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
        </>
      ) : activeTab === "satellites" ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-8 text-center space-y-3">
          <span className="text-3xl">🏭</span>
          <h3 className="text-lg font-bold text-amber-300">Marketplace de Talleres Satélites Buscando Marcas</h3>
          <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
            Esta sección permitirá a los Talleres Satélites publicar su capacidad de producción disponible (ej: 500 prendas/semana) para que Marcas y Diseñadores los contraten directamente.
          </p>
          <span className="inline-block px-3 py-1 text-xs font-bold text-amber-400 bg-amber-950 rounded-full border border-amber-500/40">
            🚧 En desarrollo para la Fase 2 del Piloto
          </span>
        </div>
      ) : (
        <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-8 text-center space-y-3">
          <span className="text-3xl">🏷️</span>
          <h3 className="text-lg font-bold text-cyan-300">Bolsa de Requerimientos de Marcas</h3>
          <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
            Las Marcas y Diseñadores podrán publicar ofertas de producción especificando el tipo de prenda (Jeans, Polo, Deportivo) para que los Talleres Satélites postulen sus propuestas.
          </p>
          <span className="inline-block px-3 py-1 text-xs font-bold text-cyan-400 bg-cyan-950 rounded-full border border-cyan-500/40">
            🚧 En desarrollo para la Fase 2 del Piloto
          </span>
        </div>
      )}
    </div>
  );
}
