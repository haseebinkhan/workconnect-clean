"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  getCities,
  getPostcodePrefixes,
  getRegions,
} from "@/lib/uk-locations";

type WorkerItem = {
  id: string;
  user_id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  headline?: string | null;
  description?: string | null;
  category?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  area_slug?: string | null;
  postcode?: string | null;
  postcode_prefix?: string | null;
  postcode_full?: string | null;
  hourly_rate?: number | null;
  hourly_rate_min?: number | null;
  hourly_rate_max?: number | null;
  rating_avg?: number | null;
  rating_count?: number | null;
  jobs_completed?: number | null;
  is_open_to_work?: boolean | null;
  is_public?: boolean | null;
  availability_notes?: string | null;
};

const CATEGORY_OPTIONS = [
  "General Labour",
  "Cleaner",
  "Domestic Cleaner",
  "Office Cleaner",
  "Plumber",
  "Electrician",
  "Handyman",
  "Painter",
  "Decorator",
  "Carpenter",
  "Tiler",
  "Plasterer",
  "Roofer",
  "Bricklayer",
  "Gardener",
  "Landscaper",
  "Mover",
  "Delivery Driver",
  "Warehouse Worker",
  "Kitchen Staff",
  "Waiter",
  "Bar Staff",
  "Retail Assistant",
  "Security",
  "Care Assistant",
  "Babysitter",
  "Dog Walker",
  "Pet Care",
  "Tutor",
  "IT Support",
  "Admin Support",
  "Event Staff",
  "Removal Help",
];

function initials(name?: string | null) {
  const text = (name || "W").trim();
  return text
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function formatLocation(worker: WorkerItem) {
  const parts = [worker.city, worker.region, worker.country].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");
  if (worker.postcode_prefix) return worker.postcode_prefix;
  if (worker.postcode_full) return worker.postcode_full;
  if (worker.postcode) return worker.postcode;
  if (worker.area_slug) return worker.area_slug;
  return "Location not specified";
}

function formatRate(worker: WorkerItem) {
  if (worker.hourly_rate != null) return `GBP ${worker.hourly_rate}/hr`;
  if (worker.hourly_rate_min != null || worker.hourly_rate_max != null) {
    return `GBP ${worker.hourly_rate_min ?? 0}${
      worker.hourly_rate_max != null ? ` - ${worker.hourly_rate_max}` : ""
    }/hr`;
  }
  return "Rate not specified";
}

export default function WorkersSearchClient({
  initialWorkers,
}: {
  initialWorkers: WorkerItem[];
}) {
  const regions = useMemo(() => getRegions(), []);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [postcodePrefix, setPostcodePrefix] = useState("");
  const [openOnly, setOpenOnly] = useState(true);
  const [minRate, setMinRate] = useState("");
  const [maxRate, setMaxRate] = useState("");

  const cityOptions = useMemo(() => getCities(region), [region]);
  const postcodePrefixOptions = useMemo(
    () => getPostcodePrefixes(region, city),
    [region, city]
  );

  const filteredWorkers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const min = minRate.trim() ? Number(minRate) : null;
    const max = maxRate.trim() ? Number(maxRate) : null;

    return (initialWorkers || []).filter((worker) => {
      if (!worker) return false;
      if (worker.is_public === false) return false;
      if (openOnly && !worker.is_open_to_work) return false;

      if (category && worker.category !== category) return false;
      if (region && worker.region !== region) return false;
      if (city && worker.city !== city) return false;

      if (postcodePrefix) {
        const workerPrefix =
          worker.postcode_prefix || worker.postcode || worker.postcode_full || "";
        if (!workerPrefix.toUpperCase().startsWith(postcodePrefix.toUpperCase())) {
          return false;
        }
      }

      const effectiveRate =
        worker.hourly_rate ??
        worker.hourly_rate_min ??
        worker.hourly_rate_max ??
        null;

      if (min != null && !Number.isNaN(min)) {
        if (effectiveRate == null || effectiveRate < min) return false;
      }

      if (max != null && !Number.isNaN(max)) {
        if (effectiveRate == null || effectiveRate > max) return false;
      }

      if (q) {
        const haystack = [
          worker.full_name,
          worker.headline,
          worker.description,
          worker.category,
          worker.city,
          worker.region,
          worker.postcode_prefix,
          worker.postcode_full,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [
    initialWorkers,
    search,
    category,
    region,
    city,
    postcodePrefix,
    openOnly,
    minRate,
    maxRate,
  ]);

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="xl:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Search workers
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, skill, city, or category"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All categories</option>
              {CATEGORY_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
            <input
              type="checkbox"
              checked={openOnly}
              onChange={(e) => setOpenOnly(e.target.checked)}
            />
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Open to work only
              </p>
              <p className="text-xs text-slate-500">
                Show currently available workers
              </p>
            </div>
          </label>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Nation / region
            </label>
            <select
              value={region}
              onChange={(e) => {
                setRegion(e.target.value);
                setCity("");
                setPostcodePrefix("");
              }}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All regions</option>
              {regions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              City / town
            </label>
            <select
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setPostcodePrefix("");
              }}
              disabled={!region}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
            >
              <option value="">
                {region ? "All cities" : "Select region first"}
              </option>
              {cityOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Postcode prefix
            </label>
            <select
              value={postcodePrefix}
              onChange={(e) => setPostcodePrefix(e.target.value)}
              disabled={!region || !city}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
            >
              <option value="">
                {city ? "All postcode prefixes" : "Select city first"}
              </option>
              {postcodePrefixOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Min rate
              </label>
              <input
                type="number"
                value={minRate}
                onChange={(e) => setMinRate(e.target.value)}
                placeholder="0"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Max rate
              </label>
              <input
                type="number"
                value={maxRate}
                onChange={(e) => setMaxRate(e.target.value)}
                placeholder="100"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            {filteredWorkers.length} worker
            {filteredWorkers.length === 1 ? "" : "s"} found
          </p>
        </div>

        {filteredWorkers.length === 0 ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              No workers found
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Try changing the filters or searching a nearby city.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredWorkers.map((worker) => (
              <article
                key={worker.id}
                className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-lg font-bold text-indigo-700">
                    {worker.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={worker.avatar_url}
                        alt={worker.full_name || "Worker"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      initials(worker.full_name)
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-lg font-bold text-slate-900">
                      {worker.full_name || "Worker"}
                    </h2>
                    <p className="mt-1 text-sm font-medium text-slate-600">
                      {worker.headline || worker.category || "Worker profile"}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {worker.category ? (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {worker.category}
                        </span>
                      ) : null}

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          worker.is_open_to_work
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {worker.is_open_to_work ? "Open to work" : "Unavailable"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Location
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {formatLocation(worker)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Rate
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {formatRate(worker)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Rating
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {worker.rating_avg != null
                        ? `${Number(worker.rating_avg).toFixed(1)} (${
                            worker.rating_count ?? 0
                          })`
                        : "No rating yet"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Jobs completed
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {worker.jobs_completed ?? 0}
                    </p>
                  </div>
                </div>

                <p className="mt-5 line-clamp-3 text-sm leading-7 text-slate-600">
                  {worker.description ||
                    worker.availability_notes ||
                    "No description added yet."}
                </p>

                <div className="mt-6 flex gap-3">
                  <Link
                    href={`/workers/${worker.id}`}
                    className="flex-1 rounded-2xl bg-indigo-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-indigo-700"
                  >
                    View worker
                  </Link>

                  <Link
                    href={`/workers/${worker.id}`}
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                  >
                    Contact
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
