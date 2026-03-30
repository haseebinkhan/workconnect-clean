"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const [message, setMessage] = useState("Verifying your account...");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function handleAuthCallback() {
      try {
        const code = searchParams.get("code");
        const type = searchParams.get("type");
        const next = searchParams.get("next");

        let redirectTo = "/dashboard";

        if (type === "recovery") {
          redirectTo = "/auth/update-password";
        } else if (next && next.startsWith("/")) {
          redirectTo = next;
        }

        if (mounted) {
          setMessage(
            type === "recovery"
              ? "Preparing password reset..."
              : "Verifying your account..."
          );
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            throw error;
          }
        } else {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (!session?.user) {
            throw new Error("Verification session could not be created.");
          }
        }

        window.location.href = redirectTo;
      } catch (error) {
        console.error("auth callback error:", error);

        if (mounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Could not complete verification."
          );
          setMessage("We could not complete your sign-in.");
        }

        setTimeout(() => {
          window.location.href = "/auth/login";
        }, 2500);
      }
    }

    void handleAuthCallback();

    return () => {
      mounted = false;
    };
  }, [searchParams, supabase]);

  return (
    <main className="min-h-[calc(100vh-140px)] bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <section className="mx-auto flex min-h-[calc(100vh-140px)] max-w-7xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md rounded-[2rem] border border-white/70 bg-white/90 p-8 text-center shadow-xl shadow-slate-200/60 backdrop-blur">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-xl font-bold text-white shadow-lg">
            W
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            WorkConnect
          </h1>

          <p className="mt-4 text-sm leading-6 text-slate-600">
            {message}
          </p>

          {errorMessage ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-indigo-600" />
          </div>
        </div>
      </section>
    </main>
  );
}