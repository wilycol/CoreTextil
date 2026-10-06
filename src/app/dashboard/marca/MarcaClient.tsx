"use client";

import { useState, useEffect, useTransition } from "react";
import { updateTenantConfig } from "./actions";
import type { TenantsRow } from "@/lib/db.types";

export default function MarcaClient({ initialData }: { initialData?: Partial<TenantsRow> | null }) {
  const [name, setName] = useState(initialData?.name || "");
  const [logoUrl, setLogoUrl] = useState<string | null>((initialData as any)?.logo_url || null);
  const [nitRut, setNitRut] = useState(initialData?.nit_rut || "");
  const [phone, setPhone] = useState(initialData?.admin_phone || "");
  const [address, setAddress] = useState(initialData?.admin_address || "");
  
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      if (initialData.name !== undefined) setName(initialData.name || "");
      if ((initialData as any).logo_url !== undefined) setLogoUrl((initialData as any).logo_url || null);
      if (initialData.nit_rut !== undefined) setNitRut(initialData.nit_rut || "");
      if (initialData.admin_phone !== undefined) setPhone(initialData.admin_phone || "");
      if (initialData.admin_address !== undefined) setAddress(initialData.admin_address || "");
    }
  }, [initialData]);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = 256;
        canvas.height = 256;
        if (ctx) {
          ctx.drawImage(img, 0, 0, 256, 256);
          setLogoUrl(canvas.toDataURL("image/jpeg", 0.85));
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

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
        logo_url: logoUrl,
        nit_rut: nitRut,
        admin_phone: phone,
        admin_address: address,
      });

      if (res.ok) {
        setSuccess("Identidad corporativa y visual de la marca guardadas exitosamente.");
      } else {
        setError(res.error ?? "No se pudo actualizar la configuración.");
      }
    });
  }

  return (
    <div className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      
      {/* Logo e Identidad Visual */}
      <section className="flex flex-wrap items-center gap-6 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-4">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo Marca"
              className="h-20 w-20 rounded-2xl border-2 border-cyan-500/50 object-cover shadow-lg shadow-cyan-500/10"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900 text-3xl font-bold text-slate-500">
              🏢
            </div>
          )}
          <div>
            <label className="inline-block cursor-pointer rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-slate-700 border border-slate-700">
              <span>{logoUrl ? "Cambiar logo de la marca" : "Subir logo de la marca"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            </label>
            <p className="mt-1 text-[11px] text-slate-500">Aparecerá en órdenes de corte y en el Dashboard</p>
          </div>
        </div>
      </section>

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
