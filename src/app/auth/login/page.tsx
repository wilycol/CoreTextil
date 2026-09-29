import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GoogleButton from "./GoogleButton";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-cyan-400">
          CoreTextil SaaS
        </div>
        <h1 className="mb-3 text-2xl font-bold text-slate-100">
          Entra a tu taller
        </h1>
        <p className="mb-8 text-sm text-slate-400">
          Marcas, talleres satélite y operarios usan la misma puerta: tu cuenta
          de Google. Así cada pieza marcada queda trazada a una persona real.
        </p>
        <GoogleButton />
        <p className="mt-6 text-center text-xs text-slate-500">
          Piloto de 60 días sin costo para marcas de Cúcuta y Norte de Santander.
        </p>
      </div>
    </main>
  );
}
