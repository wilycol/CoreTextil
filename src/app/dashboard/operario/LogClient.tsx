"use client";

import { useMemo, useState, useTransition } from "react";
import { formatCop } from "@/lib/cop";
import { logProduction } from "./actions";
import { requestChangeAction, decideChangeAction } from "./changeActions";
import ManualLogbook from "./ManualLogbook";

export type LogRow = {
  id: string;
  loggedAt: string;
  units: number;
  earned: number;
  bundleCode: string | null;
  size: string | null;
  color: string | null;
  operationName: string | null;
  machine: string | null;
  rate: number | null;
  operatorId: string;
  operatorName: string | null;
  isMine: boolean;
};

export type ChangeRequestRow = {
  id: string;
  logId: string;
  changeType: "edit_units" | "delete";
  newUnits: number;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  requestedByName: string;
  bundleCode: string | null;
  currentUnits: number | null;
};

export type MarkingData = {
  role: string;
  walletToday: number;
  piecesToday: number;
  orders: { id: string; label: string; garmentId: string }[];
  bundles: {
    id: string;
    orderId: string;
    code: string;
    size: string;
    color: string;
    units: number;
  }[];
  operations: {
    id: string;
    garmentId: string;
    name: string;
    machine: string;
    rate: number;
  }[];
  done: Record<string, number>; // "bundleId:opId" -> unidades del equipo
  operators?: { id: string; full_name: string }[];
  isAffiliated: boolean;
  logbookLogs: LogRow[];
  pendingRequests: ChangeRequestRow[];
  recentRequests: ChangeRequestRow[];
};

const MACHINE_LABEL: Record<string, string> = {
  plana: "Plana",
  fileteadora: "Fileteadora",
  collarin: "Collarín",
};

export default function LogClient({
  data,
  preselectedCode,
  manualKeySuffix,
}: {
  data: MarkingData;
  preselectedCode?: string | null;
  manualKeySuffix?: string | null;
}) {
  // Clave de almacenamiento del cuaderno manual (por usuario, evita mezclar
  // roles en el mismo navegador)
  const manualStorageKey = `coretextil_manual_${manualKeySuffix ?? "libre"}`;
  const preselect = data.bundles.find((b) => b.code === preselectedCode);

  // Si se llega desde un escaneo QR (?bundle=CODE), abre directamente Marcación.
  // El dueño del taller ve además la pestaña de Solicitudes de su equipo.
  const isOwner = data.role === "satellite_owner";
  const [tab, setTab] = useState<"manual" | "marcacion" | "solicitudes">(
    preselect ? "marcacion" : "manual"
  );

  // Operario libre (sin órdenes ni taller): cuaderno manual a pantalla completa
  if (data.orders.length === 0 && !data.isAffiliated) {
    return (
      <ManualLogbook
        storageKey={manualStorageKey}
        variant="personal"
        title="📖 Mi Cuaderno de Destajo (Uso Personal)"
        subtitle="Formulario global para cualquier prenda: franela, camiseta, pantalón, short… Puedes sumar y restar piezas. Es 100% tuyo."
      />
    );
  }

  // Vista con pestañas: Cuaderno Digital (manual) primero, Marcación de Atados segundo
  return (
    <div className="space-y-6">
      <div className="flex rounded-xl border border-slate-800 bg-slate-950 p-1">
        <button
          type="button"
          onClick={() => setTab("manual")}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-bold transition ${
            tab === "manual"
              ? "bg-cyan-600 text-white shadow-md shadow-cyan-950/50"
              : "text-slate-400 hover:text-white"
          }`}
        >
          📖 Cuaderno Digital
        </button>
        <button
          type="button"
          onClick={() => setTab("marcacion")}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-bold transition ${
            tab === "marcacion"
              ? "bg-cyan-600 text-white shadow-md shadow-cyan-950/50"
              : "text-slate-400 hover:text-white"
          }`}
        >
          ⚙️ Marcación de Atados
        </button>
        {isOwner && (
          <button
            type="button"
            onClick={() => setTab("solicitudes")}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-bold transition ${
              tab === "solicitudes"
                ? "bg-amber-600 text-white shadow-md shadow-amber-950/50"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🕊️ Solicitudes ({data.pendingRequests.length})
          </button>
        )}
      </div>

      {tab === "manual" && (
        <ManualLogbook
          storageKey={manualStorageKey}
          variant={data.role === "satellite_owner" ? "own" : "personal"}
          title={
            data.role === "satellite_owner"
              ? "📖 Mi Producción Propia (Cuaderno del Taller)"
              : "📖 Cuaderno Digital de Destajo"
          }
          subtitle={
            data.role === "satellite_owner"
              ? "Anota aquí TU propio trabajo de ensamblaje, además del trabajo de tu equipo en Marcación. Mismo formulario global: sumar, restar, foto y WhatsApp."
              : "Formulario global para cualquier prenda: franela, camiseta, pantalón, short… Suma o resta piezas con foto y cuenta de cobro."
          }
        />
      )}
      {tab === "marcacion" && (
        <MarkingPanel data={data} preselectedCode={preselectedCode} />
      )}
      {tab === "solicitudes" && isOwner && <AffiliatedLogbook data={data} />}
    </div>
  );
}

