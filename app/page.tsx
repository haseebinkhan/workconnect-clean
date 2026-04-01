import Link from "next/link";

const howItWorks = [
  {
    title: "1. Search locally",
    desc: "Find workers or jobs by area, category, and availability.",
  },
  {
    title: "2. Connect quickly",
    desc: "Chat directly, send requests, and agree details faster.",
  },
  {
    title: "3. Get it done",
    desc: "Manage work smoothly and build trust through reviews.",
  },
];

const features = [
  {
    title: "Local & fast",
    desc: "Connect with people and opportunities near your area quickly.",
  },
  {
    title: "Real-time chat",
    desc: "Message before hiring so expectations stay clear from the start.",
  },
  {
    title: "Trusted profiles",
    desc: "Profiles, reviews, and activity help users hire with confidence.",
  },
];

const hirerSteps = [
  "Browse worker profiles by category and location",
  "Shortlist workers and send direct requests",
  "Post jobs and manage incoming applications",
];

const workerSteps = [
  "Create a worker profile and show your availability",
  "Apply for nearby jobs that match your skills",
  "Receive requests and grow your local reputation",
];

const categories = [
  "Cleaner",
  "Electrician",
  "Plumber",
  "Painter",
  "Gardener",
  "Handyman",
  "Delivery",
  "Warehouse",
  "Hospitality",
  "Care",
  "Admin",
  "IT Support",
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 text-slate-900">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.15),transparent_50%)]" />

        <div className="relative mx-auto max-w-7xl px-6 py-24 text-center sm:py-28">
          <div className="mx-auto inline-flex items-center rounded-full border border-indigo-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700 shadow-sm">
            Local hiring made simple
          </div>

          <h1 className="mx-auto mt-6 max-w-5xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            Hire trusted local workers or{" "}
            <span className="text-indigo-600">find nearby jobs fast</span>
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            WorkConnect helps hirers and workers connect locally through direct
            messaging, job posts, worker profiles, and simple booking flows.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/workers"
              className="rounded-2xl bg-indigo-600 px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700"
            >
              Hire a Worker
            </Link>

            <Link
              href="/jobs"
              className="rounded-2xl border border-slate-300 bg-white px-8 py-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
            >
              Find Jobs
            </Link>
          </div>

          <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 text-left shadow-sm">
              <p className="text-sm font-semibold text-slate-900">
                Nearby workers
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Search by location, category, and local availability.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 text-left shadow-sm">
              <p className="text-sm font-semibold text-slate-900">
                Nearby jobs
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Discover practical work opportunities close to your area.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 text-left shadow-sm">
              <p className="text-sm font-semibold text-slate-900">
                Faster decisions
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Chat directly and move from enquiry to work more quickly.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold text-slate-900">
          How it works
        </h2>

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {howItWorks.map((item) => (
            <div
              key={item.title}
              className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 pb-20 md:grid-cols-3">
        {features.map((item) => (
          <div
            key={item.title}
            className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {item.desc}
            </p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-indigo-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
              For hirers
            </p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">
              Hire with clarity and speed
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Whether you need a one-off task or ongoing support, WorkConnect
              helps you find local workers and manage the process in one place.
            </p>

            <div className="mt-6 space-y-3">
              {hirerSteps.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700"
                >
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-6">
              <Link
                href="/workers"
                className="inline-flex rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                Browse workers
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
              For workers
            </p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">
              Find work and grow locally
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Show your skills, set your availability, apply for jobs, and build
              trust with hirers through your profile and completed work.
            </p>

            <div className="mt-6 space-y-3">
              {workerSteps.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700"
                >
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-6">
              <Link
                href="/become-worker"
                className="inline-flex rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Become a Worker
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <h2 className="text-center text-3xl font-bold text-slate-900">
          Popular categories
        </h2>

        <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-7 text-slate-600">
          Explore popular areas of work or create your profile to start offering
          services in the categories that match your skills.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {categories.map((cat) => (
            <Link
              key={cat}
              href="/workers"
              className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              {cat}
            </Link>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Link
            href="/become-worker"
            className="rounded-2xl border border-emerald-300 bg-emerald-50 px-6 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
          >
            Become a Worker
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="rounded-3xl bg-slate-900 p-12 text-center text-white shadow-xl">
          <h2 className="text-3xl font-bold">
            Start hiring or earning today
          </h2>

          <p className="mt-4 text-sm leading-7 text-slate-300">
            Join WorkConnect and connect with local workers, local jobs, and
            real nearby opportunities.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/auth/signup"
              className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
            >
              Create Account
            </Link>

            <Link
              href="/workers"
              className="rounded-xl border border-white px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Browse Workers
            </Link>

            <Link
              href="/jobs"
              className="rounded-xl border border-white px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Browse Jobs
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
