"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import NotificationBell from "@/components/layout/NotificationBell";
type Props = {
  isLoggedIn: boolean;
  userId?: string;
  fullName?: string | null;
  full_name?: string | null;
  email?: string | null;
  workerEnabled?: boolean;
  hirerEnabled?: boolean;
  isAdmin?: boolean;
};

export default function Navbar({
  isLoggedIn,
  userId,
  fullName,
  full_name,
  email,
  workerEnabled,
  hirerEnabled,
  isAdmin,
}: Props) {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(email ?? null);

  const mode = searchParams.get("mode");
  const search = searchParams.toString();
  const displayName = fullName || full_name || userEmail || "Account";

  useEffect(() => {
    let mounted = true;

    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (mounted) {
        setUserEmail(user?.email ?? email ?? null);
      }
    };

    void getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void getUser();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, email]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, search]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMobileOpen(false);
    router.push("/");
    router.refresh();
  };

  const closeMobile = () => setMobileOpen(false);
  const toggleMobile = () => setMobileOpen((prev) => !prev);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center"
          onClick={closeMobile}
          aria-label="Go to homepage"
        >
          <Image
            src="/logo.png"
            alt="WorkConnect"
            width={340}
            height={110}
            className="h-[60px] w-auto object-contain sm:h-[72px] md:h-[82px]"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/workers"
            className="text-sm font-medium text-slate-700 transition hover:text-slate-900"
          >
            Find Workers
          </Link>

          <Link
            href="/jobs"
            className="text-sm font-medium text-slate-700 transition hover:text-slate-900"
          >
            Find Jobs
          </Link>

          {isLoggedIn ? (
            <>
              <Link
                href="/saved-workers"
                className="text-sm font-medium text-slate-700 transition hover:text-slate-900"
              >
                Saved Workers
              </Link>

              <Link
                href="/dashboard"
                className="text-sm font-medium text-slate-700 transition hover:text-slate-900"
              >
                Dashboard
              </Link>

              <Link
                href="/messages"
                className="text-sm font-medium text-slate-700 transition hover:text-slate-900"
              >
                Messages
              </Link>

              {isAdmin ? (
                <Link
                  href="/admin"
                  className="text-sm font-semibold text-rose-600 transition hover:text-rose-700"
                >
                  Admin
                </Link>
              ) : null}
            </>
          ) : null}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {isLoggedIn ? (
            <>
              {userId ? <NotificationBell userId={userId} /> : null}

              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1">
                <span
                  className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                    workerEnabled || mode === "worker"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500"
                  }`}
                >
                  Worker
                </span>
                <span
                  className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                    hirerEnabled || mode === "hirer"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500"
                  }`}
                >
                  Hirer
                </span>
              </div>

              <div className="max-w-[220px] truncate rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                {displayName}
              </div>

              <button
                onClick={handleLogout}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Login
              </Link>

              <Link
                href="/auth/signup"
                className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={toggleMobile}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-100 md:hidden"
          aria-label="Toggle navigation"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen ? (
        <>
          <button
            type="button"
            aria-label="Close menu overlay"
            className="fixed inset-0 z-40 bg-black/30 md:hidden"
            onClick={closeMobile}
          />

          <div className="absolute left-0 right-0 top-full z-50 border-t border-slate-200 bg-white shadow-xl md:hidden">
            <div className="mx-auto max-h-[80vh] max-w-7xl overflow-y-auto px-4 py-4 sm:px-6">
              <div className="flex flex-col gap-3">
                <Link
                  href="/workers"
                  className="rounded-xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  onClick={closeMobile}
                >
                  Find Workers
                </Link>

                <Link
                  href="/jobs"
                  className="rounded-xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  onClick={closeMobile}
                >
                  Find Jobs
                </Link>

                {isLoggedIn ? (
                  <>
                    <Link
                      href="/saved-workers"
                      className="rounded-xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      onClick={closeMobile}
                    >
                      Saved Workers
                    </Link>

                    <Link
                      href="/dashboard"
                      className="rounded-xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      onClick={closeMobile}
                    >
                      Dashboard
                    </Link>

                    <Link
                      href="/messages"
                      className="rounded-xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      onClick={closeMobile}
                    >
                      Messages
                    </Link>

                    {isAdmin ? (
                      <Link
                        href="/admin"
                        className="rounded-xl px-3 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                        onClick={closeMobile}
                      >
                        Admin
                      </Link>
                    ) : null}

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-sm font-medium text-slate-900">
                        {displayName}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {workerEnabled ? (
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                            Worker
                          </span>
                        ) : null}

                        {hirerEnabled ? (
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                            Hirer
                          </span>
                        ) : null}

                        {isAdmin ? (
                          <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
                            Admin
                          </span>
                        ) : null}
                      </div>

                      <button
                        onClick={handleLogout}
                        className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Logout
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Link
                      href="/auth/login"
                      className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      onClick={closeMobile}
                    >
                      Login
                    </Link>

                    <Link
                      href="/auth/signup"
                      className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                      onClick={closeMobile}
                    >
                      Sign Up
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </header>
  );
}
