import { createClient } from "@/lib/supabase/server";

export type AIQuotaStatus = {
  allowed: boolean;
  limit: number | "unlimited";
  used: number;
  remaining: number | "unlimited";
  reason?: string;
};

export async function checkAIQuota(profile: {
  id: string;
  role: string;
  satellite_owner_id?: string | null;
}): Promise<AIQuotaStatus> {
  const isUnlimited =
    profile.role === "factory_admin" ||
    profile.role === "brand_admin" ||
    profile.role === "superadmin" ||
    profile.role === "designer";

  if (isUnlimited) {
    return {
      allowed: true,
      limit: "unlimited",
      used: 0,
      remaining: "unlimited",
    };
  }

  // Cuota semanal: 2 usos por semana para operario o taller satélite en freemium
  const limit = 2;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_weekly_ai_usage", {
    p_user_id: profile.id,
  });

  // Fallback si la función RPC aún no está o falla
  let used = 0;
  if (error || typeof data !== "number") {
    const { count } = await supabase
      .from("ai_usage_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    used = count ?? 0;
  } else {
    used = data;
  }

  const remaining = Math.max(0, limit - used);
  const allowed = remaining > 0;

  return {
    allowed,
    limit,
    used,
    remaining,
    reason: allowed
      ? undefined
      : `Has utilizado tus ${limit} análisis con IA gratuitos de esta semana. Tu cuota se renueva el próximo lunes a las 00:00, o actualiza al Plan Pro para análisis ilimitados.`,
  };
}

export async function recordAIUsage(profile: {
  id: string;
  tenant_id?: string | null;
}, actionType = "vision_explode") {
  const supabase = await createClient();
  await supabase.from("ai_usage_logs").insert({
    user_id: profile.id,
    tenant_id: profile.tenant_id ?? null,
    action_type: actionType,
  });
}

