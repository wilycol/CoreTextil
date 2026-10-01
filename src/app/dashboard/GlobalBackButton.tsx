"use client";

import { useRouter, usePathname } from "next/navigation";

export default function GlobalBackButton() {
  const router = useRouter();
  const pathname = usePathname();

  // No mostrar en el dashboard principal
  if (pathname === "/dashboard") {
    return null;
  }

  return (
    <button
      onClick={() => router.back()}
      className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors mr-2"
      aria-label="Volver"
      title="Volver"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m15 18-6-6 6-6" />
      </svg>
    </button>
  );
}
