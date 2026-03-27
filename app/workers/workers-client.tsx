"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { WorkerItem, WorkerNamesMap } from "@/types/worker";
import { JOB_CATEGORIES } from "@/lib/categories";

type Props = {
  initialWorkers: WorkerItem[];
  workerNames: WorkerNamesMap;
  userArea: string;
};

const AREA_OPTIONS = [
  "all",
  "belfast",
  "carrickfergus",
  "newtownabbey",
  "lisburn",
  "bangor",
  "newtownards",
  "antrim",
  "coleraine",
  "ballymena",
  "larne",
  "omagh",
  "derry",
  "enniskillen",
  "armagh",
  "newry",
  "portadown",
  "lurgan",
  "downpatrick",
  "cookstown",
  "magherafelt",
];

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

const SHIFT_OPTIONS = [
  { value: "all", label: "Any shift" },
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "night", label: "Night" },
];

function titleCase(value: string | null | undefined) {
  if (!value) return "";
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-amber-400">
      <path d="M12 2.8l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16l-5.2 2.8 1-5.8-4.2-4.1 5.8-.8L12 2.8z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="M12 21s6-4.5 6-10a6 6 0 1 0-12 0c0 5.5 6 10 6 10Z" />
      <circle cx="12" cy="11" r="2.5" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </svg>
  );
}

function CertificateIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <circle cx="12" cy="8" r="4" />
      <path d="M8.5 13.5 7 21l5-2 5 2-1.5-7.5" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M4 7h16v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" />
      <path d="M4 11h16" />
    </svg>
  );
}

function matchesAvailability(
  availability: Record<string, string[]>,
  selectedDay: string,
  selectedShift: string
) {
  if (selectedDay === "all" && selectedShift === "all") return true;

  if (selectedDay !== "all") {
    const dayShifts = availability[selectedDay] || [];
    if (selectedShift === "all") return dayShifts.length > 0;
    return dayShifts.includes(selectedShift);
  }

  return Object.values(availability).some((shifts) =>
    shifts.includes(selectedShift)
  );
}

function getRateLabel(worker: WorkerItem) {
  if (worker.hourly_rate_min && worker.hourly_rate_max) {
    return `GBP ${worker.hourly_rate_min}-${worker.hourly_rate_max}/hr`;
  }

  if (worker.hourly_rate) {
    return `GBP ${worker.hourly_rate}/hr`;
  }

  if (worker.hourly_rate_min) {
    return `From GBP ${worker.hourly_rate_min}/hr`;
  }

  return "Rate not set";
}

