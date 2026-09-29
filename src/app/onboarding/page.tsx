import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SATELLITE_PLANS } from "@/lib/branding";
import { formatCop } from "@/lib/cop";
import RolePicker from "./RolePicker";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, tenant_id")
    .eq("id", user.id)
    .single();

  if (profile?.tenant_id) redirect("/dashboard");

  const freePlan = SATELLITE_PLANS[0];

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-14 text-slate-100">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold">Bienvenido a CoreTextil</h1>
        <p className="mt-2 text-slate-400">
          Cuenta: {user.email}. Elige cómo entras al ecosistema.
        </p>

        <section className="mt-10">
          <RolePicker />
        </section>

        <section className="mt-10 rounded-xl border border-emerald-900 bg-emerald-950/40 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold text-emerald-300">
              {freePlan.name}: {freePlan.priceLabel}
            </h2>
            <span className="text-sm text-emerald-400">{freePlan.period}</span>
          </div>
          <ul className="mt-2 list-inside list-disc text-sm text-emerald-200/80">
            {freePlan.features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-emerald-400/70">
            Sube a {SATELLITE_PLANS[1].name} ({formatCop(SATELLITE_PLANS[1].priceCop)}/mes)
            solo cuando conectes 2 o más marcas.
          </p>
        </section>
      </div>
    </main>
  );
}
