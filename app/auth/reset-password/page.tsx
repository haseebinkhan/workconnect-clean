"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const supabase = await createClient();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(cleanEmail)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/update-password`
          : "http://localhost:3000/auth/update-password";

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setSent(true);
    } catch (error) {
      console.error("reset password error:", error);
      setErrorMessage("Could not send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Password recovery</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
            Reset password
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Enter your account email and we will send you a secure reset link.
          </p>

          {sent ? (
            <div className="mt-8 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="font-semibold text-emerald-800">Reset email sent</p>
              <p className="mt-2 text-sm leading-6 text-emerald-700">
                If this email is registered, a password reset link has been sent.
                Check your inbox and spam folder, then open the link to create a new password.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/auth/login"
                  className="inline-flex rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  Back to login
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setSent(false);
                    setEmail("");
                    setErrorMessage("");
                  }}
                  className="inline-flex rounded-2xl border border-emerald-300 bg-white px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                >
                  Send another email
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleReset} className="mt-8 space-y-5">
              {errorMessage ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              ) : null}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500"
                  placeholder="Enter your email"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Sending reset link..." : "Send reset link"}
              </button>

              <div className="text-center">
                <Link
                  href="/auth/login"
                  className="text-sm font-semibold text-slate-700 transition hover:text-slate-900"
                >
                  Back to login
                </Link>
              </div>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}

