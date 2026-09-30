import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import InviteButton from "./InviteButton";

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
];

const SATELLITE_CARDS: Card[] = [
  {
    href: "/dashboard/escanear",
    title: "Escanear atado (QR)",
    text: "Apunta la cámara a la etiqueta impresa para recibir el bulto y pasar el lote a «En ensamble».",
  },
  {
    href: "/dashboard/satelite",
    title: "Mi taller",
    text: "Registra tus costos fijos, calcula tu CFI y simula la rentabilidad de un corte antes de aceptarlo.",
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

  if (profile.role === "brand_admin" || profile.role === "designer" || profile.role === "cutter") {
    cards = BRAND_CARDS;
    const { data: tenant } = await supabase.from("tenants").select("name").eq("id", profile.tenant_id).single();
    if (tenant) linkInfo = `🏢 Marca: ${tenant.name} | ID: ${profile.tenant_id}`;
  } else if (profile.role === "satellite_owner") {
    cards = SATELLITE_CARDS;
    const { data: links } = await supabase
      .from("satellite_links")
      .select("tenants(name)")
      .eq("satellite_user_id", profile.id);
    
    if (links && links.length > 0) {
      const names = links.map((l: any) => l.tenants?.name).join(", ");
      linkInfo = `🤝 Vinculado a Marcas: ${names}`;
    } else {
      linkInfo = "⚠️ Taller Satélite Independiente (Sin marca vinculada aún)";
    }
  } else if (profile.role === "operator") {
    cards = OPERATOR_CARDS;
    if (profile.satellite_owner_id) {
      const { data: boss } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", profile.satellite_owner_id)
        .single();
      linkInfo = `🏭 Trabajando para el taller satélite de: ${boss?.full_name || "Desconocido"}`;
    } else {
      linkInfo = "💼 Operario Libre (Buscando taller)";
    }
  } else {
    redirect("/onboarding");
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Hola, {profile.full_name}</h1>
          <p className="mt-1 text-slate-400">
            {profile.role === "operator"
              ? "Tu taller y tus ganancias, siempre a la mano."
              : "El estado de tu producción textil en un solo lugar."}
          </p>
          {linkInfo && (
            <p className="mt-2 text-sm font-medium text-cyan-400 bg-cyan-900/20 inline-block px-3 py-1 rounded-md border border-cyan-800/50">
              {linkInfo}
            </p>
          )}
        </div>
        {profile.role !== "operator" && <InviteButton role={profile.role} />}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-cyan-500 hover:bg-slate-900"
          >
            <h2 className="font-semibold text-cyan-300">{c.title}</h2>
            <p className="mt-2 text-sm text-slate-400">{c.text}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
