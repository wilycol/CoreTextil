"use client";

import { useState, useTransition } from "react";
import { createInviteLink } from "./actions";

export default function InviteButton({ role }: { role: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const isBrand = role === "brand_admin" || role === "designer" || role === "cutter";
  const buttonText = isBrand ? "🔗 Invitar Taller Satélite" : "🔗 Invitar Operario";
  const roleName = isBrand ? "Taller Satélite" : "Operario";

  function handleInvite() {
    setError("");
    startTransition(async () => {
      try {
        const token = await createInviteLink();
        const link = `${window.location.origin}/invite/${token}`;
        
        // Mensaje predefinido para WhatsApp
        const message = `¡Hola! Te invito a unirte a mi equipo en CoreTextil como ${roleName}. Entra a este enlace para registrarte de forma segura:\n\n${link}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

        // Copiar por si acaso
        await navigator.clipboard.writeText(link).catch(() => {});
        
        // Abrir WhatsApp
        window.open(whatsappUrl, "_blank");
      } catch (err: any) {
        setError(err.message);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleInvite}
        disabled={pending}
        className="flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#20b858] shadow-lg shadow-[#25D366]/20 disabled:opacity-50"
      >
        {pending ? (
          "Generando..."
        ) : (
          <>
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            {buttonText}
          </>
        )}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
