import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 text-slate-900">

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.15),transparent_50%)]" />

        <div className="relative mx-auto max-w-7xl px-6 py-24 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl leading-tight">
            Find trusted local workers{" "}
            <span className="text-indigo-600">near you instantly</span>
          </h1>

          <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">
            Hire skilled workers for jobs or offer your services. 
            Fast, local, and reliable hiring — all in one platform.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/workers"
              className="rounded-2xl bg-indigo-600 px-8 py-4 text-white font-semibold shadow-lg hover:bg-indigo-700 transition"
            >
              Hire a Worker
            </Link>

            <Link
              href="/jobs"
              className="rounded-2xl border border-slate-300 px-8 py-4 font-semibold hover:bg-slate-100 transition"
            >
              Find Jobs
            </Link>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <h2 className="text-3xl font-bold text-center text-slate-900">
          How it works
        </h2>

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {[
            {
              title: "1. Find Workers",
              desc: "Search by location, skills, and availability.",
            },
            {
              title: "2. Contact Instantly",
              desc: "Chat, call, or send a request with meeting time.",
            },
            {
              title: "3. Get the Job Done",
              desc: "Agree, complete, and leave reviews.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-3xl bg-white p-8 shadow-sm border hover:shadow-lg transition text-center"
            >
              <h3 className="text-lg font-bold text-slate-900">
                {item.title}
              </h3>
              <p className="mt-3 text-slate-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-7xl px-6 pb-20 grid md:grid-cols-3 gap-8">
        {[
          {
            title: "Local & Fast",
            desc: "Hire workers near your area instantly.",
          },
          {
            title: "Real-time Chat",
            desc: "Communicate directly with workers before hiring.",
          },
          {
            title: "Trusted Profiles",
            desc: "Ratings, reviews, and verified users.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-3xl bg-white p-8 shadow-sm border hover:shadow-lg transition"
          >
            <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
            <p className="mt-3 text-slate-600">{item.desc}</p>
          </div>
        ))}
      </section>

      {/* CATEGORIES */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <h2 className="text-3xl font-bold text-center text-slate-900">
          Popular categories
        </h2>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {[
            "Plumber",
            "Electrician",
            "Cleaner",
            "Painter",
            "Gardener",
            "Handyman",
            "Driver",
            "Security",
            "Kitchen Staff",
          ].map((cat) => (
            <Link
              key={cat}
              href="/workers"
              className="rounded-full border px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
            >
              {cat}
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="rounded-3xl bg-slate-900 text-white p-12 text-center shadow-xl">
          <h2 className="text-3xl font-bold">
            Start hiring or earning today
          </h2>

          <p className="mt-4 text-slate-300">
            Join WorkConnect and connect with real local opportunities instantly.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/auth/signup"
              className="bg-white text-slate-900 px-6 py-3 rounded-xl font-semibold hover:bg-slate-200"
            >
              Create Account
            </Link>

            <Link
              href="/workers"
              className="border border-white px-6 py-3 rounded-xl font-semibold hover:bg-slate-800"
            >
              Browse Workers
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
