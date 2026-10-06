"use client";

import Link from "next/link";

type Props = {
  role: string;
  isConfigured: boolean;
  missingMessage: string;
  actionUrl: string;
  actionText: string;
};

export default function SetupReminderBanner({
  isConfigured,
  missingMessage,
  actionUrl,
  actionText,
}: Props) {
  if (isConfigured) return null;

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 p-4 shadow-lg shadow-amber-500/5 animate-in fade-in">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-xl border border-amber-500/40">
          🔔
        </span>
        <div>
          <h3 className="text-sm font-bold text-amber-300">
            ¡Configuración pendiente para tu organización!
          </h3>
          <p className="text-xs text-slate-300">
            {missingMessage}
          </p>
        </div>
      </div>
      <Link
        href={actionUrl}
        className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-400 shadow-md hover:shadow-amber-500/20"
      >
        {actionText} →
      </Link>
    </div>
  );
}
