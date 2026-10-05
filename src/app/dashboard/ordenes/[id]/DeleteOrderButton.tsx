"use client";

import { useTransition } from "react";
import { deleteOrder } from "./actions";

export default function DeleteOrderButton({ orderId, status, assignmentStatus }: { orderId: string; status: string; assignmentStatus: string }) {
  const [pending, startTransition] = useTransition();

  const canDelete = status === "draft" && (assignmentStatus === "proposed" || assignmentStatus === "negotiating" || assignmentStatus === "rejected");

  if (!canDelete) return null;

  return (
    <button
      onClick={() => {
        if (window.confirm("¿Seguro que deseas eliminar esta orden de corte? Esta acción no se puede deshacer.")) {
          startTransition(async () => {
            const res = await deleteOrder(orderId);
            if (res.ok) {
              window.location.href = "/dashboard/ordenes";
            } else {
              alert(res.error || "No se pudo eliminar.");
            }
          });
        }
      }}
      disabled={pending}
      className="rounded bg-red-900/40 px-3 py-1.5 text-sm font-semibold text-red-400 transition hover:bg-red-900/60 disabled:opacity-50"
    >
      {pending ? "Eliminando..." : "Eliminar Orden"}
    </button>
  );
}