/* Panel de marcación clásico (antes era todo el componente LogClient) */
function MarkingPanel({
  data,
  preselectedCode,
}: {
  data: MarkingData;
  preselectedCode?: string | null;
}) {
  const preselect = data.bundles.find((b) => b.code === preselectedCode);
  const [wallet, setWallet] = useState(data.walletToday);
  const [pieces, setPieces] = useState(data.piecesToday);
  const [done, setDone] = useState(data.done);
  const [orderId, setOrderId] = useState(preselect?.orderId ?? data.orders[0]?.id ?? "");
  const [bundleId, setBundleId] = useState<string | null>(preselect?.id ?? null);
  const [opId, setOpId] = useState<string | null>(null);
  const [operatorId, setOperatorId] = useState<string>("");
  const [custom, setCustom] = useState("1");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const orderBundles = useMemo(
    () => data.bundles.filter((b) => b.orderId === orderId),
    [data.bundles, orderId]
  );
  const bundle = orderBundles.find((b) => b.id === bundleId) ?? null;
  const garmentOps = useMemo(
    () =>
      bundle
        ? data.operations.filter(
            (o) =>
              o.garmentId ===
              data.orders.find((x) => x.id === bundle.orderId)?.garmentId
          )
        : [],
    [bundle, data.operations, data.orders]
  );
  const op = garmentOps.find((o) => o.id === opId) ?? null;

  const remaining = bundle && op
    ? Math.max(0, bundle.units - (done[`${bundle.id}:${op.id}`] ?? 0))
    : 0;

  function mark(units: number) {
    if (!bundle || !op) return;
    if (units <= 0) return setError("Cantidad inválida.");
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await logProduction(bundle.id, op.id, units, operatorId || undefined);
      if (res.ok) {
        const key = `${bundle.id}:${op.id}`;
        setDone((d) => ({ ...d, [key]: (d[key] ?? 0) + units }));
        setWallet((w) => w + res.earned);
        setPieces((p) => p + units);
        setMessage(`+${units} · ${formatCop(res.earned)} a tu billetera`);
      } else {
        setError(res.error ?? "No se pudo registrar.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Billetera del día */}
      <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-emerald-800 bg-emerald-950/40 p-5">
        <div>
          <p className="text-xs text-emerald-300/80">Ganado hoy</p>
          <p className="text-3xl font-extrabold text-emerald-300">
            {formatCop(wallet)}
          </p>
        </div>
        <div className="text-emerald-200/80">
          <p className="text-xs">Piezas de hoy</p>
          <p className="text-xl font-bold">{pieces}</p>
        </div>
      </div>

      {/* Paso 1: orden */}
      <label className="block text-sm">
        <span className="mb-1 block text-slate-400">1 · Orden</span>
        <select
          value={orderId}
          onChange={(e) => {
            setOrderId(e.target.value);
            setBundleId(null);
            setOpId(null);
          }}
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 focus:border-cyan-500 focus:outline-none"
        >
          {data.orders.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      {/* Selector de operario si es jefe */}
      {data.role === "satellite_owner" && data.operators && data.operators.length > 0 && (
        <label className="block text-sm">
          <span className="mb-1 block text-slate-400">Operario a marcar</span>
          <select
            value={operatorId}
            onChange={(e) => setOperatorId(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 focus:border-cyan-500 focus:outline-none"
          >
            <option value="">A mi nombre</option>
            {data.operators.map((op) => (
              <option key={op.id} value={op.id}>
                {op.full_name}
              </option>
            ))}
          </select>
        </label>
      )}

      {/* Paso 2: atado */}
      {orderId && (
        <div>
          <span className="mb-2 block text-sm text-slate-400">2 · Atado</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {orderBundles.map((b) => {
              const active = b.id === bundleId;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setBundleId(b.id);
                    setOpId(null);
                  }}
                  className={`rounded-xl border p-3 text-left transition ${
                    active
                      ? "border-cyan-500 bg-cyan-950/60 font-semibold text-cyan-200"
                      : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <p className="font-mono text-xs">{b.code}</p>
                  <p className="text-xs text-slate-400">
                    {b.size} · {b.color} · {b.units} uds
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Paso 3: operación */}
      {bundle && (
        <div>
          <span className="mb-2 block text-sm text-slate-400">
            3 · Operación (atado {bundle.code})
          </span>
          <div className="space-y-2">
            {garmentOps.map((o) => {
              const active = o.id === opId;
              const key = `${bundle.id}:${o.id}`;
              const doneUnits = done[key] ?? 0;
              const left = Math.max(0, bundle.units - doneUnits);

              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setOpId(o.id)}
                  className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${
                    active
                      ? "border-cyan-500 bg-cyan-950/60 text-cyan-200"
                      : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <div>
                    <p className="font-semibold">{o.name}</p>
                    <p className="text-xs text-slate-400">
                      {MACHINE_LABEL[o.machine] ?? o.machine} ·{" "}
                      {formatCop(o.rate)} / ud
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-bold text-cyan-300">
                      {doneUnits} / {bundle.units}
                    </p>
                    <p className="text-slate-400">quedan {left}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Botones de marcación */}
      {bundle && op && (
        <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-xs font-semibold text-cyan-300">
              Marcando {bundle.code} · {op.name} ({formatCop(op.rate)})
            </p>
            <p className="text-xs text-slate-400">Tope disponible: {remaining} uds</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[10, 25, 50].map((step) => (
              <button
                key={step}
                type="button"
                disabled={pending || step > remaining}
                onClick={() => mark(step)}
                className="flex-1 rounded-xl bg-cyan-600 py-3 text-lg font-bold text-white transition hover:bg-cyan-500 disabled:opacity-40"
              >
                +{step}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="number"
              min={1}
              max={remaining}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              className="w-24 rounded-xl border border-slate-700 bg-slate-950 p-2 text-center text-slate-100"
            />
            <button
              type="button"
              disabled={pending}
              onClick={() => mark(Number(custom))}
              className="flex-1 rounded-xl bg-slate-800 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 disabled:opacity-40"
            >
              {pending ? "Guardando…" : "Marcar cantidad"}
            </button>
          </div>

          {message && (
            <p className="text-xs font-semibold text-emerald-400">{message}</p>
          )}
          {error && <p className="text-xs font-semibold text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   CUADERNO DIGITAL para operarios/jefes AFILIADOS a un taller.
   Historial de daily_production_logs con doble confirmación:
   el operario solicita corregir/eliminar y el dueño del taller
   aprueba o rechaza. Nada cambia con una sola parte.
   ============================================================ */
function AffiliatedLogbook({ data }: { data: MarkingData }) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [editLog, setEditLog] = useState<LogRow | null>(null);
  const [editUnits, setEditUnits] = useState("");
  const [editReason, setEditReason] = useState("");

  const isOwner = data.role === "satellite_owner";
  const todayStr = new Date().toISOString().slice(0, 10);
  const myLogs = data.logbookLogs.filter((l) => l.loggedAt === todayStr);
  const walletToday = myLogs.reduce((acc, l) => acc + l.earned, 0);
  const piecesToday = myLogs.reduce((acc, l) => acc + l.units, 0);

  function submitRequest(log: LogRow, type: "edit_units" | "delete", newUnits: number, reason: string) {
    setFeedback(null);
    startTransition(async () => {
      const res = await requestChangeAction(log.id, type, newUnits, reason);
      if (res.ok) {
        setEditLog(null);
        setEditUnits("");
        setEditReason("");
        setFeedback({
          ok: true,
          text:
            type === "delete"
              ? "Solicitud de eliminación enviada. El dueño del taller debe confirmarla."
              : "Solicitud de corrección enviada. El dueño del taller debe confirmarla.",
        });
      } else {
        setFeedback({ ok: false, text: res.error ?? "No se pudo enviar la solicitud." });
      }
    });
  }

  function decide(requestId: string, decision: "approved" | "rejected") {
    setFeedback(null);
    startTransition(async () => {
      const res = await decideChangeAction(requestId, decision);
      if (res.ok) {
        setFeedback({ ok: true, text: decision === "approved" ? "Cambio aplicado." : "Solicitud rechazada." });
        // Recarga completa para reflejar el log ajustado/eliminado
        window.location.reload();
      } else {
        setFeedback({ ok: false, text: res.error ?? "No se pudo procesar la decisión." });
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Billetera del día */}
      <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-emerald-800 bg-emerald-950/40 p-5">
        <div>
          <p className="text-xs text-emerald-300/80">Ganado hoy</p>
          <p className="text-3xl font-extrabold text-emerald-300">{formatCop(walletToday)}</p>
        </div>
        <div className="text-emerald-200/80">
          <p className="text-xs">Piezas de hoy</p>
          <p className="text-xl font-bold">{piecesToday}</p>
        </div>
        <p className="ml-auto max-w-xs text-[11px] leading-snug text-slate-400">
          Para corregir o eliminar una cuenta mal marcada, el operario solicita y el dueño del
          taller confirma. Ningún registro cambia con una sola parte.
        </p>
        <a
          href="/dashboard/operario/juego"
          className="rounded-full border border-amber-500/40 bg-amber-950/50 px-3 py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-900"
        >
          🎮 Aprende jugando
        </a>
      </div>

      {feedback && (
        <p className={`text-xs font-semibold ${feedback.ok ? "text-emerald-400" : "text-red-400"}`}>
          {feedback.text}
        </p>
      )}

      {/* Panel del dueño: solicitudes de mi equipo */}
      {isOwner && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-950/30 p-5">
          <h3 className="font-bold text-amber-200">
            🕊️ Solicitudes de corrección de mi equipo ({data.pendingRequests.length} pendientes)
          </h3>
          {data.pendingRequests.length === 0 ? (
            <p className="mt-2 text-xs text-slate-400">
              No hay solicitudes de cambio pendientes de tus operarios.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {data.pendingRequests.map((r) => (
                <div key={r.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs">
                  <p className="font-semibold text-slate-200">
                    {r.requestedByName} ·{" "}
                    {r.changeType === "delete"
                      ? "Eliminar anotación"
                      : `Corregir a ${r.newUnits} piezas`}
                    {r.bundleCode && <span className="text-slate-500"> · atado {r.bundleCode}</span>}
                  </p>
                  {r.reason && <p className="mt-1 text-slate-400">📝 {r.reason}</p>}
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => decide(r.id, "approved")}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 font-bold text-white hover:bg-emerald-500 disabled:opacity-40"
                    >
                      ✅ Aprobar
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => decide(r.id, "rejected")}
                      className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                    >
                      ✕ Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {data.recentRequests.length > 0 && (
            <p className="mt-3 text-[11px] text-slate-500">
              Últimas decididas: {data.recentRequests.slice(0, 3).map((r) => `${r.status === "approved" ? "✅" : "❌"} ${r.requestedByName}`).join(" · ")}
            </p>
          )}
        </div>
      )}

      {/* Historial con acciones de solicitud (solo anotaciones propias) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 className="mb-4 font-bold text-slate-200">
          Historial de anotaciones ({data.logbookLogs.length})
        </h3>
        {data.logbookLogs.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-500">
            Aún no hay anotaciones. Registra producción en la pestaña «Marcación de Atados».
          </p>
        ) : (
          <div className="max-h-96 space-y-2.5 overflow-y-auto">
            {data.logbookLogs.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 text-xs"
              >
                <div>
                  <p className="font-semibold text-slate-200">
                    {l.bundleCode ?? "Atado"} {l.size && `· ${l.size}`} {l.color && `· ${l.color}`}
                    {" · "}<span className="text-cyan-300">{l.operationName ?? "Operación"}</span>
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    {l.loggedAt}
                    {l.machine && ` · ${l.machine}`}
                    {l.operatorName && ` · ${l.operatorName}`}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <div>
                    <p className="text-sm font-extrabold text-emerald-400">+{formatCop(l.earned)}</p>
                    <p className="font-medium text-slate-400">{l.units} piezas</p>
                  </div>
                  {l.isMine && (
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          setEditLog(l);
                          setEditUnits(String(l.units));
                          setEditReason("");
                        }}
                        className="rounded-lg border border-cyan-500/40 px-2 py-0.5 text-[10px] font-bold text-cyan-300 hover:bg-cyan-950 disabled:opacity-40"
                      >
                        ✏️ Corregir
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => submitRequest(l, "delete", 0, "")}
                        className="rounded-lg border border-red-500/40 px-2 py-0.5 text-[10px] font-bold text-red-300 hover:bg-red-950 disabled:opacity-40"
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de corrección */}
      {editLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-100">
              ✏️ Solicitar corrección · {editLog.bundleCode ?? "Anotación"}
            </h3>
            <p className="text-xs text-slate-400">
              Registro actual: <strong className="text-slate-200">{editLog.units} piezas</strong> ·{" "}
              {formatCop(editLog.earned)}. Tu dueño de taller debe confirmar el cambio.
            </p>
            <label className="block text-xs">
              <span className="mb-1 block text-slate-400">Cantidad correcta (piezas)</span>
              <input
                type="number"
                min={1}
                value={editUnits}
                onChange={(e) => setEditUnits(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              />
            </label>
            <label className="block text-xs">
              <span className="mb-1 block text-slate-400">Motivo (visible para tu dueño)</span>
              <textarea
                rows={2}
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="Ej: me equivoqué contando, anoté el atado equivocado…"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => submitRequest(editLog, "edit_units", parseInt(editUnits) || 0, editReason)}
                className="flex-1 rounded-xl bg-cyan-600 py-2.5 text-sm font-bold text-white hover:bg-cyan-500 disabled:opacity-40"
              >
                Enviar solicitud
              </button>
              <button
                type="button"
                onClick={() => setEditLog(null)}
                className="rounded-xl border border-slate-800 px-4 py-2.5 text-sm text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

{/* Componente Tooltip interactivo (Hover + Click) */}
function Tooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex items-center ml-1.5 align-middle">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-slate-800 text-cyan-400 text-[10px] font-bold border border-cyan-500/40 hover:bg-cyan-950 hover:border-cyan-300 focus:outline-none transition-colors cursor-pointer"
        aria-label="Ver explicación de este campo"
      >
        ?
      </button>

      {open && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 rounded-xl border border-cyan-500/50 bg-slate-900/95 p-3 text-[11px] font-normal leading-relaxed text-slate-200 shadow-2xl shadow-cyan-950/90 backdrop-blur z-50 pointer-events-none block text-left">
          <span className="block font-bold text-cyan-300 mb-1">💡 ¿Para qué sirve?</span>
          {text}
        </span>
      )}
    </span>
  );
}

