"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NI_LOCATION_OPTIONS, getPrefixesForArea } from "@/lib/ni-locations";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const SHIFTS = ["morning", "afternoon", "evening"] as const;

type AvailabilityState = Record<string, string[]>;

function buildInitialAvailability(): AvailabilityState {
  return DAYS.reduce((acc, day) => {
    acc[day] = [];
    return acc;
  }, {} as AvailabilityState);
}

function labelize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function WorkerForm() {
  const supabase = createClient();
  const router = useRouter();

  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [areaSlug, setAreaSlug] = useState("belfast");
  const [postcode, setPostcode] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [availabilityNotes, setAvailabilityNotes] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [showPhoneAfterAccept, setShowPhoneAfterAccept] = useState(true);
  const [showWhatsappAfterAccept, setShowWhatsappAfterAccept] = useState(true);
  const [availability, setAvailability] = useState<AvailabilityState>(
    buildInitialAvailability()
  );
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const allowedPrefixes = useMemo(
    () => getPrefixesForArea(areaSlug),
    [areaSlug]
  );

  function toggleShift(day: string, shift: string) {
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

    try {
      setLoading(true);
      setErrorMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        window.location.href = "/auth/login";
        return;
      }

      if (!category.trim()) {
        setErrorMessage("Please select or enter a worker category.");
        return;
      }

      if (!areaSlug.trim()) {
        setErrorMessage("Please select your Northern Ireland area.");
        return;
      }

      const normalizedPostcode = postcode.trim().toUpperCase().replace(/\s+/g, "");
      if (normalizedPostcode && allowedPrefixes.length > 0) {
        const prefixOk = allowedPrefixes.some((prefix) =>
          normalizedPostcode.startsWith(prefix)
        );
        if (!prefixOk) {
          setErrorMessage(
            `The postcode should match the selected area. Allowed prefixes: ${allowedPrefixes.join(", ")}`
          );
          return;
        }
      }

      const { error: workerError } = await supabase.from("worker_profiles").upsert(
        {
          user_id: user.id,
          headline: headline.trim() || null,
          description: description.trim() || null,
          category: category.trim() || null,
          city: city.trim() || null,
          area_slug: areaSlug,
          postcode: normalizedPostcode || null,
          hourly_rate: hourlyRate.trim() ? Number(hourlyRate) : null,
          availability,
          availability_notes: availabilityNotes.trim() || null,
          is_open_to_work: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

      if (workerError) {
        setErrorMessage(workerError.message);
        return;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          worker_enabled: true,
          city: city.trim() || null,
          area_slug: areaSlug,
          postcode: normalizedPostcode || null,
          phone_number: phoneNumber.trim() || null,
          whatsapp_number: whatsappNumber.trim() || null,
          show_phone_after_accept: showPhoneAfterAccept,
          show_whatsapp_after_accept: showWhatsappAfterAccept,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (profileError) {
        setErrorMessage(profileError.message);
        return;
      }

      router.push("/profile/worker");
      router.refresh();
    } catch (error) {
      console.error("worker form save error:", error);
      setErrorMessage("Could not save worker profile.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Worker basics</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-900">
          Create a profile with minimum effort
        </h2>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Category / skill
            </label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Plumber, Cleaner, Electrician"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Headline
            </label>
            <input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. Reliable local handyman"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Short description
            </label>
            <textarea
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your experience and the work you do"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Location</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-900">
          Northern Ireland area and BT postcode
        </h2>

        <div className="mt-6 grid gap-5 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              NI area
            </label>
            <select
              value={areaSlug}
              onChange={(e) => setAreaSlug(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500"
            >
              {NI_LOCATION_OPTIONS.map((location) => (
                <option key={location.value} value={location.value}>
                  {location.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              City / town
            </label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Belfast"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              BT postcode
            </label>
            <input
              value={postcode}
              onChange={(e) => setPostcode(e.target.value.toUpperCase())}
              placeholder={`e.g. ${allowedPrefixes[0] || "BT1"}`}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500"
            />
            <p className="mt-2 text-xs text-slate-500">
              Allowed prefixes for this area: {allowedPrefixes.join(", ")}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Availability</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-900">
          Day and shift availability
        </h2>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {DAYS.map((day) => (
            <div
              key={day}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <p className="font-semibold capitalize text-slate-900">{day}</p>
              <div className="mt-3 space-y-3">
                {SHIFTS.map((shift) => (
                  <label
                    key={shift}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2"
                  >
                    <span className="text-sm font-medium capitalize text-slate-700">
                      {labelize(shift)}
                    </span>
                    <input
                      type="checkbox"
                      checked={availability[day].includes(shift)}
                      onChange={() => toggleShift(day, shift)}
                      className="h-4 w-4"
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Availability notes
          </label>
          <input
            value={availabilityNotes}
            onChange={(e) => setAvailabilityNotes(e.target.value)}
            placeholder="e.g. Available immediately / weekends only"
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Contact and rate</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-900">
          Make hiring faster
        </h2>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Hourly rate
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              placeholder="Optional"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Phone number
            </label>
            <input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g. +447123456789"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              WhatsApp number
            </label>
            <input
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="e.g. +447123456789"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-sm font-medium text-slate-700">
              Show phone only after request accepted
            </span>
            <input
              type="checkbox"
              checked={showPhoneAfterAccept}
              onChange={(e) => setShowPhoneAfterAccept(e.target.checked)}
              className="h-4 w-4"
            />
          </label>

          <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-sm font-medium text-slate-700">
              Show WhatsApp only after request accepted
            </span>
            <input
              type="checkbox"
              checked={showWhatsappAfterAccept}
              onChange={(e) => setShowWhatsappAfterAccept(e.target.checked)}
              className="h-4 w-4"
            />
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? "Saving..." : "Save worker profile"}
        </button>
      </div>
    </form>
  );
}