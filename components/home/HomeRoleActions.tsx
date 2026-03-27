"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { buildAccess } from "@/lib/access";

type ViewerProfile = {
  id: string;
  full_name: string | null;
  worker_enabled: boolean | null;
  hirer_enabled: boolean | null;
  is_active?: boolean | null;
  is_admin?: boolean | null;
  role?: string | null;
};

export default function HomeRoleActions() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ViewerProfile | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!user) {
        setUserId(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const { data: profileData } = await supabase
        .from("profiles")
        .select(
          "id, full_name, worker_enabled, hirer_enabled, is_active, is_admin, role"
        )
        .eq("id", user.id)
        .single();

      if (!mounted) return;

      setProfile((profileData as ViewerProfile) || null);
      setLoading(false);
    };

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadUser();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  if (loading) {
    return (
      <div className="mt-10 flex flex-wrap gap-4">
        <div className="h-14 w-44 animate-pulse rounded-xl bg-slate-200" />
        <div className="h-14 w-44 animate-pulse rounded-xl bg-slate-200" />
        <div className="h-14 w-44 animate-pulse rounded-xl bg-slate-200" />
      </div>
    );
  }

  const access = buildAccess(profile);

  const isWorkerEnabled = profile?.worker_enabled === true;
  const isHirerEnabled = profile?.hirer_enabled === true;

  const isWorkerOnly = isWorkerEnabled && !isHirerEnabled;
  const isHirerOnly = !isWorkerEnabled && isHirerEnabled;
  const isBoth = isWorkerEnabled && isHirerEnabled;

  const primaryIndigo =
    "rounded-xl bg-indigo-600 px-7 py-4 text-sm font-semibold text-white shadow-md transition hover:scale-[1.02] hover:bg-indigo-700";
  const primaryEmerald =
    "rounded-xl bg-emerald-600 px-7 py-4 text-sm font-semibold text-white shadow-md transition hover:scale-[1.02] hover:bg-emerald-700";
  const secondary =
    "rounded-xl border border-slate-300 bg-white px-7 py-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50";

  if (!userId) {
    return (
      <div className="mt-10 flex flex-wrap gap-4">
        <Link href="/auth/signup" className={primaryIndigo}>
          Get started
        </Link>

        <Link href="/jobs" className={secondary}>
          Browse jobs
        </Link>

        <Link href="/post-job" className={primaryEmerald}>
          Post job
        </Link>

        <Link href="/auth/login" className={secondary}>
          Login
        </Link>
      </div>
    );
  }

  if (!isWorkerEnabled && !isHirerEnabled) {
    return (
      <div className="mt-10 flex flex-wrap gap-4">
        <Link href="/profile" className={primaryIndigo}>
          Choose your mode
        </Link>

        <Link href="/dashboard" className={secondary}>
          Open dashboard
        </Link>
      </div>
    );
  }

  if (isWorkerOnly) {
    return (
      <div className="mt-10 flex flex-wrap gap-4">
        {access.canBrowseJobs ? (
          <Link href="/jobs" className={primaryIndigo}>
            Browse jobs
          </Link>
        ) : null}

        <Link href="/post-job" className={primaryEmerald}>
          Post job
        </Link>

        {access.canApplyJobs ? (
          <Link href="/my-applications" className={secondary}>
            My applications
          </Link>
        ) : null}

        <Link href="/profile" className={secondary}>
          Edit profile
        </Link>
      </div>
    );
  }

  if (isHirerOnly) {
    return (
      <div className="mt-10 flex flex-wrap gap-4">
        {access.canBrowseWorkers ? (
          <Link href="/workers" className={primaryIndigo}>
            Find workers
          </Link>
        ) : null}

        {access.canPostJobs ? (
          <Link href="/post-job" className={primaryEmerald}>
            Post job
          </Link>
        ) : null}

        <Link href="/my-job-posts" className={secondary}>
          My job posts
        </Link>

        <Link href="/my-requests" className={secondary}>
          My requests
        </Link>

        <Link href="/profile" className={secondary}>
          Edit profile
        </Link>
      </div>
    );
  }

  if (isBoth) {
    return (
      <div className="mt-10 flex flex-wrap gap-4">
        {access.canBrowseWorkers ? (
          <Link href="/workers" className={primaryIndigo}>
            Find workers
          </Link>
        ) : null}

        {access.canBrowseJobs ? (
          <Link href="/jobs" className={primaryIndigo}>
            Browse jobs
          </Link>
        ) : null}

        {access.canPostJobs ? (
          <Link href="/post-job" className={primaryEmerald}>
            Post job
          </Link>
        ) : null}

        <Link href="/dashboard" className={secondary}>
          Dashboard
        </Link>

        <Link href="/profile" className={secondary}>
          Manage profile
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-10 flex flex-wrap gap-4">
      <Link href="/dashboard" className={secondary}>
        Dashboard
      </Link>
    </div>
  );
}