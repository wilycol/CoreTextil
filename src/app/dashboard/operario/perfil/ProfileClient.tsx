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

export default function ProfileClient({ initialData }: { initialData?: Partial<OperatorProfilesRow> & { avatar_url?: string | null } | null }) {
  const [phone, setPhone] = useState(initialData?.phone_whatsapp || "");
  const [experience, setExperience] = useState(initialData?.years_of_experience?.toString() || "0");
  const [specialties, setSpecialties] = useState<string[]>(initialData?.specialties || []);
  const [machines, setMachines] = useState<string[]>(initialData?.machines || []);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialData?.avatar_url || null);
  
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
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
          setAvatarUrl(canvas.toDataURL("image/jpeg", 0.85));
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
        avatar_url: avatarUrl,
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
      
      {/* Contacto e Identidad Visual */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-cyan-300">1. Identidad Visual & Contacto</h2>
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Foto de Perfil"
                className="h-20 w-20 rounded-full border-2 border-cyan-500/50 object-cover shadow-lg shadow-cyan-500/10"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-slate-700 bg-slate-900 text-3xl font-bold text-slate-500">
                👤
              </div>
            )}
            <div>
              <label className="inline-block cursor-pointer rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-slate-700 border border-slate-700">
                <span>{avatarUrl ? "Cambiar foto de perfil" : "Subir mi foto de perfil"}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>
              <p className="mt-1 text-[11px] text-slate-500">Se mostrará en la Bolsa de Operarios</p>
            </div>
          </div>

          <label className="block max-w-sm flex-1">
            <span className="mb-1 block text-sm text-slate-400">WhatsApp / Teléfono *</span>
            <input
              type="tel"
              placeholder="+57 300 000 0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500"
            />
          </label>
        </div>
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
