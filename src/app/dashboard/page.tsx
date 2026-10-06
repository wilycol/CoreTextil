import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import InviteButton from "./InviteButton";
import SetupReminderBanner from "./SetupReminderBanner";

type Card = {
  href: string;
  title: string;
  text: string;
};

const BRAND_CARDS: Card[] = [
  {
    href: "/dashboard/nueva-prenda",
    title: "ADN de prenda",
    text: "Crea prendas con despiece, ruta de máquinas, tiempos SAM y tarifas sugeridas (con foto y IA).",
  },
  {
    href: "/dashboard/prendas",
    title: "Fichas técnicas",
    text: "Catálogo de prendas con ficha imprimible: despiece, ruta de máquinas y costos para anexar al corte.",
  },
  {
    href: "/dashboard/reportes",
    title: "Reportes contables",
    text: "Últimos 12 meses: pagado por corte, órdenes liquidadas y tickets resueltos, mes a mes.",
  },
  {
    href: "/dashboard/ordenes",
    title: "Órdenes de corte",
    text: "Emite órdenes con matriz de tendido, atados unívocos y códigos QR para imprimir.",
  },
  {
    href: "/dashboard/tickets",
    title: "Mesa de reposición",
    text: "Atiende tickets de faltantes de tus satélites y despacha reposiciones.",
  },
  {
    href: "/dashboard/ordenes",
    title: "Liquidar por corte",
    text: "Paga a tus satélites por prendas entregadas: entregadas vs por ensamblar, a un clic.",
  },
  {
    href: "/dashboard/red",
    title: "Mi red de talleres",
    text: "Visualiza, invita y administra los talleres satélite vinculados a tu marca.",
  },
  {
    href: "/dashboard/marca",
    title: "Configuración de Marca",
    text: "Administra tu identidad corporativa, nombre comercial, NIT y datos de contacto.",
  },
];

const SATELLITE_CARDS: Card[] = [
  {
    href: "/dashboard/escanear",
    title: "Escanear atado (QR)",
    text: "Apunta la cámara a la etiqueta impresa para recibir el bulto y pasar el lote a «En ensamble».",
  },
  {
    href: "/dashboard/red",
    title: "Mi red",
    text: "Marcas afiliadas, órdenes activas en tu taller y cuadrilla de operarios a destajo.",
  },
  {
    href: "/dashboard/satelite",
    title: "Mi taller",
    text: "Registra tus costos fijos, calcula tu CFI y simula la rentabilidad de un corte antes de aceptarlo.",
  },
  {
    href: "/dashboard/talento",
    title: "Bolsa de Operarios",
    text: "Busca costureros libres por especialidad o máquina y contáctalos para tu taller.",
  },
  {
    href: "/dashboard/operario",
    title: "Marcación de operarios",
    text: "Botones rápidos de destajo con tope estricto por atado y billetera del día.",
  },
  {
    href: "/dashboard/tickets",
    title: "Tickets de faltantes",
    text: "Valida los reportes de tus operarios y aprueba reposiciones hacia la marca.",
  },
  {
    href: "/dashboard/nomina",
    title: "Nómina de operarios",
    text: "Liquidación semanal o quincenal a un clic: piezas y destajo de cada operario, guardada como comprobante.",
  },
];

const OPERATOR_CARDS: Card[] = [
  {
    href: "/dashboard/escanear",
    title: "Escanear atado (QR)",
    text: "Recibe el bulto apuntando a su etiqueta y empieza a marcar de inmediato.",
  },
  {
    href: "/dashboard/operario",
    title: "Marcar producción",
    text: "Registra tus piezas con botones rápidos y mira tus ganancias acumuladas.",
  },
  {
    href: "/dashboard/red",
    title: "Mi red de talleres",
    text: "Talleres satélites donde trabajas a destajo, historial por taller y billetera acumulada.",
  },
  {
    href: "/dashboard/operario/perfil",
    title: "Mi Perfil Técnico",
    text: "Configura tus especialidades, años de experiencia y máquinas que dominas.",
  },
  {
    href: "/dashboard/tickets",
    title: "Reportar faltante",
    text: "¿Falta una pieza o llegó tela dañada? Repórtalo con la nomenclatura del atado.",
  },
];

