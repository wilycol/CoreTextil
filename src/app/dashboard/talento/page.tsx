import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TalentoClient from "./TalentoClient";

export type FreeOperator = {
  id: string;
  full_name: string;
  email: string;
  phone_whatsapp: string | null;
  years_of_experience: number;
  specialties: string[];
  machines: string[];
};

export default async function TalentoPage() {
  const { profile } = await getSession();
  const supabase = await createClient();

  if (profile.role !== "satellite_owner") {
    redirect("/dashboard");
  }

  // Obtenemos a los operarios libres cruzando profiles y operator_profiles
  const { data: operators, error } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      email,
      operator_profiles (
        phone_whatsapp,
        years_of_experience,
        specialties,
        machines
      )
    `)
    .eq("role", "operator")
    .is("satellite_owner_id", null);

  if (error) {
    console.error("Error fetching free operators:", error);
  }

  // Mapeamos los datos
  const freeOperators: FreeOperator[] = (operators || [])
    .filter((op: any) => op.operator_profiles !== null) // Solo mostramos los que han llenado su perfil
    .map((op: any) => ({
      id: op.id,
      full_name: op.full_name,
      email: op.email,
      phone_whatsapp: op.operator_profiles.phone_whatsapp,
      years_of_experience: op.operator_profiles.years_of_experience,
      specialties: op.operator_profiles.specialties || [],
      machines: op.operator_profiles.machines || [],
    }));

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-100">Bolsa de Empleo Interna</h1>
        <p className="mt-1 text-slate-400">
          Encuentra operarios libres en la plataforma. Filtra por especialidad o maquinaria, contacta por WhatsApp e invítalos a unirse a tu nómina.
        </p>
      </div>

      <TalentoClient operators={freeOperators} />
    </div>
  );
}
