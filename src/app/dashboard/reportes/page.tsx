import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { formatCop } from "@/lib/cop";

type MonthRow = {
  key: string; // "2026-09"
  label: string;
  liquidations: number;
  units: number;
  paidCop: number;
  ticketsResolved: number;
};

const MONTHS_SHORT = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function ReportsPage() {
  const { profile } = await getSession();
  const supabase = await createClient();

  if (!["brand_admin", "designer", "cutter"].includes(profile.role) || !profile.tenant_id) {
    return (
      <p className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-slate-300">
        Los reportes contables son para marcas y diseñadores.
      </p>
    );
  }

  // Ventana: últimos 12 meses (incluido el actual)
  const now = new Date();
  const months: { key: string; label: string }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: monthKey(d),
      label: `${MONTHS_SHORT[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
    });
  }
  const firstMonthStart = `${months[0].key}-01`;

  // Liquidaciones de mi marca en la ventana
  const { data: liquidations } = await supabase
    .from("order_liquidations")
    .select("total_cop, units_delivered, satellite_name, created_at")
    .eq("tenant_id", profile.tenant_id)
    .gte("created_at", firstMonthStart);

  // Tickets resueltos en la ventana
  const { data: tickets } = await supabase
    .from("material_tickets")
    .select("status, created_at")
    .eq("tenant_id", profile.tenant_id)
    .gte("created_at", firstMonthStart);

  const byMonth = new Map<string, MonthRow>();
  for (const m of months) {
    byMonth.set(m.key, {
      key: m.key,
      label: m.label,
      liquidations: 0,
      units: 0,
      paidCop: 0,
      ticketsResolved: 0,
    });
  }

  for (const l of (liquidations ?? []) as any[]) {
    const key = String(l.created_at).slice(0, 7);
    const row = byMonth.get(key);
    if (!row) continue;
    row.liquidations += 1;
    row.units += Number(l.units_delivered);
    row.paidCop += Number(l.total_cop);
  }

  for (const t of (tickets ?? []) as any[]) {
    if (t.status !== "resolved") continue;
    const row = byMonth.get(String(t.created_at).slice(0, 7));
    if (row) row.ticketsResolved += 1;
  }

  const rows = months.map((m) => byMonth.get(m.key)!);
  const totalPaid = rows.reduce((a, r) => a + r.paidCop, 0);
  const totalUnits = rows.reduce((a, r) => a + r.units, 0);
  const totalLiq = rows.reduce((a, r) => a + r.liquidations, 0);
  const totalTickets = rows.reduce((a, r) => a + r.ticketsResolved, 0);

  // Top satélites por pagado en la ventana
  const bySatellite = new Map<string, number>();
  for (const l of (liquidations ?? []) as any[]) {
    const name = l.satellite_name ?? "Sin satélite";
    bySatellite.set(name, (bySatellite.get(name) ?? 0) + Number(l.total_cop));
  }
  const topSatellites = [...bySatellite.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const maxPaid = Math.max(1, ...rows.map((r) => r.paidCop));

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold">Reportes contables</h1>
      <p className="mt-1 text-slate-400">
        Últimos 12 meses: lo pagado por corte a tus satélites, órdenes
        liquidadas y tickets de faltantes resueltos.
      </p>

      {/* Resumen */}
      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs text-slate-400">Total pagado (12m)</p>
          <p className="mt-1 text-xl font-extrabold text-emerald-300">
            {formatCop(totalPaid)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs text-slate-400">Prendas liquidadas</p>
          <p className="mt-1 text-xl font-extrabold">{totalUnits}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs text-slate-400">Órdenes liquidadas</p>
          <p className="mt-1 text-xl font-extrabold">{totalLiq}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs text-slate-400">Tickets resueltos</p>
          <p className="mt-1 text-xl font-extrabold text-cyan-300">{totalTickets}</p>
        </div>
      </div>

      {/* Tabla mensual con barra */}
      <div className="mt-8 overflow-hidden rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-left text-slate-400">
            <tr>
              <th className="px-4 py-3">Mes</th>
              <th className="text-right">Órdenes</th>
              <th className="text-right">Prendas</th>
              <th className="text-right">Tickets</th>
              <th className="text-right">Pagado</th>
              <th className="w-40">Distribución</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-slate-800">
                <td className="px-4 py-2.5 font-semibold text-slate-200">
                  {r.label}
                </td>
                <td className="text-right text-slate-300">{r.liquidations}</td>
                <td className="text-right text-slate-300">{r.units}</td>
                <td className="text-right text-cyan-300">{r.ticketsResolved}</td>
                <td className="text-right font-semibold text-emerald-300">
                  {r.paidCop > 0 ? formatCop(r.paidCop) : "—"}
                </td>
                <td className="px-2">
                  <div className="h-2 w-full rounded-full bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-cyan-500"
                      style={{ width: `${Math.round((r.paidCop / maxPaid) * 100)}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Top satélites */}
      {topSatellites.length > 0 && (
        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-sm font-semibold text-slate-300">
            Mayores pagos por satélite (12 meses)
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {topSatellites.map(([name, paid]) => (
              <li key={name} className="flex items-center justify-between gap-4">
                <span className="text-slate-300">{name}</span>
                <b className="text-emerald-300">{formatCop(paid)}</b>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            Los nombres quedan guardados en cada liquidación: el histórico no
            cambia aunque un taller se desvincule después.
          </p>
        </div>
      )}
    </div>
  );
}