export default async function DashboardPage() {
  const { profile } = await getSession();
  const supabase = await createClient();

  let cards: Card[];
  let linkInfo = "";
  let avatarUrl: string | null = (profile as any)?.avatar_url || null;
  let bannerConfig: { isConfigured: boolean; missingMessage: string; actionUrl: string; actionText: string } | null = null;

  if (profile.role === "brand_admin" || profile.role === "designer" || profile.role === "cutter") {
    cards = BRAND_CARDS;
    const { data: tenant } = await supabase
      .from("tenants")
      .select("name, logo_url, nit_rut")
      .eq("id", profile.tenant_id)
      .maybeSingle();
      
    if (tenant) {
      linkInfo = `🏢 Marca: ${tenant.name}`;
      if (tenant.logo_url) avatarUrl = tenant.logo_url;
      if (!tenant.logo_url || !tenant.nit_rut) {
        bannerConfig = {
          isConfigured: false,
          missingMessage: "Tu marca aún no tiene registrado su NIT ni su logo corporativo. Complétalo para personalizar tus fichas técnicas.",
          actionUrl: "/dashboard/marca",
          actionText: "Configurar Mi Marca",
        };
      }
    }
  } else if (profile.role === "satellite_owner") {
    cards = SATELLITE_CARDS;

    // Obtener nombre comercial del taller y logo desde satellite_cost_profiles
    const { data: costProfile } = await supabase
      .from("satellite_cost_profiles")
      .select("commercial_name, logo_url")
      .eq("satellite_user_id", profile.id)
      .maybeSingle();

    const workshopName = costProfile?.commercial_name || "Mi Taller Satélite";
    if (costProfile?.logo_url) avatarUrl = costProfile.logo_url;

    if (!costProfile?.commercial_name) {
      bannerConfig = {
        isConfigured: false,
        missingMessage: "Tu taller satélite aún no tiene registrado su Nombre Comercial, maquinaria ni costos fijos. Complétalos para recibir órdenes de corte.",
        actionUrl: "/dashboard/satelite",
        actionText: "Configurar Mi Taller",
      };
    }

    // Obtener marcas vinculadas
    const { data: links } = await supabase
      .from("satellite_links")
      .select("tenants(name)")
      .eq("satellite_user_id", profile.id);
    
    if (links && links.length > 0) {
      const names = links.map((l: any) => l.tenants?.name).filter(Boolean).join(", ");
      linkInfo = `🏭 Taller: ${workshopName} | 🤝 Vinculado a Marcas: ${names}`;
    } else {
      linkInfo = `🏭 Taller: ${workshopName} (Independiente)`;
    }
  } else if (profile.role === "operator") {
    cards = OPERATOR_CARDS;
    if (profile.satellite_owner_id) {
      const [{ data: boss }, { data: workshopCost }] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name")
          .eq("id", profile.satellite_owner_id)
          .maybeSingle(),
        supabase
          .from("satellite_cost_profiles")
          .select("commercial_name")
          .eq("satellite_user_id", profile.satellite_owner_id)
          .maybeSingle(),
      ]);

      const workshopName = workshopCost?.commercial_name || (boss?.full_name ? `Taller de ${boss.full_name}` : "Desconocido");
      linkInfo = `🏭 Trabajando para el taller satélite: ${workshopName}`;
    } else {
      linkInfo = "💼 Operario Libre (Buscando taller)";
    }
  } else {
    redirect("/onboarding");
  }

  return (
    <div>
      {bannerConfig && (
        <SetupReminderBanner
          role={profile.role}
          isConfigured={bannerConfig.isConfigured}
          missingMessage={bannerConfig.missingMessage}
          actionUrl={bannerConfig.actionUrl}
          actionText={bannerConfig.actionText}
        />
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={profile.full_name}
              className="h-14 w-14 rounded-full border-2 border-cyan-500/50 object-cover shadow-lg shadow-cyan-500/10"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 border-2 border-slate-700 text-xl font-bold text-cyan-400">
              {profile.full_name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Hola, {profile.full_name}</h1>
            <p className="mt-0.5 text-slate-400 text-sm">
              {profile.role === "operator"
                ? "Tu taller y tus ganancias, siempre a la mano."
                : "El estado de tu producción textil en un solo lugar."}
            </p>
            {linkInfo && (
              <p className="mt-2 text-xs font-semibold text-cyan-300 bg-cyan-950/60 inline-block px-3 py-1 rounded-md border border-cyan-500/30 shadow-sm">
                {linkInfo}
              </p>
            )}
          </div>
        </div>
        {profile.role !== "operator" && <InviteButton role={profile.role} />}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-cyan-500 hover:bg-slate-900 shadow-md hover:shadow-cyan-500/5"
          >
            <h2 className="font-semibold text-cyan-300">{c.title}</h2>
            <p className="mt-2 text-sm text-slate-400">{c.text}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
