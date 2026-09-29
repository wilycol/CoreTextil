"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptInviteAction } from "../../dashboard/actions";

export default function AcceptInviteButton({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();

  function accept() {
    setError("");
    startTransition(async () => {
      const res = await acceptInviteAction(token);
      if (res.ok) {
        router.push("/dashboard");
      } else {
        setError(res.error || "Ocurrió un error al aceptar la invitación.");
      }
    });
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={accept}
        disabled={pending}
        className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
      >
        {pending ? "Vinculando cuenta..." : "Aceptar y Unirme"}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
