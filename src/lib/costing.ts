export type CostProfileInput = {
  rent_monthly: number;
  energy_monthly: number;
  consumables_monthly: number;
  maintenance_monthly: number;
  estimated_monthly_units: number;
};

// CFI = (Arriendo + Luz + Consumibles + Mantenimiento) / Capacidad mensual
export function fixedUnitCost(p: CostProfileInput): number {
  const capacity = Math.max(1, p.estimated_monthly_units);
  const total =
    p.rent_monthly + p.energy_monthly + p.consumables_monthly + p.maintenance_monthly;
  return total / capacity;
}

export type TrafficLight = {
  label: string;
  color: "green" | "yellow" | "red";
  cls: string;
};

export function profitabilityLight(netMarginPct: number): TrafficLight {
  if (netMarginPct >= 20) {
    return {
      label: "Rentable",
      color: "green",
      cls: "bg-emerald-950 text-emerald-300 border-emerald-700",
    };
  }
  if (netMarginPct >= 10) {
    return {
      label: "Ajustado",
      color: "yellow",
      cls: "bg-amber-950 text-amber-300 border-amber-700",
    };
  }
  return {
    label: "A pérdida",
    color: "red",
    cls: "bg-red-950 text-red-300 border-red-700",
  };
}

export type Simulation = {
  cfi: number;
  netPerUnit: number;
  netMarginPct: number;
  workerPool: number;
  light: TrafficLight;
};
