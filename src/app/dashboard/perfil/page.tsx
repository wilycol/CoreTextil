import { getSession } from "@/lib/session";
import AccountSettingsClient from "./AccountSettingsClient";

export const dynamic = "force-dynamic";

export default async function PerfilConfigPage() {
  const { profile } = await getSession();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
          ⚙️ Ajustes de Cuenta & Perfil
        </span>
        <h1 className="text-2xl font-bold text-slate-100 mt-1">
          Configuración de mi Cuenta
        </h1>
        <p className="text-sm text-slate-400">
          Administra la información de tu perfil, respaldos de datos, cambio de rol o eliminación de cuenta.
        </p>
      </div>

      <AccountSettingsClient
        userEmail={profile.email}
        currentRole={profile.role}
      />
    </div>
  );
}
