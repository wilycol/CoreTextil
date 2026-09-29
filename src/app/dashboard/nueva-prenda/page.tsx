import { getSession } from "@/lib/session";
import GarmentForm from "./GarmentForm";

export default async function NewGarmentPage() {
  const { profile } = await getSession();
  if (profile.role !== "brand_admin" && profile.role !== "designer") {
    return (
      <p className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-slate-300">
        Solo las marcas y diseñadores crean prendas.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">ADN de prenda</h1>
      <p className="mt-1 text-slate-400">
        Dinos qué prenda es y generamos el despiece, la ruta de máquinas y las
        tarifas sugeridas. Pronto: sube una foto y la IA hará el resto.
      </p>
      <div className="mt-8">
        <GarmentForm />
      </div>
    </div>
  );
}
