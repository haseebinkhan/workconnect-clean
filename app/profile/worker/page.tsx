"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { JOB_CATEGORIES } from "@/lib/categories";
import { useToast } from "@/components/ui/ToastProvider";

const CERTIFICATION_OPTIONS = [
  "SIA Door Supervisor",
  "SIA Security Guard",
  "SIA CCTV",
  "First Aid",
  "Manual Handling",
  "Food Hygiene",
  "CSCS Card",
  "Forklift Licence",
  "Driving Licence",
  "DBS Checked",
];

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const SHIFT_OPTIONS = ["morning", "afternoon", "night"];

export default function WorkerProfileEditPage() {
  const supabase = createClient();
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General Labour");
  const [experienceYears, setExperienceYears] = useState("0");
  const [hourlyRateMin, setHourlyRateMin] = useState("");
  const [hourlyRateMax, setHourlyRateMax] = useState("");
  const [availabilityNotes, setAvailabilityNotes] = useState("");
  const [certifications, setCertifications] = useState<string[]>([]);
  const [availability, setAvailability] = useState<Record<string, string[]>>({});
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/auth/login");
          return;
        }

        const { data, error } = await supabase
          .from("worker_profiles")
          .select(`
            headline,
            description,
            category,
            experience_years,
            hourly_rate_min,
            hourly_rate_max,
            certifications,
            availability_notes,
            availability,
            is_public
          `)
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("load worker profile error:", error);
          showToast("Could not load worker profile.", "error");
          return;
        }

        if (data && mounted) {
          setHeadline(data.headline || "");
          setDescription(data.description || "");
          setCategory(data.category || "General Labour");
          setExperienceYears(String(data.experience_years ?? 0));
          setHourlyRateMin(
            data.hourly_rate_min != null ? String(data.hourly_rate_min) : ""
          );
          setHourlyRateMax(
            data.hourly_rate_max != null ? String(data.hourly_rate_max) : ""
          );
          setAvailabilityNotes(data.availability_notes || "");
          setCertifications(Array.isArray(data.certifications) ? data.certifications : []);
          setAvailability(
            data.availability && typeof data.availability === "object"
              ? (data.availability as Record<string, string[]>)
              : {}
          );
          setIsPublic(data.is_public ?? true);
        }
      } catch (error) {
        console.error("worker profile load error:", error);
        showToast("Could not load worker profile.", "error");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      mounted = false;
    };
  }, [router, showToast, supabase]);

  const toggleCertification = (value: string) => {
    setCertifications((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    );
  };

  const toggleShift = (day: string, shift: string) => {
    setAvailability((prev) => {
      const dayShifts = prev[day] || [];
      const next = dayShifts.includes(shift)
        ? dayShifts.filter((item) => item !== shift)
        : [...dayShifts, shift];

      return {
        ...prev,
        [day]: next,
      };
    });
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const minRate = hourlyRateMin ? Number(hourlyRateMin) : null;
    const maxRate = hourlyRateMax ? Number(hourlyRateMax) : null;
    const years = Number(experienceYears || 0);

    if (Number.isNaN(years) || years < 0) {
      showToast("Experience years must be 0 or more.", "error");
      return;
    }

    if (minRate != null && Number.isNaN(minRate)) {
      showToast("Hourly rate min is invalid.", "error");
      return;
    }

    if (maxRate != null && Number.isNaN(maxRate)) {
      showToast("Hourly rate max is invalid.", "error");
      return;
    }

    if (minRate != null && maxRate != null && minRate > maxRate) {
      showToast("Hourly rate min cannot be greater than hourly rate max.", "error");
      return;
    }

    try {
      setSaving(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setSaving(false);
        router.replace("/auth/login");
        return;
      }

      const payload = {
        user_id: user.id,
        headline: headline.trim() || null,
        description: description.trim() || null,
        category,
        experience_years: years,
        hourly_rate_min: minRate,
        hourly_rate_max: maxRate,
        certifications,
        availability_notes: availabilityNotes.trim() || null,
        availability,
        is_open_to_work: true,
        is_public: isPublic,
        currency_code: "GBP",
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("worker_profiles")
        .upsert(payload, { onConflict: "user_id" });

      if (error) {
        console.error("save worker profile error:", error);
        showToast(error.message || "Could not update worker profile.", "error");
        return;
      }

      showToast("Worker profile updated successfully.", "success");
      router.push("/workers");
      router.refresh();
    } catch (error) {
      console.error("worker profile save error:", error);
      showToast("Could not update worker profile.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <section className="mx-auto max-w-5xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          Loading...
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <section className="mx-auto max-w-5xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Premium worker profile</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Edit worker profile
        </h1>

        <form onSubmit={handleSave} className="mt-8 space-y-8">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-900">Public visibility</p>
            <p className="mt-2 text-sm text-slate-600">
              Choose whether your worker profile is visible publicly.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  isPublic
                    ? "bg-emerald-600 text-white"
                    : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                }`}
              >
                Public
              </button>

              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  !isPublic
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                }`}
              >
                Hidden
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              {isPublic
                ? "Your worker profile will appear in public search and profile pages."
                : "Your worker profile will be hidden from public search and public profile pages."}
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Headline
              </label>
              <input
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                placeholder="Example: SIA licensed security officer"
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
              Description
            </label>
            <textarea
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              placeholder="Describe your skills, reliability and work background..."
            />
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Experience (years)
              </label>
              <input
                type="number"
                min="0"
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              />
            </div>

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
              Certifications
            </label>
            <div className="flex flex-wrap gap-3">
              {CERTIFICATION_OPTIONS.map((item) => (
                <label
                  key={item}
                  className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition ${
                    certifications.includes(item)
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={certifications.includes(item)}
                    onChange={() => toggleCertification(item)}
                    className="hidden"
                  />
                  {item}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-3 block text-sm font-medium text-slate-700">
              Availability calendar
            </label>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="font-semibold text-slate-900">
                    {day.charAt(0).toUpperCase() + day.slice(1)}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {SHIFT_OPTIONS.map((shift) => {
                      const active = (availability[day] || []).includes(shift);

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
              placeholder="Optional notes, for example: available weekends or night shifts only"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save worker profile"}
          </button>
        </form>
      </section>
    </main>
  );
}

