"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { addMaterial, deleteMaterial } from "./actions";

export default function MaterialsButtons({ garmentId }: { garmentId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function add() {
    const name = prompt("Nombre del material (ej: Tela principal):");
    if (!name?.trim()) return;
    const quantity = prompt("Consumo por prenda (ej: 0.45):", "1");
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      alert("Cantidad inválida.");
      return;
    }
    const unit = prompt("Unidad (m, unidad, par, gr):", "m")?.trim() || "unidad";
    const cost = prompt(`Costo por ${unit} en COP (ej: 8000):`, "0");
    const unitCost = Number(cost);
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      alert("Costo inválido.");
      return;
    }
    startTransition(async () => {
      const res = await addMaterial(garmentId, {
        name: name.trim(),
        unit,
        quantity_per_garment: qty,
        unit_cost_cop: unitCost,
      });
      if (!res.ok) alert(res.error);
      else router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm("¿Quitar este material de la ficha?")) return;
    startTransition(async () => {
      const res = await deleteMaterial(id);
      if (!res.ok) alert(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={add}
        disabled={pending}
        className="rounded-lg border border-cyan-600 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-950 disabled:opacity-50"
      >
        + Agregar material
      </button>
      <span className="self-center text-xs text-slate-500">
        Pasa el mouse sobre un material y usa la ✕ para quitarlo.
      </span>
    </div>
  );
}
