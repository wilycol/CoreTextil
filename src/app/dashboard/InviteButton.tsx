"use client";

import { useState, useTransition } from "react";
import { createInviteLink } from "./actions";

export default function InviteButton({ role }: { role: string }) {
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const isBrand = role === "brand_admin" || role === "designer" || role === "cutter";
  const buttonText = isBrand ? "🔗 Invitar Taller Satélite" : "🔗 Invitar Operario";

  function handleInvite() {
    setError("");
    startTransition(async () => {
      try {
        const token = await createInviteLink();
        const link = `${window.location.origin}/invite/${token}`;
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
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
        className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
      >
        {pending ? "Generando..." : copied ? "¡Enlace copiado! Pégalo en WhatsApp" : buttonText}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
