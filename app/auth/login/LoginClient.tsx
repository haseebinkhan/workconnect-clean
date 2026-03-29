"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const nextPath = searchParams.get("next");
  const redirectTarget =
    nextPath && nextPath.startsWith("/") ? nextPath : "/dashboard";

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (session?.user) {
          router.replace(redirectTarget);
          router.refresh();
          return;
        }

        setCheckingSession(false);
      } catch (error) {
        console.error("login session check error:", error);
        if (mounted) {
          setCheckingSession(false);
        }
      }
    }

    void checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (
        (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") &&
        session?.user
      ) {
        router.replace(redirectTarget);
        router.refresh();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router, redirectTarget, supabase]);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password;

    if (!cleanEmail) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    if (!cleanPassword) {
      setErrorMessage("Please enter your password.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      if (!data.session?.user) {
        setErrorMessage("Could not start your session. Please try again.");
        return;
      }

      router.replace(redirectTarget);
      router.refresh();
    } catch (error) {
      console.error("login error:", error);
      setErrorMessage("Could not sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="min-h-[calc(100vh-140px)] bg-gradient-to-br from-slate-50 via-white to-indigo-50">
        <section className="mx-auto flex min-h-[calc(100vh-140px)] max-w-7xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
          <div className="w-full max-w-md rounded-[2rem] border border-white/70 bg-white/90 p-8 text-center shadow-xl shadow-slate-200/60 backdrop-blur">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-xl font-bold text-white shadow-lg">
              W
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Welcome back
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Checking your session and preparing your workspace...
            </p>

            <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-indigo-600" />
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-140px)] bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <section className="mx-auto flex min-h-[calc(100vh-140px)] max-w-7xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/60 bg-white/90 shadow-2xl shadow-slate-200/60 backdrop-blur lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative hidden overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-900 p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.35),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.22),transparent_30%)]" />

            <div className="relative">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-xl font-bold shadow-lg ring-1 ring-white/15 backdrop-blur">
                W
              </div>

              <p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-200">
                WorkConnect
              </p>

              <h2 className="mt-4 text-4xl font-bold leading-tight tracking-tight">
                Sign in to manage local workers, jobs, and requests.
              </h2>

              <p className="mt-5 max-w-md text-sm leading-7 text-slate-200">
                Access your dashboard, saved workers, messages, bookings, and
                hiring activity in one place.
              </p>
            </div>

            <div className="relative grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-sm font-semibold">Dashboard</p>
                <p className="mt-1 text-xs text-slate-300">
                  Organize everything in one place.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-sm font-semibold">Messages</p>
                <p className="mt-1 text-xs text-slate-300">
                  Continue chats and requests quickly.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-sm font-semibold">Opportunities</p>
                <p className="mt-1 text-xs text-slate-300">
                  Hire or work locally with confidence.
                </p>
              </div>
            </div>
          </div>

          <div className="relative p-6 sm:p-8 lg:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.08),transparent_35%)]" />

            <div className="relative mx-auto w-full max-w-md">
              <div className="mb-6 lg:hidden">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-lg font-bold text-white shadow-lg">
                  W
                </div>
                <p className="mt-4 text-sm font-medium text-slate-500">
                  WorkConnect
                </p>
              </div>

              <p className="text-sm font-medium text-slate-500">Account access</p>

              <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
                Welcome back
              </h1>

              <p className="mt-3 text-sm leading-7 text-slate-600">
                Sign in to manage jobs, workers, requests, messages, and your
                profile.
              </p>

              {nextPath ? (
                <div className="mt-5 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
                  Please sign in to continue.
                </div>
              ) : null}

              <form onSubmit={handleLogin} className="mt-8 space-y-5">
                {errorMessage ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errorMessage}
                  </div>
                ) : null}

                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    placeholder="Enter your email"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Password
                    </label>

                    <Link
                      href="/auth/reset-password"
                      className="text-sm font-semibold text-indigo-600 transition hover:text-indigo-700"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  <input
                    id="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    placeholder="Enter your password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Signing in..." : "Sign in"}
                </button>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-500">
                  By signing in, you can manage worker discovery, requests,
                  bookings, and local job activity from one place.
                </div>

                <div className="text-center text-sm text-slate-600">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/auth/signup"
                    className="font-semibold text-indigo-600 transition hover:text-indigo-700"
                  >
                    Create one
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