export default function WorkersClient({
  initialWorkers,
  workerNames,
  userArea,
}: Props) {
  const [search, setSearch] = useState("");
  const [selectedArea, setSelectedArea] = useState("all");
  const [selectedDay, setSelectedDay] = useState("all");
  const [selectedShift, setSelectedShift] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [openOnly, setOpenOnly] = useState(true);

  const filteredWorkers = useMemo(() => {
    return initialWorkers.filter((worker) => {
      const nameData = workerNames[worker.user_id];
      const fullName = nameData?.full_name || "Worker";
      const city = worker.city || nameData?.city || "";
      const postcode = worker.postcode || nameData?.postcode || "";
      const category = worker.category || "";
      const headline = worker.headline || "";
      const description = worker.description || "";
      const areaSlug = worker.area_slug || "";
      const certifications = (worker.certifications || []).join(" ");

      const haystack = [
        fullName,
        city,
        postcode,
        category,
        headline,
        description,
        areaSlug,
        certifications,
      ]
        .join(" ")
        .toLowerCase();

      const searchMatch = search.trim()
        ? haystack.includes(search.trim().toLowerCase())
        : true;

      const areaMatch =
        selectedArea === "all" ? true : (worker.area_slug || "") === selectedArea;

      const availabilityMatch = matchesAvailability(
        worker.availability,
        selectedDay,
        selectedShift
      );

      const categoryMatch =
        selectedCategory === "all"
          ? true
          : (worker.category || "").toLowerCase() === selectedCategory.toLowerCase();

      const openMatch = openOnly ? worker.is_open_to_work : true;

      return searchMatch && areaMatch && availabilityMatch && categoryMatch && openMatch;
    });
  }, [
    initialWorkers,
    workerNames,
    search,
    selectedArea,
    selectedDay,
    selectedShift,
    selectedCategory,
    openOnly,
  ]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <section className="mx-auto max-w-7xl">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Premium worker profiles</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">Find workers</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                Search workers across Northern Ireland by category, experience, certifications, availability and profile details.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{filteredWorkers.length}</span>{" "}
              worker{filteredWorkers.length === 1 ? "" : "s"} found
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Search
              </label>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 py-3">
                <SearchIcon />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, certification, category or area"
                  className="w-full bg-transparent outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Area
              </label>
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none"
              >
                {AREA_OPTIONS.map((area) => (
                  <option key={area} value={area}>
                    {area === "all" ? "All Northern Ireland" : titleCase(area)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Day
              </label>
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none"
              >
                {DAY_OPTIONS.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Shift
              </label>
              <select
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none"
              >
                {SHIFT_OPTIONS.map((shift) => (
                  <option key={shift.value} value={shift.value}>
                    {shift.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto]">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none"
              >
                <option value="all">All categories</option>
                {JOB_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <label className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={openOnly}
                  onChange={(e) => setOpenOnly(e.target.checked)}
                  className="h-4 w-4"
                />
                Open to work only
              </label>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSelectedArea("all");
                  setSelectedDay("all");
                  setSelectedShift("all");
                  setSelectedCategory("all");
                  setOpenOnly(true);
                }}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Reset filters
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredWorkers.length > 0 ? (
            filteredWorkers.map((worker) => {
              const nameData = workerNames[worker.user_id];
              const fullName = nameData?.full_name || "Worker";
              const city = worker.city || nameData?.city || worker.area_slug || "Local area";
              const postcode = worker.postcode || nameData?.postcode || "";
              const shiftsSummary =
                selectedDay !== "all"
                  ? worker.availability[selectedDay]?.join(", ") || "No shifts listed"
                  : Object.values(worker.availability).flat().slice(0, 3).join(", ") ||
                    "No shifts listed";

              return (
                <article
                  key={worker.id}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold text-white">
                      {fullName.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-xl font-bold text-slate-900">
                          {fullName}
                        </h2>

                        {worker.is_open_to_work ? (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                            Available
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                            Unavailable
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                        <LocationIcon />
                        <span>
                          {titleCase(city)}
                          {postcode ? ` · ${postcode}` : ""}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {worker.category ? titleCase(worker.category) : "General Help"}
                    </span>

                    {worker.experience_years > 0 && (
                      <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                        {worker.experience_years}+ years experience
                      </span>
                    )}
                  </div>

                  <p className="mt-4 font-semibold text-slate-900">
                    {worker.headline || "Local professional ready to help"}
                  </p>

                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {worker.description || "No description added yet."}
                  </p>

                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Rate</p>
                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {getRateLabel(worker)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Rating</p>
                      <div className="mt-1 flex items-center gap-1">
                        <StarIcon />
                        <p className="text-sm font-bold text-slate-900">
                          {worker.rating_avg.toFixed(1)}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Jobs</p>
                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {worker.jobs_completed}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <CertificateIcon />
                      <span>Certifications</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {worker.certifications.length > 0 ? (
                        worker.certifications.map((cert) => (
                          <span
                            key={cert}
                            className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
                          >
                            {cert}
                          </span>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">No certifications listed</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <BriefcaseIcon />
                      <span>Availability calendar</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      {["monday","tuesday","wednesday","thursday","friday","saturday","sunday"].map((day) => (
                        <div
                          key={day}
                          className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200"
                        >
                          <p className="font-semibold text-slate-700">{titleCase(day)}</p>
                          <p className="mt-1 text-slate-500">
                            {worker.availability[day]?.length
                              ? worker.availability[day].join(", ")
                              : "Unavailable"}
                          </p>
                        </div>
                      ))}
                    </div>

                    <p className="mt-3 text-sm text-slate-600">
                      {worker.availability_notes || shiftsSummary}
                    </p>
                  </div>

                  <div className="mt-5 flex gap-3">
                    <Link
                      href={`/workers/${worker.id}`}
                      className="flex-1 rounded-2xl bg-indigo-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-indigo-700"
                    >
                      View profile
                    </Link>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="md:col-span-2 xl:col-span-3">
              <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                <h3 className="text-2xl font-bold text-slate-900">No workers found</h3>
                <p className="mt-3 text-slate-600">
                  Try changing category, area, day, shift or search filters.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}