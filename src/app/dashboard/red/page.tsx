import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import RedClient from "./RedClient";

export const dynamic = "force-dynamic";

export default async function RedPage() {
  const { profile } = await getSession();
  const supabase = await createClient();

  if (profile.role !== "brand_admin" && profile.role !== "designer" && profile.role !== "cutter") {
    redirect("/dashboard");
  }

  // Fetch the satellites linked to this brand via brand_tenant_id
  const { data: links } = await supabase
    .from("satellite_links")
    .select("created_at, satellite_user_id, profiles!satellite_links_satellite_user_id_fkey(full_name, email, avatar_url)")
    .eq("brand_tenant_id", profile.tenant_id);

  const satelliteUserIds = (links ?? []).map((l: any) => l.satellite_user_id);
  
  let costProfilesMap: Record<string, any> = {};
  if (satelliteUserIds.length > 0) {
    const { data: costProfiles } = await supabase
      .from("satellite_cost_profiles")
      .select("satellite_user_id, commercial_name, logo_url, max_operators, available_machines")
      .in("satellite_user_id", satelliteUserIds);
      
    (costProfiles ?? []).forEach((cp: any) => {
      costProfilesMap[cp.satellite_user_id] = cp;
    });
  }

  const satellites = (links ?? []).map((l: any) => {
    const cp = costProfilesMap[l.satellite_user_id];
    return {
      id: l.satellite_user_id,
      name: cp?.commercial_name || l.profiles?.full_name || "Taller Satélite",
      owner_name: l.profiles?.full_name || "Desconocido",
      email: l.profiles?.email || "",
      logo_url: cp?.logo_url || l.profiles?.avatar_url || null,
      max_operators: cp?.max_operators || 0,
      is_configured: Boolean(cp?.commercial_name),
      joined_at: l.created_at,
    };
  });

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Mi Red de Talleres</h1>
          <p className="mt-1 text-slate-400">
            Administra los talleres satélite que están vinculados a tu marca.
          </p>
        </div>
      </div>
      <RedClient satellites={satellites} />
    </div>
  );
}
