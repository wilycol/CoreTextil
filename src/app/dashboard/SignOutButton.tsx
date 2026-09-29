"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();

  return (
    <button
      onClick={async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/auth/login");
        router.refresh();
      }}
      className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 transition hover:border-red-500 hover:text-red-400"
    >
      Salir
    </button>
  );
}
