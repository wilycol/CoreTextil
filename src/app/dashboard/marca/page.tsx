import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MarcaClient from "./MarcaClient";

export const dynamic = "force-dynamic";

export default async function ConfiguracionMarcaPage() {
  const { profile } = await getSession();
  const supabase = await createClient();

  if (profile.role !== "brand_admin" && profile.role !== "designer" && profile.role !== "cutter") {
    redirect("/dashboard");
  }

  // Obtener el perfil de la marca (Tenant)
  const { data: tenant } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", profile.tenant_id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-100">Configuración de Mi Marca</h1>
        <p className="mt-1 text-slate-400">
          Personaliza la identidad corporativa y visual de tu marca. Esta información aparecerá en las órdenes de corte y liquidaciones de tus talleres satélites.
        </p>
      </div>

      <MarcaClient initialData={tenant} />
    </div>
  );
}
