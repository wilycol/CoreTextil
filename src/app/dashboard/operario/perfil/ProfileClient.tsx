"use client";

import { useState, useTransition } from "react";
import { updateOperatorProfile } from "./actions";
import type { OperatorProfilesRow } from "@/lib/db.types";

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
];

const SPECIALTIES_LIST = [
  "Ajuste Liviano",
  "Ajuste Pesado",
  "Ropa Interior",
  "Ropa Deportiva",
  "Jeans / Denim",
  "Sastrería",
  "Prendas de Cuero",
  "Vestidos de Baño",
];

export default function ProfileClient({ initialData }: { initialData?: Partial<OperatorProfilesRow> | null }) {
  const [phone, setPhone] = useState(initialData?.phone_whatsapp || "");
  const [experience, setExperience] = useState(initialData?.years_of_experience?.toString() || "0");
  const [specialties, setSpecialties] = useState<string[]>(initialData?.specialties || []);
  const [machines, setMachines] = useState<string[]>(initialData?.machines || []);
  
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
    
    if (!phone) {
      setError("El número de WhatsApp es obligatorio.");
      return;
    }
    
    startTransition(async () => {
      const res = await updateOperatorProfile({
        phone_whatsapp: phone,
        years_of_experience: parseInt(experience, 10) || 0,
        specialties,
        machines,
      });

      if (res.ok) {
        setSuccess("Perfil actualizado correctamente. ¡Listo para trabajar!");
      } else {
        setError(res.error ?? "No se pudo actualizar el perfil.");
      }
    });
  }

  return (
    <div className="space-y-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      
      {/* Contacto */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-cyan-300">1. Información de Contacto</h2>
        <label className="block max-w-sm">
          <span className="mb-1 block text-sm text-slate-400">WhatsApp / Teléfono</span>
          <input
            type="tel"
            placeholder="+57 300 000 0000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500"
          />
        </label>
      </section>

      <hr className="border-slate-800" />

      {/* Experiencia y Especialidades */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-cyan-300">2. Experiencia Profesional</h2>
        <label className="block max-w-xs mb-6">
          <span className="mb-1 block text-sm text-slate-400">Años de Experiencia</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="50"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              className="w-24 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500"
            />
            <span className="text-slate-400">años</span>
          </div>
        </label>

        <span className="mb-2 block text-sm text-slate-400">Especialidades de Confección</span>
        <div className="flex flex-wrap gap-2">
          {SPECIALTIES_LIST.map((spec) => (
            <button
              key={spec}
              onClick={() => toggleItem(specialties, setSpecialties, spec)}
              className={`rounded-full px-4 py-1.5 text-sm transition ${
                specialties.includes(spec)
                  ? "bg-cyan-600 text-white"
                  : "border border-slate-700 text-slate-400 hover:border-cyan-500"
              }`}
            >
              {spec}
            </button>
          ))}
        </div>
      </section>

      <hr className="border-slate-800" />

      {/* Máquinas */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-cyan-300">3. Maquinaria que Dominas</h2>
        <span className="mb-2 block text-sm text-slate-400">Selecciona todas las máquinas que sabes operar con fluidez:</span>
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
          {pending ? "Guardando..." : "Guardar Perfil"}
        </button>
      </div>

    </div>
  );
}
