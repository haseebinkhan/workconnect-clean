import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildAccess } from "@/lib/access";
import ModeSwitcher from "@/components/ModeSwitcher";

type DashboardCard = {
  title: string;
  description: string;
  href: string;
  badge?: string | null;
  visible: boolean;
  tone?: "default" | "worker" | "hirer" | "neutral";
};

type DashboardPageProps = {
  searchParams?: Promise<{
    mode?: string;
  }>;
};

function cardToneClass(tone?: DashboardCard["tone"]) {
  if (tone === "worker") return "border-emerald-200 bg-emerald-50";
  if (tone === "hirer") return "border-indigo-200 bg-indigo-50";
  if (tone === "neutral") return "border-slate-200 bg-slate-50";
  return "border-slate-200 bg-white";
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const params = (await searchParams) || {};
  const requestedMode = typeof params.mode === "string" ? params.mode : "all";

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      email,
      worker_enabled,
      hirer_enabled,
      is_admin,
      role,
      is_active
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-6xl">
          <div className="rounded-[2rem] border border-red-200 bg-white p-8 shadow-sm">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Dashboard
            </h1>
            <p className="mt-3 text-sm text-red-600">
              We could not load your account profile right now.
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-6xl">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Dashboard</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Welcome to WorkConnect
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Your account has been verified, but your profile is not ready yet.
              Please complete your profile to continue.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/profile"
                className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                Complete profile
              </Link>

              <Link
                href="/jobs"
                className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
              >
                Browse jobs
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!profile.is_active) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-6xl">
          <div className="rounded-[2rem] border border-red-200 bg-white p-8 shadow-sm">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Dashboard
            </h1>
            <p className="mt-3 text-sm text-red-600">
              Your account is not active right now.
            </p>
          </div>
        </section>
      </main>
    );
  }

  const access = buildAccess(profile);
  const isAdmin = profile.is_admin === true || profile.role === "admin";

  let currentMode = "all";

  if (requestedMode === "worker" && profile.worker_enabled) {
    currentMode = "worker";
  } else if (requestedMode === "hirer" && profile.hirer_enabled) {
    currentMode = "hirer";
  } else if (
    requestedMode === "all" &&
    profile.worker_enabled &&
    profile.hirer_enabled
  ) {
    currentMode = "all";
  } else if (profile.worker_enabled && !profile.hirer_enabled) {
    currentMode = "worker";
  } else if (!profile.worker_enabled && profile.hirer_enabled) {
    currentMode = "hirer";
  }

  const [
    workerProfileResult,
    hirerProfileResult,
    unreadBookingsForWorkerResult,
    unseenBookingsForHirerResult,
    unreadMessagesBookingsResult,
    favoritesResult,
  ] = await Promise.all([
    supabase
      .from("worker_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle(),

    supabase
      .from("hirer_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle(),

    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("worker_user_id", user.id)
      .eq("seen_by_worker", false)
      .is("deleted_at", null),

    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("hirer_user_id", user.id)
      .eq("seen_by_hirer", false)
      .is("deleted_at", null),

    supabase
      .from("bookings")
      .select("id")
      .or(`hirer_user_id.eq.${user.id},worker_user_id.eq.${user.id}`)
      .is("deleted_at", null),

    supabase
      .from("favorites")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  let myApplicationsCount = 0;
  let myJobPostsCount = 0;
  let unreadMessagesCount = 0;
  let unseenApplicationsCount = 0;

  if (workerProfileResult.data?.id) {
    const { count } = await supabase
      .from("job_applications")
      .select("id", { count: "exact", head: true })
      .eq("worker_id", workerProfileResult.data.id);

    myApplicationsCount = count || 0;
  }

  if (hirerProfileResult.data?.id) {
    const { data: myJobs, count: jobsCount } = await supabase
      .from("jobs")
      .select("id", { count: "exact" })
      .eq("hirer_id", hirerProfileResult.data.id)
      .is("deleted_at", null);

    myJobPostsCount = jobsCount || 0;

    const myJobIds = (myJobs || []).map((job) => job.id);

    if (myJobIds.length > 0) {
      const { count } = await supabase
        .from("job_applications")
        .select("id", { count: "exact", head: true })
        .in("job_id", myJobIds)
        .eq("seen_by_hirer", false);

      unseenApplicationsCount = count || 0;
    }
  }

  const bookingIds = (unreadMessagesBookingsResult.data || []).map(
    (row) => row.id
  );

  if (bookingIds.length > 0) {
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in("booking_id", bookingIds)
      .neq("sender_id", user.id)
      .eq("is_read", false);

    unreadMessagesCount = count || 0;
  }

  const showWorkerCards = currentMode === "worker" || currentMode === "all";
  const showHirerCards = currentMode === "hirer" || currentMode === "all";
  const hasBothModes = profile.worker_enabled && profile.hirer_enabled;

  const cards: DashboardCard[] = [
    {
      title: "Browse jobs",
      description: "Find open jobs that match your skills and apply directly.",
      href: "/jobs",
      visible: access.canBrowseJobs && showWorkerCards,
      tone: "worker",
    },
    {
      title: "My applications",
      description: "Track the status of the jobs you have applied for.",
      href: "/my-applications",
      badge: myApplicationsCount > 0 ? String(myApplicationsCount) : null,
      visible: access.canApplyJobs && showWorkerCards,
      tone: "worker",
    },
    {
      title: "Worker requests",
      description: "Respond to incoming hirer requests and manage work progress.",
      href: "/requests",
      badge:
        (unreadBookingsForWorkerResult.count || 0) > 0
          ? String(unreadBookingsForWorkerResult.count || 0)
          : null,
      visible: access.canReceiveRequests && showWorkerCards,
      tone: "worker",
    },
    {
      title: workerProfileResult.data?.id ? "Worker profile" : "Become a worker",
      description: workerProfileResult.data?.id
        ? "Update your worker profile, availability, and contact settings."
        : "Create a worker profile with NI area, BT postcode, and availability.",
      href: workerProfileResult.data?.id
        ? "/profile/worker"
        : "/become-worker",
      visible: showWorkerCards,
      tone: "worker",
    },
    {
      title: "Browse workers",
      description: "Explore worker profiles and contact available workers.",
      href: "/workers",
      visible: access.canBrowseWorkers && showHirerCards,
      tone: "hirer",
    },
    {
      title: "Saved workers",
      description:
        "Keep a shortlist of promising workers and compare them later.",
      href: "/saved-workers",
      badge:
        (favoritesResult.count || 0) > 0
          ? String(favoritesResult.count || 0)
          : null,
      visible: access.canBrowseWorkers && showHirerCards,
      tone: "hirer",
    },
    {
      title: "Post a job",
      description: "Create a new job and send it for admin review.",
      href: "/post-job",
      visible: access.canPostJobs && showHirerCards,
      tone: "hirer",
    },
    {
      title: "My job posts",
      description: "Review your job posts and manage incoming applications.",
      href: "/my-job-posts",
      badge:
        unseenApplicationsCount > 0
          ? String(unseenApplicationsCount)
          : myJobPostsCount > 0
          ? String(myJobPostsCount)
          : null,
      visible: access.canPostJobs && showHirerCards,
      tone: "hirer",
    },
    {
      title: "My requests",
      description:
        "Track worker requests, active bookings, and completion updates.",
      href: "/my-requests",
      badge:
        (unseenBookingsForHirerResult.count || 0) > 0
          ? String(unseenBookingsForHirerResult.count || 0)
          : null,
      visible:
        (access.canSendWorkerRequest || access.canPostJobs) && showHirerCards,
      tone: "hirer",
    },
    {
      title: "Messages",
      description: "Open your conversations and continue chatting.",
      href: "/messages",
      badge: unreadMessagesCount > 0 ? String(unreadMessagesCount) : null,
      visible: true,
      tone: "neutral",
    },
    {
      title: "Account profile",
      description: "Manage your account, worker settings, and hirer details.",
      href: "/profile",
      visible: true,
      tone: "neutral",
    },
    {
      title: "Notifications",
      description: "Review the latest platform updates, requests, and alerts.",
      href: "/notifications",
      visible: true,
      tone: "neutral",
    },
    {
      title: "Admin",
      description: "Review users, jobs, reports, and moderation tasks.",
      href: "/admin",
      visible: isAdmin,
      tone: "neutral",
    },
  ];

  const visibleCards = cards.filter((card) => card.visible);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Overview</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Welcome{profile.full_name ? `, ${profile.full_name}` : ""}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                Use your dashboard to manage worker discovery, requests, jobs,
                messages, and your profile from one place.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Messages
                </p>
                <p className="mt-2 text-2xl font-black text-slate-900">
                  {unreadMessagesCount}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Saved
                </p>
                <p className="mt-2 text-2xl font-black text-slate-900">
                  {favoritesResult.count || 0}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Worker
                </p>
                <p className="mt-2 text-2xl font-black text-slate-900">
                  {profile.worker_enabled ? "On" : "Off"}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Hirer
                </p>
                <p className="mt-2 text-2xl font-black text-slate-900">
                  {profile.hirer_enabled ? "On" : "Off"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {profile.worker_enabled ? (
            <span className="rounded-full bg-emerald-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Worker enabled
            </span>
          ) : null}

          {profile.hirer_enabled ? (
            <span className="rounded-full bg-indigo-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-indigo-700">
              Hirer enabled
            </span>
          ) : null}

          {isAdmin ? (
            <span className="rounded-full bg-amber-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
              Admin
            </span>
          ) : null}
        </div>

        <div className="mt-6">
          <ModeSwitcher
            currentMode={currentMode}
            workerEnabled={profile.worker_enabled === true}
            hirerEnabled={profile.hirer_enabled === true}
          />
        </div>

        {hasBothModes ? (
          <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  You can use both Worker and Hirer views
                </h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Switch views to focus on job applications as a worker or
                  worker discovery and hiring as a hirer.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/dashboard?mode=worker"
                  className="rounded-2xl border border-emerald-300 bg-white px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                >
                  Worker view
                </Link>
                <Link
                  href="/dashboard?mode=hirer"
                  className="rounded-2xl border border-indigo-300 bg-white px-4 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
                >
                  Hirer view
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visibleCards.map((card) => (
            <Link
              key={`${card.title}-${card.href}`}
              href={card.href}
              className={`group rounded-[2rem] border p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${cardToneClass(
                card.tone
              )}`}
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-xl font-bold text-slate-900">{card.title}</h3>

                {card.badge ? (
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                    {card.badge}
                  </span>
                ) : null}
              </div>

              <p className="mt-3 text-sm leading-7 text-slate-600">
                {card.description}
              </p>

              <div className="mt-6 inline-flex items-center rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition group-hover:bg-slate-100">
                Open
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
