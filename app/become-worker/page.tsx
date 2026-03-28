import { createClient } from "@/lib/supabase/server";
import BecomeWorkerForm from "./BecomeWorkerForm";

export default async function BecomeWorkerPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: {
    full_name?: string | null;
    area_slug?: string | null;
    city?: string | null;
  } | null = null;

  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, area_slug, city")
      .eq("id", user.id)
      .maybeSingle();

    profile = data;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <section className="mx-auto max-w-5xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Become a worker</p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Create your worker profile
        </h1>

        <p className="mt-3 text-sm text-slate-600">
          Set up your profile so hirers can find and contact you.
        </p>

        <div className="mt-8">
          <BecomeWorkerForm
            defaultFullName={profile?.full_name || ""}
            defaultArea={profile?.area_slug || "belfast"}
            defaultCity={profile?.city || ""}
          />
        </div>
      </section>
    </main>
  );
}
