"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const days = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const shifts = ["morning", "afternoon", "night"] as const;

type DayName = (typeof days)[number];
type ShiftName = (typeof shifts)[number];
type AvailabilityState = Record<DayName, ShiftName[]>;

const emptyAvailability: AvailabilityState = {
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: [],
};

const UK_COUNTRIES = [
  { value: "United Kingdom", label: "United Kingdom" },
];

const UK_REGIONS = [
  { value: "England", label: "England" },
  { value: "Northern Ireland", label: "Northern Ireland" },
  { value: "Scotland", label: "Scotland" },
  { value: "Wales", label: "Wales" },
];

function labelize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizeAvailability(input: unknown): AvailabilityState {
  const result: AvailabilityState = {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: [],
  };

  if (!input || typeof input !== "object") return result;

  for (const day of days) {
    const value = (input as Record<string, unknown>)[day];
    if (Array.isArray(value)) {
      result[day] = value.filter((item) =>
        shifts.includes(item as ShiftName)
      ) as ShiftName[];
    }
  }

  return result;
}

function slugifyArea(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

export default function ProfileForm({
  initialFullName,
  initialEmail,
  initialCity,
  initialPostcode,
  initialAreaSlug,
  initialWorkerEnabled,
  initialHirerEnabled,
  initialAvailability,
  initialPhoneNumber,
  initialWhatsappNumber,
  initialShowPhoneAfterAccept,
  initialShowWhatsappAfterAccept,
  initialBio,
  initialCountry,
  initialRegion,
}: {
  initialFullName: string;
  initialEmail: string;
  initialCity: string;
  initialPostcode: string;
  initialAreaSlug: string;
  initialWorkerEnabled: boolean;
  initialHirerEnabled: boolean;
  initialAvailability: unknown;
  initialPhoneNumber: string;
  initialWhatsappNumber: string;
  initialShowPhoneAfterAccept: boolean;
  initialShowWhatsappAfterAccept: boolean;
  initialBio: string;
  initialCountry: string;
  initialRegion: string;
}) {
  const supabase = await createClient();
  const router = useRouter();

  const [fullName, setFullName] = useState(initialFullName);
  const [email] = useState(initialEmail);
  const [country, setCountry] = useState(initialCountry || "United Kingdom");
  const [region, setRegion] = useState(initialRegion || "Northern Ireland");
  const [city, setCity] = useState(initialCity);
  const [postcode, setPostcode] = useState(initialPostcode);
  const [areaSlug, setAreaSlug] = useState(initialAreaSlug || "belfast");
  const [workerEnabled] = useState(initialWorkerEnabled);
  const [hirerEnabled] = useState(initialHirerEnabled);
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [whatsappNumber, setWhatsappNumber] = useState(initialWhatsappNumber);
  const [showPhoneAfterAccept, setShowPhoneAfterAccept] = useState(
    initialShowPhoneAfterAccept
  );
  const [showWhatsappAfterAccept, setShowWhatsappAfterAccept] = useState(
    initialShowWhatsappAfterAccept
  );
  const [bio, setBio] = useState(initialBio);
  const [availability, setAvailability] = useState<AvailabilityState>(
    normalizeAvailability(initialAvailability || emptyAvailability)
  );

  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const toggleShift = (day: DayName, shift: ShiftName) => {
    setAvailability((prev) => {
      const current = prev[day];
      const exists = current.includes(shift);

      return {
        ...prev,
        [day]: exists
          ? current.filter((item) => item !== shift)
          : [...current, shift],
      };
    });
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    if (!fullName.trim()) {
      setLoading(false);
      setErrorMessage("Full name is required.");
      return;
    }

    if (!country.trim()) {
      setLoading(false);
      setErrorMessage("Country is required.");
      return;
    }

    if (!region.trim()) {
      setLoading(false);
      setErrorMessage("Region is required.");
      return;
    }

    const computedAreaSlug =
      areaSlug?.trim() || slugifyArea(city || region || "uk");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setLoading(false);
      setErrorMessage("Please log in again.");
      router.push("/auth/login");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim() || null,
        country: country.trim() || null,
        region: region.trim() || null,
        city: city.trim() || null,
        postcode: postcode.trim() || null,
        area_slug: computedAreaSlug,
        phone_number: phoneNumber.trim() || null,
        whatsapp_number: whatsappNumber.trim() || null,
        show_phone_after_accept: showPhoneAfterAccept,
        show_whatsapp_after_accept: showWhatsappAfterAccept,
        bio: bio.trim() || null,
      })
      .eq("id", user.id);

    if (error) {
      setLoading(false);
      setErrorMessage(error.message);
      return;
    }

    const { data: existingWorker } = await supabase
      .from("worker_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingWorker?.id) {
      const { error: workerUpdateError } = await supabase
        .from("worker_profiles")
        .update({
          country: country.trim() || null,
          area_slug: computedAreaSlug,
          city: city.trim() || null,
          postcode: postcode.trim() || null,
          is_open_to_work: workerEnabled ? true : false,
          availability,
        })
        .eq("user_id", user.id);

      if (workerUpdateError) {
        setLoading(false);
        setErrorMessage(workerUpdateError.message);
        return;
      }
    }

    setAreaSlug(computedAreaSlug);
    setLoading(false);
    setSuccessMessage("Profile updated successfully.");
    router.refresh();
  };

  const handlePasswordUpdate = async () => {
    setPasswordLoading(true);
    setPasswordError("");
    setPasswordSuccess("");

    if (!newPassword.trim()) {
      setPasswordLoading(false);
      setPasswordError("Please enter a new password.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordLoading(false);
      setPasswordError("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordLoading(false);
      setPasswordError("Passwords do not match.");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setPasswordLoading(false);
      setPasswordError(error.message);
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    setPasswordLoading(false);
    setPasswordSuccess("Password updated successfully.");
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSave} className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Personal information</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              Basic details
            </h2>

            {errorMessage ? (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            ) : null}

            {successMessage ? (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {successMessage}
              </div>
            ) : null}

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Full name
                </label>
                <input
                  type="text"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-500 outline-none"
                  value={email}
                  readOnly
                />
                <p className="mt-2 text-xs text-slate-500">
                  Email cannot be changed from this page.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Country
                </label>
                <select
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                >
                  {UK_COUNTRIES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Nation / Region
                </label>
                <select
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                >
                  {UK_REGIONS.map((item) => (
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
                  type="text"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Enter your city"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Postcode
                </label>
                <input
                  type="text"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 uppercase outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                  placeholder="Enter postcode"
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Location settings</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              Your service area
            </h2>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Internal area slug
                </label>
                <input
                  type="text"
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-600 outline-none"
                  value={areaSlug}
                  onChange={(e) => setAreaSlug(e.target.value)}
                  placeholder="Auto-generated from city/region if left blank"
                />
              </div>

              <p className="text-sm text-slate-500">
                This field is kept for compatibility with the current project.
                Country, region, city, and postcode are now the main location
                fields.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <p className="text-sm font-medium text-slate-500">About you</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">Bio</h2>

            <div className="mt-6">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Profile bio
              </label>
              <textarea
                rows={5}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                placeholder="Write a short summary about yourself"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Availability</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              Day and shift availability
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Show hirers when you are available to work.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {days.map((day) => (
                <div
                  key={day}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="font-semibold capitalize text-slate-900">
                    {day}
                  </p>

                  <div className="mt-3 space-y-3">
                    {shifts.map((shift) => (
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
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Direct contact</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              Phone and WhatsApp
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              These details will only be shown after a booking has been accepted.
            </p>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Phone number
                </label>
                <input
                  type="text"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. +447123456789"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  WhatsApp number
                </label>
                <input
                  type="text"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="e.g. +447123456789"
                />
              </div>

              <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <p className="font-semibold text-slate-900">
                    Show phone after acceptance
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Allow accepted hirers to call you directly.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={showPhoneAfterAccept}
                  onChange={(e) => setShowPhoneAfterAccept(e.target.checked)}
                  className="h-5 w-5"
                />
              </label>

              <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <p className="font-semibold text-slate-900">
                    Show WhatsApp after acceptance
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Allow accepted hirers to contact you on WhatsApp.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={showWhatsappAfterAccept}
                  onChange={(e) => setShowWhatsappAfterAccept(e.target.checked)}
                  className="h-5 w-5"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Account modes</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              Managed separately
            </h2>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-500">Current setup</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {workerEnabled && hirerEnabled
                  ? "You are using both Worker and Hirer modes."
                  : workerEnabled
                  ? "You are using Worker mode."
                  : hirerEnabled
                  ? "You are using Hirer mode."
                  : "No marketplace mode is enabled right now."}
              </p>
              <p className="mt-3 text-sm text-slate-600">
                Use the Account Modes section above to enable or disable Worker
                and Hirer modes.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Save changes</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              Update your profile
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Save your information to keep your UK location details, profile
              details, availability, and contact settings up to date.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Saving..." : "Save profile"}
            </button>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Security</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              Update password
            </h2>

            {passwordError ? (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {passwordError}
              </div>
            ) : null}

            {passwordSuccess ? (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {passwordSuccess}
              </div>
            ) : null}

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  New password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  placeholder="Enter new password"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Confirm password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  placeholder="Confirm new password"
                />
              </div>

              <button
                type="button"
                onClick={handlePasswordUpdate}
                disabled={passwordLoading}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {passwordLoading ? "Updating..." : "Update password"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

