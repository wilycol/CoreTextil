import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { GarmentsRow } from "@/lib/db.types";
import NewOrderForm from "./NewOrderForm";

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ garment?: string }>;
}) {
  const { profile } = await getSession();
  const supabase = await createClient();
  const { garment: garmentParam } = await searchParams;

  if (profile.role !== "brand_admin" && profile.role !== "designer") {
    return (
      <p className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-slate-300">
        Solo las marcas emiten órdenes de corte.
      </p>
    );
  }

  const { data: garments } = await supabase
    .from("garments")
    .select("*")
    .order("created_at", { ascending: false });

  // Carga de satélites vinculados a la red de la marca
  const { data: links } = await supabase
    .from("satellite_links")
    .select("satellite_user_id")
    .eq("brand_tenant_id", profile.tenant_id);

  const satelliteUserIds = (links ?? []).map((l: any) => l.satellite_user_id);

  const [{ data: satProfiles }, { data: costProfiles }] = await Promise.all([
    satelliteUserIds.length > 0
      ? supabase.from("profiles").select("id, email, full_name").in("id", satelliteUserIds)
      : Promise.resolve({ data: [] }),
    satelliteUserIds.length > 0
      ? supabase.from("satellite_cost_profiles").select("satellite_user_id, commercial_name").in("satellite_user_id", satelliteUserIds)
      : Promise.resolve({ data: [] }),
  ]);

  const costProfilesMap: Record<string, string> = {};
  (costProfiles ?? []).forEach((cp: any) => {
    if (cp.commercial_name) costProfilesMap[cp.satellite_user_id] = cp.commercial_name;
  });

  const satellitesList = (satProfiles ?? []).map((s: any) => ({
    id: s.id,
    email: s.email,
    full_name: costProfilesMap[s.id] || s.full_name || "Taller Satélite",
  }));

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">Nueva orden de corte</h1>
      <p className="mt-1 text-slate-400">
        Define la matriz de tendido por talla y color. Generamos los atados con
        código unívoco y sus QR para imprimir.
      </p>
      <div className="mt-8">
        <NewOrderForm
          garments={(garments ?? []) as GarmentsRow[]}
          preselectedGarment={garmentParam ?? null}
          satellites={satellitesList}
        />
      </div>
    </div>
  );
}
