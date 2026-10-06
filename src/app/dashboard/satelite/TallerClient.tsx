"use client";

import { useState, useEffect, useTransition } from "react";
import { updateTallerConfig } from "./actions";
import type { SatelliteCostProfilesRow } from "@/lib/db.types";

const MACHINES_LIST = [
  "Plana (Una aguja)",
  "Plana (Dos agujas)",
  "Fileteadora (Overlock)",
  "Recubridora (Collarín)",
  "Cerradora de Codo",
  "Presilladora",
  "Ojaladora",
  "Botonadora",
  "Pretinadora",
  "Cortadora Vertical",
];

export default function TallerClient({ initialData }: { initialData?: Partial<SatelliteCostProfilesRow> | null }) {
  const [commercialName, setCommercialName] = useState(initialData?.commercial_name || "");
  const [logoUrl, setLogoUrl] = useState<string | null>((initialData as any)?.logo_url || null);
  const [maxOperators, setMaxOperators] = useState(initialData?.max_operators?.toString() || "0");
  const [machines, setMachines] = useState<string[]>(initialData?.available_machines || []);
  
  const [rent, setRent] = useState(initialData?.rent_monthly?.toString() || "0");
  const [energy, setEnergy] = useState(initialData?.energy_monthly?.toString() || "0");
  const [consumables, setConsumables] = useState(initialData?.consumables_monthly?.toString() || "0");
  const [maintenance, setMaintenance] = useState(initialData?.maintenance_monthly?.toString() || "0");
  const [estimatedUnits, setEstimatedUnits] = useState(initialData?.estimated_monthly_units?.toString() || "1000");

  useEffect(() => {
    if (initialData) {
      if (initialData.commercial_name !== undefined) setCommercialName(initialData.commercial_name || "");
      if ((initialData as any).logo_url !== undefined) setLogoUrl((initialData as any).logo_url || null);
      if (initialData.max_operators !== undefined) setMaxOperators(initialData.max_operators.toString());
      if (initialData.available_machines !== undefined) setMachines(initialData.available_machines || []);
      if (initialData.rent_monthly !== undefined) setRent(initialData.rent_monthly.toString());
      if (initialData.energy_monthly !== undefined) setEnergy(initialData.energy_monthly.toString());
      if (initialData.consumables_monthly !== undefined) setConsumables(initialData.consumables_monthly.toString());
      if (initialData.maintenance_monthly !== undefined) setMaintenance(initialData.maintenance_monthly.toString());
      if (initialData.estimated_monthly_units !== undefined) setEstimatedUnits(initialData.estimated_monthly_units.toString());
    }
  }, [initialData]);
  
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  function toggleItem(list: string[], setList: (v: string[]) => void, item: string) {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  }

  function handleSave() {
    setError(null);
    setSuccess(null);
    
    if (!commercialName) {
      setError("El nombre comercial es obligatorio.");
      return;
    }
    
    startTransition(async () => {
      const res = await updateTallerConfig({
        commercial_name: commercialName,
        logo_url: logoUrl,
        max_operators: parseInt(maxOperators, 10) || 0,
        available_machines: machines,
        rent_monthly: parseInt(rent, 10) || 0,
        energy_monthly: parseInt(energy, 10) || 0,
        consumables_monthly: parseInt(consumables, 10) || 0,
        maintenance_monthly: parseInt(maintenance, 10) || 0,
        estimated_monthly_units: parseInt(estimatedUnits, 10) || 1,
      });

      if (res.ok) {
        setSuccess("Configuración e Identidad del Taller guardadas exitosamente.");
      } else {
        setError(res.error ?? "No se pudo guardar la configuración.");
      }
    });
  }

  return (
    <div className="space-y-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      
      {/* Identidad del Taller */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-cyan-300">1. Identidad Comercial & Visual</h2>
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo Taller"
                className="h-20 w-20 rounded-2xl border-2 border-cyan-500/50 object-cover shadow-lg shadow-cyan-500/10"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900 text-3xl font-bold text-slate-500">
                🏭
              </div>
            )}
            <div>
              <label className="inline-block cursor-pointer rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-slate-700 border border-slate-700">
                <span>{logoUrl ? "Cambiar foto/logo" : "Subir foto del taller"}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              </label>
              <p className="mt-1 text-[11px] text-slate-500">Se mostrará en la Red CoreTextil B2B</p>
            </div>
          </div>

          <label className="block max-w-sm flex-1">
            <span className="mb-1 block text-sm text-slate-400">Nombre Comercial del Taller *</span>
            <input
              type="text"
              placeholder="Ej. Confecciones El Sol"
              value={commercialName}
              onChange={(e) => setCommercialName(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500"
            />
          </label>
        </div>
      </section>

      <hr className="border-slate-800" />

      {/* Capacidad Instalada */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-cyan-300">2. Capacidad Instalada</h2>
        
        <div className="mb-6 max-w-xs">
          <label className="block">
            <span className="mb-1 block text-sm text-slate-400">Puestos de Trabajo (Max. Operarios)</span>
            <input
              type="number"
              min="0"
              value={maxOperators}
              onChange={(e) => setMaxOperators(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500"
            />
          </label>
        </div>

        <span className="mb-2 block text-sm text-slate-400">Inventario de Maquinaria Disponible:</span>
        <div className="flex flex-wrap gap-2">
          {MACHINES_LIST.map((mac) => (
            <button
              key={mac}
              onClick={() => toggleItem(machines, setMachines, mac)}
              className={`rounded-full px-4 py-1.5 text-sm transition ${
                machines.includes(mac)
                  ? "bg-cyan-600 text-white"
                  : "border border-slate-700 text-slate-400 hover:border-cyan-500"
              }`}
            >
              {mac}
            </button>
          ))}
        </div>
      </section>

      <hr className="border-slate-800" />

      {/* Costos Fijos */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-cyan-300">3. Costos Fijos Operativos (Mensual)</h2>
        <p className="mb-4 text-sm text-slate-400">Estos datos son privados y ayudan a la IA a sugerirte precios mínimos de cobro a las marcas.</p>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm text-slate-400">Arriendo ($)</span>
            <input
              type="number"
              value={rent}
              onChange={(e) => setRent(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-slate-400">Servicios / Energía ($)</span>
            <input
              type="number"
              value={energy}
              onChange={(e) => setEnergy(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-slate-400">Insumos y Consumibles ($)</span>
            <input
              type="number"
              value={consumables}
              onChange={(e) => setConsumables(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-slate-400">Mantenimiento ($)</span>
            <input
              type="number"
              value={maintenance}
              onChange={(e) => setMaintenance(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm text-slate-400">Capacidad Total Estimada (Prendas/mes)</span>
            <input
              type="number"
              value={estimatedUnits}
              onChange={(e) => setEstimatedUnits(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500"
            />
          </label>
        </div>
      </section>

      {/* Acciones */}
      <div className="pt-4 flex items-center justify-between">
        <div>
          {error && <span className="text-sm text-red-400">{error}</span>}
          {success && <span className="text-sm text-emerald-400">{success}</span>}
        </div>
        <button
          onClick={handleSave}
          disabled={pending}
          className="rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-50"
        >
          {pending ? "Guardando..." : "Guardar Configuración"}
        </button>
      </div>

    </div>
  );
}
