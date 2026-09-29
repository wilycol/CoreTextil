"use client";

export default function PrintHint() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500 print:hidden"
    >
      🖨 Imprimir ficha técnica
    </button>
  );
}
