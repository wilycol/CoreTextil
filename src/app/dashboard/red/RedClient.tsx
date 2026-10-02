"use client";

import { useState } from "react";
import { unlinkSatellite } from "./actions";

export default function RedClient({
  satellites,
}: {
  satellites: { id: string; name: string; email: string; joined_at: string }[];
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
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-center text-slate-400">
          Aún no tienes talleres satélites vinculados a tu red. Usa el botón de invitar para agregarlos.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {satellites.map((s) => (
            <div key={s.id} className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-cyan-500">
              <div>
                <h3 className="font-semibold text-slate-100">{s.name}</h3>
                <p className="mt-1 text-xs text-slate-400">{s.email}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Vinculado el: {new Date(s.joined_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setSatelliteToRemove({ id: s.id, name: s.name })}
                className="mt-4 self-end text-xs font-medium text-red-400 transition hover:text-red-300 hover:underline"
              >
                Desvincular
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Confirmación Modal para Desvincular */}
      {satelliteToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-100">¿Remover satélite de la red?</h3>
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
