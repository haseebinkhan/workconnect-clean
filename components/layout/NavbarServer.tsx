import { createClient } from "@/lib/supabase/server";
import Navbar from "./Navbar";

type ProfileRow = {
  id: string;
  full_name: string | null;
  worker_enabled: boolean | null;
  hirer_enabled: boolean | null;
  is_admin: boolean | null;
  role: string | null;
  is_active: boolean | null;
};

export default async function NavbarServer() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return (
      <Navbar
        isLoggedIn={false}
        userId={undefined}
        fullName={null}
        workerEnabled={false}
        hirerEnabled={false}
        isAdmin={false}
      />
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id, full_name, worker_enabled, hirer_enabled, is_admin, role, is_active"
    )
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (profileError || !profile) {
    return (
      <Navbar
        isLoggedIn={true}
        userId={user.id}
        fullName={user.email ?? null}
        workerEnabled={false}
        hirerEnabled={false}
        isAdmin={false}
      />
    );
  }

  const isActive = profile.is_active !== false;
  const workerEnabled = isActive && profile.worker_enabled === true;
  const hirerEnabled = isActive && profile.hirer_enabled === true;
  const isAdmin =
    isActive &&
    (profile.is_admin === true || profile.role === "admin");

  return (
    <Navbar
      isLoggedIn={true}
      userId={user.id}
      fullName={profile.full_name || user.email || null}
      workerEnabled={workerEnabled}
      hirerEnabled={hirerEnabled}
      isAdmin={isAdmin}
    />
  );
}

