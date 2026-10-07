"use client";

import { useState, useTransition } from "react";
import { createSupportTicket, updateTicketStatus } from "./actions";

type Ticket = {
  id: string;
  user_name: string;
  user_email: string;
  role: string;
  type: "bug" | "feature_request" | "improvement" | "question";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  page_url?: string;
  attachment_url?: string;
  status: "open" | "in_review" | "resolved" | "closed";
  created_at: string;
};

export default function SoporteClient({
  userRole,
  userEmail,
  userName,
  initialTickets,
}: {
  userRole: string;
  userEmail: string;
  userName: string;
  initialTickets: Ticket[];
}) {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [type, setType] = useState<"bug" | "feature_request" | "improvement" | "question">("bug");
  const [severity, setSeverity] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isSuperAdmin = userRole === "superadmin";

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      return setError("Por favor completa el título y la descripción.");
    }

    setError(null);
    setMessage(null);

    startTransition(async () => {
      const pageUrl = typeof window !== "undefined" ? window.location.href : undefined;
      const res = await createSupportTicket({
        title,
        description,
        type,
        severity,
        pageUrl,
        attachmentUrl: imagePreview || undefined,
      });

      if (res.ok) {
        setMessage("✅ Tu reporte fue enviado exitosamente con captura de pantalla al equipo de soporte.");
        setTitle("");
        setDescription("");
        setImagePreview(null);
        // Agregar provisionalmente a la lista local
        const newTicket: Ticket = {
          id: Date.now().toString(),
          user_name: userName,
          user_email: userEmail,
          role: userRole,
          type,
          severity,
          title,
          description,
          page_url: pageUrl,
          attachment_url: imagePreview || undefined,
          status: "open",
          created_at: new Date().toISOString(),
        };
        setTickets([newTicket, ...tickets]);
      } else {
        setError(res.error || "No se pudo enviar el reporte.");
      }
    });
  }

  function handleStatusChange(ticketId: string, newStatus: string) {
    startTransition(async () => {
      const res = await updateTicketStatus(ticketId, newStatus);
      if (res.ok) {
        setTickets((prev) =>
          prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus as any } : t))
        );
      }
    });
  }

  const whatsappMessage = `Hola Soporte CoreTextil, soy ${userName} (${userRole}). Necesito ayuda técnica con la aplicación.`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="space-y-8">
      {/* Botones de acción rápida */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-5 backdrop-blur flex items-center justify-between">
          <div>
            <h3 className="font-bold text-emerald-300">💬 Soporte Directo por WhatsApp</h3>
            <p className="text-xs text-slate-400 mt-1">
              Habla directamente con un asesor de soporte en tiempo real.
            </p>
          </div>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-500 shadow-lg shadow-emerald-950/50 whitespace-nowrap"
          >
            📲 Abrir Chat
          </a>
        </div>

        <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/30 p-5 backdrop-blur flex items-center justify-between">
          <div>
            <h3 className="font-bold text-cyan-300">💡 Sugerir Nueva Función</h3>
            <p className="text-xs text-slate-400 mt-1">
              ¿Quieres una herramienta específica para tu taller o marca?
            </p>
          </div>
          <button
            onClick={() => {
              setType("feature_request");
              window.scrollTo({ top: 300, behavior: "smooth" });
            }}
            className="rounded-xl bg-cyan-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-cyan-500 shadow-lg shadow-cyan-950/50 whitespace-nowrap"
          >
            ✏️ Proponer
          </button>
        </div>
      </div>

      {/* Formulario de Reporte / Ticket */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4 shadow-xl">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          📝 Crear Nuevo Ticket de Soporte o Feedback
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Categoría / Tipo</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 focus:border-cyan-500 focus:outline-none"
              >
                <option value="bug">🐞 Reportar Falla o Error (Bug)</option>
                <option value="feature_request">💡 Solicitar Nueva Función</option>
                <option value="improvement">🎨 Sugerir Mejora de Diseño / UX</option>
                <option value="question">❓ Pregunta de Uso / Asistencia</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Prioridad / Urgencia</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as any)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 focus:border-cyan-500 focus:outline-none"
              >
                <option value="low">Baja (Consulta general)</option>
                <option value="medium">Media (Inconveniente leve)</option>
                <option value="high">Alta (Afecta mi trabajo diario)</option>
                <option value="critical">Crítica (Imposible usar la función)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Título Resumido</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 focus:border-cyan-500 focus:outline-none"
              placeholder="Ej: No abre el lector de código QR en mi teléfono"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Descripción Detallada</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 focus:border-cyan-500 focus:outline-none"
              placeholder="Explica qué estabas intentando hacer, qué ocurrió y si aparece algún mensaje de error..."
            />
          </div>

          {/* Adjuntar captura de pantalla opcional */}
          <div className="flex items-center gap-4 pt-1">
            <label className="cursor-pointer rounded-xl border border-cyan-500/40 bg-cyan-950/40 px-4 py-2 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-900 flex items-center gap-1.5">
              📷 {imagePreview ? "Cambiar captura de pantalla" : "Adjuntar captura de pantalla / foto (Opcional)"}
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>

            {imagePreview && (
              <div className="flex items-center gap-3">
                <img
                  src={imagePreview}
                  alt="Captura adjunta"
                  className="h-10 w-10 rounded-lg object-cover border border-cyan-500/50 shadow-md"
                />
                <button
                  type="button"
                  onClick={() => setImagePreview(null)}
                  className="text-xs text-red-400 hover:underline"
                >
                  Quitar foto
                </button>
              </div>
            )}
          </div>

          {error && <p className="text-xs font-semibold text-red-400">{error}</p>}
          {message && <p className="text-xs font-semibold text-emerald-400">{message}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full sm:w-auto rounded-xl bg-cyan-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-cyan-950/50 hover:bg-cyan-500 transition disabled:opacity-40"
          >
            {pending ? "Enviando ticket…" : "📩 Enviar Ticket a Soporte"}
          </button>
        </form>
      </div>

      {/* Historial / Panel de Tickets */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100">
            {isSuperAdmin ? "👑 Panel de Administración de Tickets (SuperAdmin)" : "📋 Mis Tickets de Soporte"}
          </h2>
          <span className="text-xs text-slate-400">Total: {tickets.length}</span>
        </div>

        {tickets.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">
            No tienes tickets de soporte registrados actualmente.
          </p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {tickets.map((t) => (
              <div
                key={t.id}
                className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-xs space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        t.type === "bug"
                          ? "bg-red-950 text-red-300 border border-red-800"
                          : t.type === "feature_request"
                          ? "bg-cyan-950 text-cyan-300 border border-cyan-800"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {t.type === "bug"
                        ? "🐞 Bug"
                        : t.type === "feature_request"
                        ? "💡 Función"
                        : t.type === "improvement"
                        ? "🎨 Mejora"
                        : "❓ Consulta"}
                    </span>
                    <h3 className="font-bold text-slate-200">{t.title}</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        t.status === "open"
                          ? "bg-amber-950 text-amber-300 border border-amber-800"
                          : t.status === "in_review"
                          ? "bg-cyan-950 text-cyan-300 border border-cyan-800"
                          : t.status === "resolved"
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {t.status === "open"
                        ? "Abierto"
                        : t.status === "in_review"
                        ? "En revisión"
                        : t.status === "resolved"
                        ? "Resuelto"
                        : "Cerrado"}
                    </span>
                  </div>
                </div>

                <p className="text-slate-300 leading-relaxed">{t.description}</p>

                {t.attachment_url && (
                  <div className="pt-1">
                    <p className="text-[11px] font-medium text-cyan-400 mb-1">📷 Captura de pantalla adjunta:</p>
                    <a href={t.attachment_url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={t.attachment_url}
                        alt="Captura de pantalla de la falla"
                        className="max-h-48 rounded-lg border border-slate-700 object-cover hover:opacity-90 transition"
                      />
                    </a>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-900">
                  <span>
                    Por: {t.user_name} ({t.user_email}) · {new Date(t.created_at).toLocaleString()}
                  </span>

                  {isSuperAdmin && (
                    <div className="flex items-center gap-1.5 pt-1 sm:pt-0">
                      <span className="text-slate-400">Estado:</span>
                      <select
                        value={t.status}
                        onChange={(e) => handleStatusChange(t.id, e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-slate-200"
                      >
                        <option value="open">Abierto</option>
                        <option value="in_review">En revisión</option>
                        <option value="resolved">Resuelto</option>
                        <option value="closed">Cerrado</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
