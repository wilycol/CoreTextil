import Link from "next/link";
import PacOperarioGame from "@/components/pac-operario/PacOperarioGame";

export const metadata = {
  title: "🎮 Pac-Operario · CoreTextil",
};

export default function PacGamePage() {
  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🎮 Pac-Operario</h1>
          <p className="mt-1 text-sm text-slate-400">
            Aprende a usar tu Cuaderno Digital jugando: 4 niveles cortos y la
            app real se queda para siempre contigo.
          </p>
        </div>
        <Link
          href="/dashboard/operario"
          className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-cyan-500 hover:text-cyan-300"
        >
          ← Mi Cuaderno
        </Link>
      </div>
      <PacOperarioGame />
    </div>
  );
}
