import Link from "next/link";
import { getSession } from "@/lib/session";
import SignOutButton from "./SignOutButton";
import GlobalBackButton from "./GlobalBackButton";

const ROLE_LABEL: Record<string, string> = {
  brand_admin: "Marca",
  designer: "Diseñador",
  cutter: "Corte",
  satellite_owner: "Taller satélite",
  operator: "Operario",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await getSession();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-4">
            <GlobalBackButton />
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <img
                src="/logo.png"
                alt="CoreTextil"
                className="h-8 w-auto object-contain transition-transform group-hover:scale-105"
              />
            </Link>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-cyan-300">
              {ROLE_LABEL[profile.role] ?? profile.role}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-slate-400 sm:inline">
              {profile.full_name}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
