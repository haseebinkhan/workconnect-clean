"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getRegions } from "@/lib/uk-locations";

export default function SignupPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const regions = useMemo(() => getRegions(), []);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [region, setRegion] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const cleanFullName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const cleanRegion = region.trim();

    if (!cleanFullName) {
      setErrorMessage("Please enter your full name.");
      return;
    }

    if (!cleanEmail) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    if (!cleanPassword) {
      setErrorMessage("Please enter a password.");
      return;
    }

    if (cleanPassword.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    if (!cleanRegion) {
      setErrorMessage("Please select your UK nation.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback?type=signup`
          : undefined;

      const { error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            full_name: cleanFullName,
            region: cleanRegion,
            country: "United Kingdom",
          },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setSuccessMessage(
        "Account created successfully. Please check your email to verify your account."
      );

      setFullName("");
      setEmail("");
      setPassword("");
      setRegion("");

      setTimeout(() => {
        router.push("/auth/login");
      }, 1500);
    } catch (error) {
      console.error("signup error:", error);
      setErrorMessage("Could not create account. Please try again.");
    } finally {
      setLoading(false);
    }
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

              <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight">
                Create your account and start hiring or working locally.
              </h1>

              <p className="mt-5 max-w-md text-sm leading-7 text-slate-200">
                Join WorkConnect to manage local jobs, worker discovery,
                requests, bookings, and trusted connections in one place.
              </p>

              <div className="mt-8 grid gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <p className="text-sm font-semibold text-white">
                    Hire trusted local workers
                  </p>
                  <p className="mt-1 text-xs leading-6 text-slate-300">
                    Find people by category, area, postcode, and availability.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <p className="text-sm font-semibold text-white">
                    Apply for nearby work
                  </p>
                  <p className="mt-1 text-xs leading-6 text-slate-300">
                    Discover jobs in your region and respond quickly.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <p className="text-sm font-semibold text-white">
                    Build trust through activity
                  </p>
                  <p className="mt-1 text-xs leading-6 text-slate-300">
                    Reviews, verified actions, and structured workflows help
                    everyone work with confidence.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-sm font-semibold">Jobs</p>
                <p className="mt-1 text-xs text-slate-300">
                  Discover local opportunities.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-sm font-semibold">Workers</p>
                <p className="mt-1 text-xs text-slate-300">
                  Connect with trusted local people.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-sm font-semibold">Requests</p>
                <p className="mt-1 text-xs text-slate-300">
                  Manage work from one dashboard.
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

              <p className="text-sm font-medium text-slate-500">Create account</p>

              <h2 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
                Join WorkConnect
              </h2>

              <p className="mt-3 text-sm leading-7 text-slate-600">
                Create your account and choose the UK nation you mainly want to
                use the platform in.
              </p>

              <form onSubmit={handleSignup} className="mt-8 space-y-5">
                {errorMessage ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errorMessage}
                  </div>
                ) : null}

                {successMessage ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {successMessage}
                  </div>
                ) : null}

                <div>
                  <label
                    htmlFor="fullName"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Full name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    required
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    placeholder="Enter your full name"
                  />
                </div>

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
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    placeholder="Create a password"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Use at least 8 characters.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="region"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    UK nation
                  </label>
                  <select
                    id="region"
                    required
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  >
                    <option value="">Select nation</option>
                    {regions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Creating account..." : "Create account"}
                </button>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-500">
                  After signing up, check your email and verify your account to
                  continue.
                </div>

                <div className="text-center text-sm text-slate-600">
                  Already have an account?{" "}
                  <Link
                    href="/auth/login"
                    className="font-semibold text-indigo-600 transition hover:text-indigo-700"
                  >
                    Log in
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