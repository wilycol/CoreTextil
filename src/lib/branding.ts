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
      "ADN de prenda con IA y órdenes de corte",
      "Acceso a la bolsa de satélites en Mi Red",
    ],
  },
  {
    id: "emprendedor",
    name: "Taller Emprendedor",
    priceCop: 120000,
    priceLabel: "$120.000",
    period: "COP / mes",
    audience: "Marcas en crecimiento",
    features: [
      "Hasta 3 satélites conectados",
      "Órdenes y atados QR ilimitados",
      "Resumen contable básico de liquidaciones",
      "Marketplace de satélites disponibles",
    ],
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
      "Hasta 10 satélites conectados",
      "ADN con IA (Vision Engine V2) ilimitado",
      "Métricas de telemetría y cuellos de botella",
      "Soporte contable para deducibilidad fiscal DIAN",
      "Prioridad en el Marketplace de Satélites",
    ],
  },
  {
    id: "planta",
    name: "Planta Industrial",
    priceCop: 550000,
    priceLabel: "$550.000",
    period: "COP / mes",
    audience: "Plantas de producción",
    features: [
      "Satélites e hilos de producción ilimitados",
      "Informes contables avanzados y exportación fiscal",
      "Análisis predictivo de capacidad instalada",
      "Soporte técnico dedicado 24/7",
    ],
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
      "Trabaja con 1 marca en la plataforma",
      "Escáner QR y Billetera de operarios",
      "Simulador de costos fijos (CFI)",
      "Registro en el Marketplace de Talento",
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
      "Marcas ilimitadas simultáneas",
      "Liquidación unificada de nómina a 1 clic",
      "Métricas de rendimiento por operario y proceso",
      "Exportación de comprobantes contables de destajo",
      "Publicación de capacidad ociosa en el Marketplace",
    ],
  },
];
