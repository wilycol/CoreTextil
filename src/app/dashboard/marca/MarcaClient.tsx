"use client";

import { useState, useTransition } from "react";
import { updateTenantConfig } from "./actions";
import type { TenantsRow } from "@/lib/db.types";

export default function MarcaClient({ initialData }: { initialData?: Partial<TenantsRow> | null }) {
  const [name, setName] = useState(initialData?.name || "");
  const [nitRut, setNitRut] = useState(initialData?.nit_rut || "");
  const [phone, setPhone] = useState(initialData?.admin_phone || "");
  const [address, setAddress] = useState(initialData?.admin_address || "");
  
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    setSuccess(null);
    
    if (!name) {
      setError("El nombre de la marca es obligatorio.");
      return;
    }
    
    startTransition(async () => {
      const res = await updateTenantConfig({
        name,
        nit_rut: nitRut,
        admin_phone: phone,
        admin_address: address,
      });

      if (res.ok) {
        setSuccess("Identidad corporativa actualizada correctamente.");
      } else {
        setError(res.error ?? "No se pudo actualizar la configuración.");
      }
    });
  }

  return (
    <div className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      
      <section className="space-y-4">
        <label className="block max-w-sm">
          <span className="mb-1 block text-sm text-slate-400">Nombre de la Marca / Empresa *</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500"
          />
        </label>
        
        <label className="block max-w-sm">
          <span className="mb-1 block text-sm text-slate-400">NIT / RUT</span>
          <input
            type="text"
            placeholder="Opcional"
            value={nitRut}
            onChange={(e) => setNitRut(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500"
          />
        </label>

        <label className="block max-w-sm">
          <span className="mb-1 block text-sm text-slate-400">Teléfono Corporativo</span>
          <input
            type="tel"
            placeholder="+57 300 000 0000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500"
          />
        </label>

        <label className="block max-w-md">
          <span className="mb-1 block text-sm text-slate-400">Dirección Física (Oficina / Bodega principal)</span>
          <textarea
            rows={3}
            placeholder="Calle 123 # 45-67, Ciudad"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500"
          />
        </label>
      </section>

      {/* Acciones */}
      <div className="pt-4 flex items-center justify-between border-t border-slate-800">
        <div>
          {error && <span className="text-sm text-red-400">{error}</span>}
          {success && <span className="text-sm text-emerald-400">{success}</span>}
        </div>
        <button
          onClick={handleSave}
          disabled={pending}
          className="rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-50"
        >
          {pending ? "Guardando..." : "Guardar Marca"}
        </button>
      </div>

    </div>
  );
}
