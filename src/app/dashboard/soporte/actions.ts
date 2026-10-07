"use server";

import { createClient } from "@/lib/supabase/server";

export type TicketInput = {
  title: string;
  description: string;
  type: "bug" | "feature_request" | "improvement" | "question";
  severity?: "low" | "medium" | "high" | "critical";
  pageUrl?: string;
  attachmentUrl?: string;
};

export async function createSupportTicket(input: TicketInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Sesión no válida" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", user.id)
    .single();

  const { error } = await supabase.from("support_tickets").insert({
    user_id: user.id,
    user_name: profile?.full_name || user.email,
    user_email: profile?.email || user.email,
    role: profile?.role || "operator",
    type: input.type,
    severity: input.severity || "medium",
    title: input.title.trim(),
    description: input.description.trim(),
    page_url: input.pageUrl || null,
    attachment_url: input.attachmentUrl || null,
    status: "open",
  });

  if (error) {
    console.error("Error al crear ticket:", error);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function getSupportTickets() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "superadmin") {
    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });
    return data || [];
  }

  const { data } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return data || [];
}

export async function updateTicketStatus(ticketId: string, status: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "No autorizado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "superadmin") {
    return { ok: false, error: "Solo superadmin puede actualizar tickets" };
  }

  const { error } = await supabase
    .from("support_tickets")
    .update({ status })
    .eq("id", ticketId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
