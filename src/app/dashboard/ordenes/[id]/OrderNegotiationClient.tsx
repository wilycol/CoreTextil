"use client";

import { useState, useTransition } from "react";
import { updateOrderAssignment } from "./actions";
import type { OrderAssignmentStatus } from "@/lib/db.types";

export default function OrderNegotiationClient({
  orderId,
  currentStatus,
  isSatellite,
}: {
  orderId: string;
  currentStatus: OrderAssignmentStatus;
  isSatellite: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAction(action: OrderAssignmentStatus) {
    if (action === "negotiating") {
      const confirmMsg = "Esto notificará a la marca que deseas renegociar el precio del corte. ¿Continuar?";
      if (!window.confirm(confirmMsg)) return;
    }

    startTransition(async () => {
      setError(null);
      const res = await updateOrderAssignment(orderId, action);
      if (!res.ok) {
        setError(res.error || "Hubo un error al actualizar la orden.");
      } else {
        window.location.reload();
      }
    });
  }

  if (!isSatellite && currentStatus === "proposed") {
    return (
      <div className="rounded-xl border border-amber-800 bg-amber-950/40 p-4 text-sm text-amber-300">
        Esperando respuesta del taller satélite...
      </div>
    );
  }

  if (isSatellite && currentStatus === "proposed") {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <h3 className="mb-2 text-lg font-bold text-slate-100">Nueva Propuesta de Corte</h3>
        <p className="mb-4 text-sm text-slate-400">
          Revisa el precio en el Simulador de Rentabilidad antes de aceptar.
        </p>
        
        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
        
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleAction("accepted")}
            disabled={pending}
            className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            Aceptar Corte
          </button>
          <button
            onClick={() => handleAction("negotiating")}
            disabled={pending}
            className="rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white transition hover:bg-amber-500 disabled:opacity-50"
          >
            Proponer Nuevo Precio
          </button>
          <button
            onClick={() => handleAction("rejected")}
            disabled={pending}
            className="rounded-lg bg-rose-600 px-4 py-2 font-semibold text-white transition hover:bg-rose-500 disabled:opacity-50"
          >
            Rechazar
          </button>
        </div>
      </div>
    );
  }

  if (currentStatus === "negotiating") {
    return (
      <div className="rounded-xl border border-amber-800 bg-amber-950/40 p-4 text-sm text-amber-300 flex items-center justify-between">
        <span>Esta orden está en proceso de negociación de precios. Comunícate por interno.</span>
        {isSatellite && (
          <button
            onClick={() => handleAction("accepted")}
            disabled={pending}
            className="rounded border border-amber-500 px-3 py-1 font-semibold text-amber-500 transition hover:bg-amber-500 hover:text-white"
          >
            Aceptar Precio Final
          </button>
        )}
      </div>
    );
  }

  if (currentStatus === "rejected") {
    return (
      <div className="rounded-xl border border-rose-800 bg-rose-950/40 p-4 text-sm text-rose-300">
        Esta orden fue rechazada por el taller satélite.
      </div>
    );
  }

  return null; // Aceptada no necesita UI extra aquí.
}
