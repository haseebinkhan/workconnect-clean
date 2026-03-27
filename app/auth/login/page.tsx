import { Suspense } from "react";
import LoginClient from "./LoginClient";

function LoginFallback() {
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
            Loading login page...
          </p>

          <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-indigo-600" />
          </div>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginClient />
    </Suspense>
  );
}