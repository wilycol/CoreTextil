import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import RedClient from "./RedClient";

export default async function RedPage() {
  const { profile } = await getSession();
  const supabase = await createClient();

  if (profile.role !== "brand_admin" && profile.role !== "designer" && profile.role !== "cutter") {
    redirect("/dashboard");
  }

  // Fetch the satellites linked to this brand
  const { data: links } = await supabase
    .from("satellite_links")
    .select("created_at, satellite_user_id, profiles!satellite_links_satellite_user_id_fkey(full_name, email)")
    .eq("tenant_id", profile.tenant_id);

  const satellites = (links ?? []).map((l: any) => ({
    id: l.satellite_user_id,
    name: l.profiles?.full_name || "Desconocido",
    email: l.profiles?.email || "",
    joined_at: l.created_at,
  }));

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
