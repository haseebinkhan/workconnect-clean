"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { JOB_CATEGORIES } from "@/lib/categories";
import { NI_LOCATION_OPTIONS } from "@/lib/ni-locations";

const SHIFT_OPTIONS = ["morning", "afternoon", "night"] as const;
const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

type DayName = (typeof DAYS)[number];
type AvailabilityState = Record<DayName, string[]>;

function buildEmptyAvailability(): AvailabilityState {
  return {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: [],
  };
}

export default function BecomeWorkerForm({
  defaultFullName = "",
  defaultArea = "belfast",
  defaultCity = "",
}: {
  defaultFullName?: string;
  defaultArea?: string;
  defaultCity?: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [fullName, setFullName] = useState(defaultFullName);
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(
    JOB_CATEGORIES[0] || "General Labour"
  );
  const [areaSlug, setAreaSlug] = useState(defaultArea || "belfast");
  const [city, setCity] = useState(defaultCity);
  const [postcode, setPostcode] = useState("");
  const [hourlyRateMin, setHourlyRateMin] = useState("");
  const [hourlyRateMax, setHourlyRateMax] = useState("");
  const [availabilityNotes, setAvailabilityNotes] = useState("");
  const [availability, setAvailability] = useState<AvailabilityState>(
    buildEmptyAvailability()
  );
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function toggleShift(day: DayName, shift: string) {
    setAvailability((prev) => {
      const current = prev[day] || [];
      const next = current.includes(shift)
        ? current.filter((item) => item !== shift)
        : [...current, shift];

      return {
        ...prev,
        [day]: next,
      };
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const cleanFullName = fullName.trim();
    const cleanHeadline = headline.trim();
    const cleanDescription = description.trim();
    const cleanCity = city.trim();
    const cleanPostcode = postcode.trim().toUpperCase();
    const cleanNotes = availabilityNotes.trim();

    if (!cleanFullName) {
      setErrorMessage("Please enter your full name.");
      return;
    }

    if (!cleanHeadline) {
      setErrorMessage("Please enter a short headline.");
      return;
    }

    if (!cleanDescription) {
      setErrorMessage("Please enter your description.");
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/auth/login");
        return;
      }

      const minRate = hourlyRateMin ? Number(hourlyRateMin) : null;
      const maxRate = hourlyRateMax ? Number(hourlyRateMax) : null;

      if (minRate != null && Number.isNaN(minRate)) {
        setErrorMessage("Minimum hourly rate is invalid.");
        return;
      }

      if (maxRate != null && Number.isNaN(maxRate)) {
        setErrorMessage("Maximum hourly rate is invalid.");
        return;
      }

      if (minRate != null && maxRate != null && minRate > maxRate) {
        setErrorMessage("Minimum hourly rate cannot be greater than maximum.");
        return;
      }

      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          full_name: cleanFullName,
          city: cleanCity || null,
          area_slug: areaSlug || "belfast",
          postcode: cleanPostcode || null,
          worker_enabled: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      if (profileError) {
        setErrorMessage(profileError.message);
        return;
      }

      const { error: workerError } = await supabase
        .from("worker_profiles")
        .upsert(
          {
            user_id: user.id,
            headline: cleanHeadline,
            description: cleanDescription,
            category,
            area_slug: areaSlug || "belfast",
            city: cleanCity || null,
            postcode: cleanPostcode || null,
            hourly_rate_min: minRate,
            hourly_rate_max: maxRate,
            availability,
            availability_notes: cleanNotes || null,
            is_open_to_work: true,
            currency_code: "GBP",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (workerError) {
        setErrorMessage(workerError.message);
        return;
      }

      router.push("/workers");
      router.refresh();
    } catch (error) {
      console.error("become worker error:", error);
      setErrorMessage("Could not create worker profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Full name
          </label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            placeholder="Enter your full name"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          >
            {JOB_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Headline
        </label>
        <input
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          placeholder="Example: Reliable local cleaner and home helper"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Description
        </label>
        <textarea
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          placeholder="Describe your skills, experience, reliability, and the kind of work you do."
        />
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            NI area
          </label>
          <select
            value={areaSlug}
            onChange={(e) => setAreaSlug(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          >
            {NI_LOCATION_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            City
          </label>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            placeholder="Example: Belfast"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            BT postcode
          </label>
          <input
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 uppercase outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            placeholder="Example: BT7"
          />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Hourly rate min
          </label>
          <input
            type="number"
            min="0"
            value={hourlyRateMin}
            onChange={(e) => setHourlyRateMin(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            placeholder="12"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Hourly rate max
          </label>
          <input
            type="number"
            min="0"
            value={hourlyRateMax}
            onChange={(e) => setHourlyRateMax(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            placeholder="18"
          />
        </div>
      </div>

      <div>
        <label className="mb-3 block text-sm font-medium text-slate-700">
          Availability
        </label>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {DAYS.map((day) => (
            <div
              key={day}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <p className="font-semibold capitalize text-slate-900">{day}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                {SHIFT_OPTIONS.map((shift) => {
                  const active = availability[day].includes(shift);

                  return (
                    <button
                      key={shift}
                      type="button"
                      onClick={() => toggleShift(day, shift)}
                      className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                        active
                          ? "bg-emerald-600 text-white"
                          : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {shift}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <textarea
          rows={3}
          value={availabilityNotes}
          onChange={(e) => setAvailabilityNotes(e.target.value)}
          className="mt-4 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          placeholder="Optional notes, for example: weekends only, evening shifts, flexible mornings"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Saving..." : "Create worker profile"}
      </button>
    </form>
  );
}
