import { getSession } from "@/lib/session";
import ScannerClient from "./ScannerClient";

export default async function ScanPage({
  searchParams,
}: {
  searchParams: Promise<{ bundle?: string }>;
}) {
  const { profile } = await getSession();
  const { bundle: bundleParam } = await searchParams;

  if (profile.role !== "satellite_owner" && profile.role !== "operator") {
    return (
      <p className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-slate-300">
        El escáner es para talleres satélite y sus operarios. Las marcas ven el
        avance desde sus órdenes.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold">Recibir atado con QR</h1>
      <p className="mt-1 text-slate-400">
        Apunta la cámara a la etiqueta impresa del atado. Al confirmarlo, el
        lote pasa a «En ensamble» y puedes empezar a marcar producción.
      </p>
      <div className="mt-8">
        <ScannerClient initialCode={bundleParam ?? null} />
      </div>
    </div>
  );
}
