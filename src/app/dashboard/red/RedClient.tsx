"use client";

import { useState } from "react";
import { unlinkSatellite } from "./actions";

type SatelliteCard = {
  id: string;
  name: string;
  owner_name: string;
  email: string;
  logo_url: string | null;
  max_operators: number;
  is_configured: boolean;
  joined_at: string;
};

export default function RedClient({
  satellites,
}: {
  satellites: SatelliteCard[];
}) {
  const [satelliteToRemove, setSatelliteToRemove] = useState<{ id: string; name: string } | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleUnlink() {
    if (!satelliteToRemove) return;
    setIsRemoving(true);
    setError(null);
    setMessage(null);
    
    const res = await unlinkSatellite(satelliteToRemove.id);
    setIsRemoving(false);
    
    if (res.ok) {
      setMessage(`El taller satélite ${satelliteToRemove.name} ha sido removido de tu red.`);
      setSatelliteToRemove(null);
      window.location.reload();
    } else {
      setError(res.error ?? "No se pudo remover el satélite.");
      setSatelliteToRemove(null);
    }
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-400">{error}</p>}
      {message && <p className="text-sm text-emerald-400">{message}</p>}

      {satellites.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center text-slate-400 shadow-xl">
          <span className="text-4xl mb-3 block">🏭</span>
          <h3 className="text-lg font-bold text-slate-200">Aún no tienes talleres satélites vinculados</h3>
          <p className="mt-1 text-sm text-slate-400 max-w-md mx-auto">
            Usa el botón <span className="font-semibold text-emerald-400">«Invitar Taller Satélite»</span> en el Dashboard para compartir tu enlace unívoco de invitación.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {satellites.map((s) => (
            <div
              key={s.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/90 p-5 transition-all hover:border-cyan-500/60 hover:shadow-lg hover:shadow-cyan-500/5"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {s.logo_url ? (
                      <img
                        src={s.logo_url}
                        alt={s.name}
                        className="h-12 w-12 rounded-xl border border-cyan-500/40 object-cover shadow-sm"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-xl font-bold text-cyan-400">
                        🏭
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-slate-100 text-base leading-snug">{s.name}</h3>
                      <p className="text-xs text-slate-400 font-medium">Dueño: {s.owner_name}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2 border-t border-slate-800/80 pt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Estado de datos:</span>
                    {s.is_configured ? (
                      <span className="rounded-md bg-emerald-950/60 px-2 py-0.5 font-bold text-emerald-400 border border-emerald-500/30">
                        ✅ Configurado
                      </span>
                    ) : (
                      <span className="rounded-md bg-amber-950/60 px-2 py-0.5 font-bold text-amber-400 border border-amber-500/30">
                        ⚠️ Sin configurar
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Capacidad operarios:</span>
                    <span className="font-semibold text-slate-200">{s.max_operators > 0 ? `${s.max_operators} puestos` : "Por definir"}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Contacto:</span>
                    <span className="truncate max-w-[160px] text-slate-300 font-mono text-[11px]">{s.email}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-slate-800/80 pt-3">
                <span className="text-[10px] text-slate-500">
                  Unido: {new Date(s.joined_at).toLocaleDateString()}
                </span>
                <button
                  onClick={() => setSatelliteToRemove({ id: s.id, name: s.name })}
                  className="text-xs font-semibold text-red-400 transition hover:text-red-300 hover:underline"
                >
                  Desvincular
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmación Modal para Desvincular */}
      {satelliteToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-100">¿Remover taller satélite de la red?</h3>
            <p className="mt-3 text-slate-400">
              Estás a punto de desvincular al taller <span className="font-semibold text-slate-200">{satelliteToRemove.name}</span>.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Este taller ya no aparecerá en tus listas para asignar órdenes de corte. Podrás volver a invitarlo más adelante si lo deseas. Su historial de órdenes pasadas se conservará.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setSatelliteToRemove(null)}
                disabled={isRemoving}
                className="rounded-lg px-4 py-2 font-medium text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleUnlink}
                disabled={isRemoving}
                className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition hover:bg-red-500 disabled:opacity-50"
              >
                {isRemoving ? "Removiendo..." : "Sí, remover taller"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
