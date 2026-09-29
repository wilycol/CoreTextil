import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ProfilesRow } from "@/lib/db.types";

export type Session = {
  userId: string;
  email: string;
  profile: ProfilesRow;
};

export async function getSession(): Promise<Session> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/onboarding");

  return {
    userId: user.id,
    email: user.email ?? profile.email,
    profile: profile as ProfilesRow,
  };
}
