import { getSession } from "@/lib/session";
import { getSupportTickets } from "./actions";
import SoporteClient from "./SoporteClient";

export const dynamic = "force-dynamic";

export default async function SoportePage() {
  const { profile } = await getSession();
  const tickets = await getSupportTickets();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
          💬 Mesa de Ayuda, Soporte & Feedback
        </span>
        <h1 className="text-2xl font-bold text-slate-100 mt-1">
          Centro de Soporte Técnico y Sugerencias
        </h1>
        <p className="text-sm text-slate-400">
          ¿Encontraste una falla, tienes dudas o quieres proponer una nueva función para CoreTextil? Estamos para ayudarte.
        </p>
      </div>

      <SoporteClient
        userRole={profile.role}
        userEmail={profile.email}
        userName={profile.full_name}
        initialTickets={tickets as any}
      />
    </div>
  );
}
