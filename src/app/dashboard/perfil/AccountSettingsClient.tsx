"use client";

import { useState, useTransition } from "react";
import { exportUserData, resetUserRole, deleteUserAccount } from "./account-actions";

export default function AccountSettingsClient({
  userEmail,
  currentRole,
}: {
  userEmail: string;
  currentRole: string;
}) {
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleConfirm, setRoleConfirm] = useState("");
  const [roleError, setRoleError] = useState<string | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [exitReason, setExitReason] = useState("Me equivoqué de tipo de cuenta");
  const [exitComments, setExitComments] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const roleLabels: Record<string, string> = {
    brand_admin: "🏷️ Marca / Administrador",
    satellite_owner: "🏭 Taller Satélite",
    operator: "🧵 Operario a Destajo",
    superadmin: "👑 SuperAdmin",
  };

  async function handleExportJSON() {
    setExportMessage(null);
    const res = await exportUserData();
    if (res.ok && res.data) {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `coretextil_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setExportMessage("✅ Respaldo JSON descargado correctamente en tu dispositivo.");
    }
  }

  function handleResetRole() {
    if (roleConfirm.trim() !== "CAMBIAR ROL") {
      return setRoleError("Debes escribir exactamente 'CAMBIAR ROL' en mayúsculas.");
    }
    setRoleError(null);

    startTransition(async () => {
      const res = await resetUserRole(roleConfirm.trim());
      if (res.ok && res.redirectTo) {
        window.location.href = res.redirectTo;
      } else {
        setRoleError(res.error || "No se pudo resetear el rol.");
      }
    });
  }

  function handleDeleteAccount() {
    if (deleteConfirm.trim() !== "ELIMINAR MI CUENTA") {
      return setDeleteError("Debes escribir exactamente 'ELIMINAR MI CUENTA' en mayúsculas.");
    }
    setDeleteError(null);

    startTransition(async () => {
      const res = await deleteUserAccount(deleteConfirm.trim(), exitReason, exitComments);
      if (res.ok) {
        window.location.href = "/";
      } else {
        setDeleteError(res.error || "No se pudo eliminar la cuenta.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Tarjeta de Resumen de Cuenta */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          👤 Mi Cuenta y Configuración de Rol
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 text-xs">
          <div>
            <p className="text-slate-400">Correo Electrónico:</p>
            <p className="font-semibold text-slate-200 mt-0.5">{userEmail}</p>
          </div>
          <div>
            <p className="text-slate-400">Tipo de Rol Actual:</p>
            <p className="font-bold text-cyan-400 mt-0.5">
              {roleLabels[currentRole] || currentRole}
            </p>
          </div>
        </div>

        <div className="pt-2 flex flex-wrap gap-3 border-t border-slate-800">
          <button
            onClick={handleExportJSON}
            className="rounded-xl border border-cyan-500/40 bg-cyan-950/60 px-4 py-2.5 text-xs font-bold text-cyan-300 transition hover:bg-cyan-900"
          >
            📥 Descargar Respaldo de Mis Datos (JSON)
          </button>
          <button
            onClick={() => setShowRoleModal(true)}
            className="rounded-xl border border-amber-500/40 bg-amber-950/60 px-4 py-2.5 text-xs font-bold text-amber-300 transition hover:bg-amber-900"
          >
            🔄 Cambiar Mi Rol / Re-Onboarding
          </button>
        </div>
        {exportMessage && (
          <p className="text-xs font-semibold text-emerald-400">{exportMessage}</p>
        )}
      </div>

      {/* Tarjeta Zona de Peligro (Offboarding) */}
      <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-6 space-y-3">
        <h3 className="font-bold text-red-300 text-sm">⚠️ Zona de Peligro (Darse de Baja)</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Si ya no deseas utilizar CoreTextil o no cumple tus expectativas, puedes eliminar tu cuenta definitivamente. Te sugerimos descargar tu respaldo JSON antes de continuar.
        </p>
        <div>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="rounded-xl border border-red-600/50 bg-red-950/80 px-4 py-2.5 text-xs font-bold text-red-200 hover:bg-red-900 transition"
          >
            🗑️ Darse de Baja / Eliminar Cuenta Definitivamente
          </button>
        </div>
      </div>

      {/* Modal Re-Onboarding / Cambiar Rol */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 flex items-center gap-2">
                🔄 Reconfigurar Tipo de Rol
              </h3>
              <button
                onClick={() => setShowRoleModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-slate-300 leading-relaxed">
              ¿Te equivocaste de tipo de cuenta al registrarte? Al confirmar, tu perfil volverá a la pantalla de <strong>Onboarding</strong> donde podrás elegir entre Marca, Taller Satélite o Operario Libre.
            </p>

            <div className="rounded-xl bg-slate-950 p-3 border border-amber-500/30 text-amber-300">
              💡 <strong>Recomendación:</strong> Descarga primero tu respaldo JSON por seguridad.
            </div>

            <div>
              <label className="block text-slate-400 mb-1">
                Escribe <span className="font-bold text-amber-400">CAMBIAR ROL</span> para confirmar:
              </label>
              <input
                type="text"
                value={roleConfirm}
                onChange={(e) => setRoleConfirm(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 uppercase tracking-widest focus:border-amber-500 focus:outline-none"
                placeholder="CAMBIAR ROL"
              />
            </div>

            {roleError && <p className="font-semibold text-red-400">{roleError}</p>}

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={handleResetRole}
                disabled={pending || roleConfirm.trim() !== "CAMBIAR ROL"}
                className="w-full rounded-xl bg-amber-600 py-3 font-bold text-white shadow-lg shadow-amber-950/50 hover:bg-amber-500 disabled:opacity-40"
              >
                {pending ? "Reiniciando rol…" : "Confirmar e Ir a Onboarding"}
              </button>
              <button
                onClick={() => setShowRoleModal(false)}
                className="w-full rounded-xl border border-slate-800 py-2 text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Darse de Baja / Eliminar Cuenta */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-red-900/60 bg-slate-900 p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-red-400 flex items-center gap-2">
                🗑️ Darse de Baja de CoreTextil
              </h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">
                  ¿Por qué deseas dejar la aplicación? (Encuesta de salida):
                </label>
                <select
                  value={exitReason}
                  onChange={(e) => setExitReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                >
                  <option value="Me equivoqué de tipo de cuenta">Me equivoqué de tipo de cuenta / No entendí el sistema</option>
                  <option value="No era lo que buscaba mi taller o marca">No era lo que buscaba mi taller o marca</option>
                  <option value="Faltan funciones para mi operación">Faltan funciones necesarias para mi operación</option>
                  <option value="Mi equipo no aceptó usar la app">Mi equipo o clientes no aceptaron usar la plataforma</option>
                  <option value="Otra razón">Otra razón...</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Comentario o sugerencia (Opcional):</label>
                <textarea
                  value={exitComments}
                  onChange={(e) => setExitComments(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                  placeholder="Ayúdanos a mejorar contándonos qué te hizo tomar esta decisión..."
                />
              </div>

              <div className="rounded-xl bg-red-950/40 p-3 border border-red-800 text-red-300">
                ⚠️ <strong>Esta acción es irreversible:</strong> Se eliminará tu perfil y sesión en la aplicación.
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  Escribe <span className="font-bold text-red-400">ELIMINAR MI CUENTA</span> para confirmar:
                </label>
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 uppercase tracking-widest focus:border-red-500 focus:outline-none"
                  placeholder="ELIMINAR MI CUENTA"
                />
              </div>
            </div>

            {deleteError && <p className="font-semibold text-red-400">{deleteError}</p>}

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={handleDeleteAccount}
                disabled={pending || deleteConfirm.trim() !== "ELIMINAR MI CUENTA"}
                className="w-full rounded-xl bg-red-600 py-3 font-bold text-white shadow-lg shadow-red-950/50 hover:bg-red-500 disabled:opacity-40"
              >
                {pending ? "Eliminando cuenta…" : "Eliminar Mi Cuenta Definitivamente"}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="w-full rounded-xl border border-slate-800 py-2 text-slate-400 hover:text-white"
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
