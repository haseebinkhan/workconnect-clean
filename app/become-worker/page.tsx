import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BecomeWorkerForm from "./worker-form";

export default async function BecomeWorkerPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, area_slug, city, worker_enabled")
    .eq("id", user.id)
    .single();

  if (profile?.worker_enabled) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-medium text-slate-500">Worker setup</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Become a worker</h1>
          <p className="mt-2 text-slate-600">
            Create your worker profile and start appearing in local search results.
          </p>
        </div>

        <BecomeWorkerForm
          defaultFullName={profile?.full_name || ""}
          defaultArea={profile?.area_slug || "belfast"}
          defaultCity={profile?.city || ""}
        />
      </section>
    </main>
  );
}
