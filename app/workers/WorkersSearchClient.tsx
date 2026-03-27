"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import SaveWorkerButton from "@/components/workers/SaveWorkerButton";
import type { WorkerSearchItem } from "./page";
import { NI_LOCATION_OPTIONS, getAreaLabel } from "@/lib/ni-locations";

const DAY_OPTIONS = [
  { value: "all", label: "Any day" },
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

const DEFAULT_CATEGORY_OPTIONS = [
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

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function formatRate(worker: WorkerSearchItem) {
  if (worker.hourlyRate != null) return `GBP ${worker.hourlyRate}/hr`;
  if (worker.hourlyRateMin != null || worker.hourlyRateMax != null) {
    return `GBP ${worker.hourlyRateMin ?? 0}${
      worker.hourlyRateMax != null ? ` - ${worker.hourlyRateMax}` : ""
    }/hr`;
  }
  return "Rate not specified";
}

function getAvailabilityLabel(worker: WorkerSearchItem) {
  const availability = worker.availability || {};
  const days = Object.keys(availability);
  const hasSlots = days.some(
    (day) => Array.isArray(availability[day]) && availability[day].length > 0
  );

  if (worker.availabilityNotes?.trim()) return worker.availabilityNotes;
  if (!hasSlots) return "Availability not specified";

  const availableDays = days.filter(
    (day) => Array.isArray(availability[day]) && availability[day].length > 0
  );

  if (availableDays.length === 7) return "Available all week";
  if (availableDays.length >= 5) return "Available most days";
  if (availableDays.length > 0) return `Available on ${availableDays[0]}`;
  return "Availability not specified";
}

function isAvailableOnDay(worker: WorkerSearchItem, day: string) {
  if (day === "all") return true;
  const availability = worker.availability || {};
  return Array.isArray(availability[day]) && availability[day].length > 0;
}

function normalizeText(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

export default function WorkersSearchClient({
  workers,
}: {
  workers: WorkerSearchItem[];
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [area, setArea] = useState("all");
  const [selectedDay, setSelectedDay] = useState("all");
  const [btPrefix, setBtPrefix] = useState("all");

  const categories = useMemo(() => {
    const dbCategories = workers
      .map((w) => w.category)
      .filter(Boolean) as string[];

    return [...new Set([...DEFAULT_CATEGORY_OPTIONS, ...dbCategories])].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [workers]);

  const btOptions = useMemo(() => {
    const allPrefixes = new Set<string>();

    NI_LOCATION_OPTIONS.forEach((item) => {
      item.btPrefixes.forEach((prefix) => allPrefixes.add(prefix));
    });

    workers.forEach((worker) => {
      const postcode = (worker.postcode || "").toUpperCase().replace(/\s+/g, "");
      const match = postcode.match(/^BT\d{1,2}/);
      if (match) {
        allPrefixes.add(match[0]);
      }
    });

    return Array.from(allPrefixes).sort((a, b) => {
      const aNum = Number(a.replace("BT", ""));
      const bNum = Number(b.replace("BT", ""));
      return aNum - bNum;
    });
  }, [workers]);

  const filteredBtOptions = useMemo(() => {
    if (area === "all") return btOptions;

    const areaItem = NI_LOCATION_OPTIONS.find((item) => item.value === area);
    if (!areaItem) return btOptions;

    return btOptions.filter((prefix) => areaItem.btPrefixes.includes(prefix));
  }, [btOptions, area]);

  const filteredWorkers = useMemo(() => {
    const q = query.trim().toLowerCase();

    return workers.filter((worker) => {
      const haystack = [
        worker.fullName,
        worker.headline || "",
        worker.description || "",
        worker.category || "",
        worker.city || "",
        worker.areaSlug || "",
        worker.postcode || "",
        (worker.certifications || []).join(" "),
      ]
        .join(" ")
        .toLowerCase();

      const queryMatch = q ? haystack.includes(q) : true;

      const categoryMatch =
        category === "all"
          ? true
          : normalizeText(worker.category) === normalizeText(category);

      const areaMatch =
        area === "all" ? true : normalizeText(worker.areaSlug) === normalizeText(area);

      const availabilityMatch = isAvailableOnDay(worker, selectedDay);

      const normalizedPostcode = (worker.postcode || "")
        .toUpperCase()
        .replace(/\s+/g, "");

      const btMatch =
        btPrefix === "all" ? true : normalizedPostcode.startsWith(btPrefix);

      return queryMatch && categoryMatch && areaMatch && availabilityMatch && btMatch;
    });
  }, [workers, query, category, area, selectedDay, btPrefix]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Premium worker profiles</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">Find workers</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                Search workers across Northern Ireland by area, BT postcode,
                category, skills, and availability.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <span className="font-semibold text-slate-900">
                {filteredWorkers.length}
              </span>{" "}
              worker{filteredWorkers.length === 1 ? "" : "s"} found
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Search
              </label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name, skill, category, city, certification..."
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                NI area
              </label>
              <select
                value={area}
                onChange={(e) => {
                  const nextArea = e.target.value;
                  setArea(nextArea);

                  if (nextArea === "all") {
                    return;
                  }

                  const areaItem = NI_LOCATION_OPTIONS.find(
                    (item) => item.value === nextArea
                  );

                  if (
                    btPrefix !== "all" &&
                    areaItem &&
                    !areaItem.btPrefixes.includes(btPrefix)
                  ) {
                    setBtPrefix("all");
                  }
                }}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500"
              >
                <option value="all">All Northern Ireland</option>
                {NI_LOCATION_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                BT postcode
              </label>
              <select
                value={btPrefix}
                onChange={(e) => setBtPrefix(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500"
              >
                <option value="all">All BT areas</option>
                {filteredBtOptions.map((prefix) => (
                  <option key={prefix} value={prefix}>
                    {prefix}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500"
              >
                <option value="all">All categories</option>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Availability
              </label>
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500"
              >
                {DAY_OPTIONS.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredWorkers.length > 0 ? (
            filteredWorkers.map((worker) => (
              <article
                key={worker.id}
                className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-lg font-bold text-indigo-700">
                    {worker.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={worker.avatarUrl}
                        alt={worker.fullName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      getInitials(worker.fullName)
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-bold text-slate-900">
                      {worker.fullName}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-slate-600">
                      {worker.headline || worker.category || "Worker profile"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {worker.category ? (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {worker.category}
                        </span>
                      ) : null}
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        {worker.isOpenToWork ? "Open to work" : "Unavailable"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Area
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {getAreaLabel(worker.areaSlug)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      BT postcode
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {worker.postcode || "Not specified"}
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
                      Availability
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {getAvailabilityLabel(worker)}
                    </p>
                  </div>
                </div>

                <p className="mt-5 line-clamp-3 text-sm leading-7 text-slate-600">
                  {worker.description || "No description added yet."}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {(worker.certifications || []).slice(0, 3).map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200"
                    >
                      {item}
                    </span>
                  ))}
                </div>

                <div className="mt-6 flex gap-3">
                  <Link
                    href={`/workers/${worker.id}`}
                    className="flex-1 rounded-2xl bg-indigo-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-indigo-700"
                  >
                    View profile
                  </Link>

                  <SaveWorkerButton workerUserId={worker.userId} />
                </div>
              </article>
            ))
          ) : (
            <div className="md:col-span-2 xl:col-span-3">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm">
                <h3 className="text-2xl font-bold text-slate-900">No workers found</h3>
                <p className="mt-3 text-slate-600">
                  Try changing area, BT postcode, category, or availability.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}