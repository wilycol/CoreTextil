export type Plan = {
  id: string;
  name: string;
  priceCop: number;
  priceLabel: string;
  period: string;
  audience: string;
  features: string[];
  highlight?: boolean;
};

export const BRAND_PLANS: Plan[] = [
  {
    id: "piloto",
    name: "Piloto de Adopción",
    priceCop: 0,
    priceLabel: "$0",
    period: "60 días",
    audience: "Marcas que arrancan",
    features: [
      "Acceso total por 60 días",
      "2 a 3 ciclos completos de corte",
      "ADN de prenda y órdenes de corte",
    ],
  },
  {
    id: "emprendedor",
    name: "Taller Emprendedor",
    priceCop: 120000,
    priceLabel: "$120.000",
    period: "COP / mes",
    audience: "Marcas en crecimiento",
    features: ["Hasta 3 satélites conectados", "Órdenes y atados ilimitados"],
  },
  {
    id: "pro",
    name: "Marca Pro",
    priceCop: 280000,
    priceLabel: "$280.000",
    period: "COP / mes",
    audience: "Marcas consolidadas",
    highlight: true,
    features: [
      "Hasta 10 satélites",
      "ADN con IA ilimitado",
      "Telemetría en vivo",
    ],
  },
  {
    id: "planta",
    name: "Planta Industrial",
    priceCop: 550000,
    priceLabel: "$550.000",
    period: "COP / mes",
    audience: "Plantas de producción",
    features: ["Satélites ilimitados", "Reportes contables"],
  },
];

export const SATELLITE_PLANS: Plan[] = [
  {
    id: "monomarca",
    name: "Satélite Monomarca",
    priceCop: 0,
    priceLabel: "$0",
    period: "Gratis para siempre",
    audience: "Un solo taller satélite",
    features: [
      "Trabaja con una sola marca en la plataforma",
      "Liquidación de operarios a un clic",
    ],
  },
  {
    id: "pro",
    name: "Satélite Pro",
    priceCop: 50000,
    priceLabel: "$50.000",
    period: "COP / mes · o $450.000 al año",
    audience: "Talleres multi-marca",
    highlight: true,
    features: [
      "2 o más marcas simultáneas",
      "Liquidación unificada de operarios",
      "Control global del taller",
    ],
  },
];
