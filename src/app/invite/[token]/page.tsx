import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import AcceptInviteButton from "./AcceptInviteButton";

export default async function InvitePage({ params }: { params: { token: string } }) {
  const supabase = await createClient();
  const token = params.token;

  // 1. Validar la invitación públicamente
  const { data: invite, error } = await supabase
    .from("invitations")
    .select("*, inviter:profiles!inviter_id(full_name, role)")
    .eq("token", token)
    .single();

  if (error || !invite) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-400">Enlace Inválido</h1>
          <p className="mt-2 text-slate-400">Esta invitación no existe, ha expirado, o ya fue utilizada.</p>
        </div>
      </main>
    );
  }

  // 2. Verificar si el usuario que hace clic está logueado
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // Redirigir al login y luego regresar aquí
    redirect(`/auth/login?next=/invite/${token}`);
  }

  // 3. Ya está logueado, mostrar pantalla de aceptación
  const isSatelliteInvite = invite.target_role === "satellite";
  const inviterName = invite.inviter?.full_name || "Un usuario";
  const roleText = isSatelliteInvite ? "Taller Satélite" : "Operario / Costurero";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-emerald-900/50 bg-emerald-950/20 p-8 text-center shadow-xl backdrop-blur-sm">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-900/50 text-emerald-400">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold">¡Tienes una invitación!</h1>
        <p className="mt-4 text-slate-300">
          <strong className="text-white">{inviterName}</strong> te ha invitado a unirte a su red como <strong className="text-emerald-400">{roleText}</strong>.
        </p>

        <p className="mt-2 text-sm text-slate-500">
          Al aceptar, quedarás vinculado a su cuenta y podrás empezar a trabajar inmediatamente.
        </p>

        <div className="mt-8">
          <AcceptInviteButton token={token} />
        </div>
      </div>
    </main>
  );
}
