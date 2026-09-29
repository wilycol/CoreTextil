"use server";

import { getBundleSheetCore, type BundleSheet } from "@/lib/services/bundleSheet";

export type { BundleSheet };

export type ReceivedBundle = {
  bundleId: string;
  bundleCode: string;
  size: string;
  color: string;
  units: number;
  orderId: string;
  orderNumber: string;
  alreadyReceived: boolean;
};

export type ScanResult =
  | { ok: true; data: ReceivedBundle }
  | { ok: false; error: string };

// Ficha técnica resumida de la prenda del atado (para saber qué coser)
export async function getBundleSheet(
  bundleCode: string
): Promise<{ ok: true; sheet: BundleSheet } | { ok: false; error: string }> {
  return getBundleSheetCore(bundleCode);
}

export async function receiveBundle(
  bundleCode: string
): Promise<ScanResult> {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };

  const code = bundleCode.trim();
  if (!code) return { ok: false, error: "Código vacío." };

  const { data, error } = await supabase.rpc("receive_bundle_by_code", {
    p_bundle_code: code,
  });

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Respuesta vacía de la base de datos." };

  return { ok: true, data: data as ReceivedBundle };
}
