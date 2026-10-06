"use client";

import { useState } from "react";
import { unlinkSatellite } from "./actions";

type OrderItem = {
  id: string;
  order_number: string;
  status: string;
  total_units: number;
  garment_name: string;
  operations_count: number;
  logged_op_units: number;
  target_op_units: number;
  progress_percentage: number;
};

type SatelliteCard = {
  id: string;
  name: string;
  owner_name: string;
  email: string;
  logo_url: string | null;
  max_operators: number;
  available_machines: string[];
  is_configured: boolean;
  joined_at: string;
  active_orders_count: number;
  orders: OrderItem[];
};

const STATUS_LABELS: Record<string, { label: string; style: string }> = {
  draft: { label: "Borrador", style: "bg-slate-800 text-slate-300 border-slate-700" },
  cutting: { label: "En corte", style: "bg-amber-950/80 text-amber-300 border-amber-500/40" },
  dispatched: { label: "Despachada", style: "bg-indigo-950/80 text-indigo-300 border-indigo-500/40" },
  in_progress: { label: "En Ensamble", style: "bg-cyan-950/80 text-cyan-300 border-cyan-500/40" },
  completed: { label: "Completada", style: "bg-emerald-950/80 text-emerald-300 border-emerald-500/40" },
};

export default function RedClient({
  satellites,
}: {
  satellites: SatelliteCard[];
}) {
  const [satelliteToRemove, setSatelliteToRemove] = useState<{ id: string; name: string } | null>(null);
  const [selectedSatellite, setSelectedSatellite] = useState<SatelliteCard | null>(null);
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
              onClick={() => setSelectedSatellite(s)}
              className="group cursor-pointer flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/90 p-5 transition-all hover:border-cyan-500/60 hover:shadow-lg hover:shadow-cyan-500/10"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {s.logo_url ? (
                      <img
                        src={s.logo_url}
                        alt={s.name}
                        className="h-12 w-12 rounded-xl border border-cyan-500/40 object-cover shadow-sm group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-xl font-bold text-cyan-400">
                        🏭
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-slate-100 text-base leading-snug group-hover:text-cyan-300 transition-colors">{s.name}</h3>
                      <p className="text-xs text-slate-400 font-medium">Propietario: {s.owner_name}</p>
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
                    <span className="text-slate-400">Órdenes en curso:</span>
                    <span className="font-bold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
                      {s.active_orders_count} {s.active_orders_count === 1 ? "orden" : "órdenes"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Contacto:</span>
                    <span className="truncate max-w-[160px] text-slate-300 font-mono text-[11px]">{s.email}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-slate-800/80 pt-3">
                <span className="text-xs font-semibold text-cyan-400 group-hover:underline">
                  Ver Ficha del Taller →
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSatelliteToRemove({ id: s.id, name: s.name });
                  }}
                  className="text-xs font-semibold text-red-400 transition hover:text-red-300 hover:underline"
                >
                  Desvincular
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Ficha del Taller Satélite */}
      {selectedSatellite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-4">
                {selectedSatellite.logo_url ? (
                  <img
                    src={selectedSatellite.logo_url}
                    alt={selectedSatellite.name}
                    className="h-16 w-16 rounded-2xl border-2 border-cyan-500/50 object-cover shadow-lg shadow-cyan-500/10"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-slate-700 bg-slate-800 text-3xl font-bold text-cyan-400">
                    🏭
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedSatellite.name}</h2>
                  <p className="text-xs text-slate-400 font-medium">Propietario: <span className="text-slate-200">{selectedSatellite.owner_name}</span></p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedSatellite.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSatellite(null)}
                className="rounded-lg bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Capacidad y Maquinaria */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <span className="text-xs text-slate-400 block mb-1">Capacidad Instalada</span>
                <span className="text-lg font-bold text-cyan-300">
                  {selectedSatellite.max_operators > 0 ? `${selectedSatellite.max_operators} Operarios` : "Sin especificar"}
                </span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <span className="text-xs text-slate-400 block mb-1">Estado de Integración</span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-md border inline-block ${
                  selectedSatellite.is_configured
                    ? "bg-emerald-950 text-emerald-300 border-emerald-500/40"
                    : "bg-amber-950 text-amber-300 border-amber-500/40"
                }`}>
                  {selectedSatellite.is_configured ? "✅ Configuración Completa" : "⚠️ Configuración Pendiente"}
                </span>
              </div>
            </div>

            {/* Maquinaria Disponible */}
            <div>
              <h3 className="text-sm font-bold text-slate-300 mb-2">Maquinaria Disponible en Taller:</h3>
              {selectedSatellite.available_machines && selectedSatellite.available_machines.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {selectedSatellite.available_machines.map((m) => (
                    <span key={m} className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-cyan-300 border border-slate-700">
                      {m}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No ha especificado inventario de maquinaria aún.</p>
              )}
            </div>

            {/* Órdenes de Corte Asignadas */}
            <div className="border-t border-slate-800 pt-4">
              <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center justify-between">
                <span>Órdenes de Producción en Curso ({selectedSatellite.orders.length}):</span>
              </h3>

              {selectedSatellite.orders.length === 0 ? (
                <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4 text-center text-xs text-slate-500">
                  Este taller no tiene órdenes de corte activas asignadas en este momento.
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedSatellite.orders.map((ord) => {
                    const statusInfo = STATUS_LABELS[ord.status] || {
                      label: ord.status,
                      style: "bg-slate-800 text-slate-300 border-slate-700",
                    };

                    return (
                      <div
                        key={ord.id}
                        className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3 shadow-inner"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-cyan-300 text-sm">
                                {ord.order_number}
                              </span>
                              <span className="text-xs text-slate-400 font-medium">
                                · {ord.garment_name}
                              </span>
                            </div>
                            <span className="text-xs text-slate-400 block mt-0.5">
                              📦 Lote de atado de corte:{" "}
                              <strong className="text-slate-200">{ord.total_units} prendas</strong>
                            </span>
                          </div>
                          <span
                            className={`rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide border ${statusInfo.style}`}
                          >
                            {statusInfo.label}
                          </span>
                        </div>

                        {/* Barra de Avance de Ensamble en Tiempo Real */}
                        <div className="space-y-1.5 pt-1 border-t border-slate-900">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-slate-300 flex items-center gap-1.5">
                              <span className="text-emerald-400 animate-pulse">⚡</span> Avance de Ensamble y Conteo Diario:
                            </span>
                            <span className="text-cyan-400 font-bold font-mono text-xs">
                              {ord.progress_percentage}% completado
                            </span>
                          </div>

                          {/* Track y Barra de Progreso Gradiente */}
                          <div className="h-2.5 w-full rounded-full bg-slate-900 border border-slate-800 overflow-hidden relative">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500 shadow-sm shadow-cyan-500/50"
                              style={{ width: `${ord.progress_percentage}%` }}
                            />
                          </div>

                          {/* Metadatos de Operaciones Registradas */}
                          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5 flex-wrap gap-1">
                            <span>
                              Operaciones por operarios:{" "}
                              <strong className="text-slate-200">
                                {ord.logged_op_units}
                              </strong>{" "}
                              de {ord.target_op_units} requeridas
                            </span>
                            <span className="text-slate-500 italic">
                              {ord.logged_op_units > 0
                                ? "🟢 Actualizado en tiempo real"
                                : "⏳ Sin reporte diario hoy"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pie del Modal */}
            <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
              <button
                onClick={() => setSelectedSatellite(null)}
                className="rounded-xl bg-slate-800 px-5 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
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
