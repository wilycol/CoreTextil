import { getSession } from "@/lib/session";
import { checkAIQuota } from "@/lib/services/aiQuota";
import GarmentForm from "./GarmentForm";

export default async function NewGarmentPage() {
  const { profile } = await getSession();
  const quota = await checkAIQuota(profile);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">ADN de prenda (Vision Engine IA)</h1>
          <p className="mt-1 text-slate-400 text-sm">
            Toma o sube una foto de la prenda y nuestra IA extraerá el despiece, la ruta de máquinas y los tiempos SAM al instante.
          </p>
        </div>
        <div className="self-start sm:self-center">
          {quota.limit === "unlimited" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
              ⚡ IA Ilimitada
            </span>
          ) : (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                quota.allowed
                  ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-300"
              }`}
            >
              🤖 Cuota IA: {quota.remaining}/{quota.limit} semanal
            </span>
          )}
        </div>
      </div>

      <div className="mt-8">
        <GarmentForm initialQuota={quota} />
      </div>
    </div>
  );
}
