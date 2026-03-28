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

const niLocations = [
  { value: "antrim", label: "Antrim" },
  { value: "armagh", label: "Armagh" },
  { value: "ballycastle", label: "Ballycastle" },
  { value: "ballyclare", label: "Ballyclare" },
  { value: "ballygowan", label: "Ballygowan" },
  { value: "ballyhalbert", label: "Ballyhalbert" },
  { value: "ballyhornan", label: "Ballyhornan" },
  { value: "ballymena", label: "Ballymena" },
  { value: "ballymoney", label: "Ballymoney" },
  { value: "ballynahinch", label: "Ballynahinch" },
  { value: "banbridge", label: "Banbridge" },
  { value: "bangor", label: "Bangor" },
  { value: "belfast", label: "Belfast" },
  { value: "carryduff", label: "Carryduff" },
  { value: "carrickfergus", label: "Carrickfergus" },
  { value: "castlederg", label: "Castlederg" },
  { value: "castlewellan", label: "Castlewellan" },
  { value: "coleraine", label: "Coleraine" },
  { value: "comber", label: "Comber" },
  { value: "coalisland", label: "Coalisland" },
  { value: "cookstown", label: "Cookstown" },
  { value: "craigavon", label: "Craigavon" },
  { value: "crossgar", label: "Crossgar" },
  { value: "derry", label: "Derry / Londonderry" },
  { value: "donaghadee", label: "Donaghadee" },
  { value: "downpatrick", label: "Downpatrick" },
  { value: "dundonald", label: "Dundonald" },
  { value: "dungannon", label: "Dungannon" },
  { value: "enniskillen", label: "Enniskillen" },
  { value: "finaghy", label: "Finaghy" },
  { value: "glengormley", label: "Glengormley" },
  { value: "greenisland", label: "Greenisland" },
  { value: "hillsborough", label: "Hillsborough" },
  { value: "holywood", label: "Holywood" },
  { value: "jordanstown", label: "Jordanstown" },
  { value: "killyleagh", label: "Killyleagh" },
  { value: "larne", label: "Larne" },
  { value: "limavady", label: "Limavady" },
  { value: "lisburn", label: "Lisburn" },
  { value: "lurgan", label: "Lurgan" },
  { value: "magherafelt", label: "Magherafelt" },
  { value: "moira", label: "Moira" },
  { value: "newcastle", label: "Newcastle" },
  { value: "newry", label: "Newry" },
  { value: "newtownabbey", label: "Newtownabbey" },
  { value: "newtownards", label: "Newtownards" },
  { value: "omagh", label: "Omagh" },
  { value: "portadown", label: "Portadown" },
  { value: "portrush", label: "Portrush" },
  { value: "portstewart", label: "Portstewart" },
  { value: "randalstown", label: "Randalstown" },
  { value: "saintfield", label: "Saintfield" },
  { value: "strabane", label: "Strabane" },
  { value: "toome", label: "Toome" },
  { value: "warrenpoint", label: "Warrenpoint" },
  { value: "whiteabbey", label: "Whiteabbey" },
  { value: "whitehead", label: "Whitehead" },
];

function labelize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizeAvailability(input: any): AvailabilityState {
  const result: AvailabilityState = {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: [],
  };

  for (const day of days) {
    const value = input?.[day];
    if (Array.isArray(value)) {
      result[day] = value.filter((item) =>
        shifts.includes(item as ShiftName)
      ) as ShiftName[];
    }
  }

  return result;
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
}: {
  initialFullName: string;
  initialEmail: string;
  initialCity: string;
  initialPostcode: string;
  initialAreaSlug: string;
  initialWorkerEnabled: boolean;
  initialHirerEnabled: boolean;
  initialAvailability: any;
  initialPhoneNumber: string;
  initialWhatsappNumber: string;
  initialShowPhoneAfterAccept: boolean;
  initialShowWhatsappAfterAccept: boolean;
  initialBio: string;
}) {
  const supabase = createClient();
  const router = useRouter();

  const [fullName, setFullName] = useState(initialFullName);
  const [email] = useState(initialEmail);
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
        city: city.trim() || null,
        postcode: postcode.trim() || null,
        area_slug: areaSlug,
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
          area_slug: areaSlug,
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
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500"
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
                  City
                </label>
                <input
                  type="text"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500"
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
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 uppercase outline-none transition focus:border-indigo-500"
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

            <div className="mt-6">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Area
              </label>
              <select
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500"
                value={areaSlug}
                onChange={(e) => setAreaSlug(e.target.value)}
              >
                {niLocations.map((location) => (
                  <option key={location.value} value={location.value}>
                    {location.label}
                  </option>
                ))}
              </select>
            </div>

            <p className="mt-4 text-sm text-slate-500">
              Your selected area helps WorkConnect personalise search results and local worker discovery.
            </p>
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
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500"
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
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500"
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
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500"
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
                Use the Account Modes section above to enable or disable Worker and Hirer modes.
              </p>
            </div>
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
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500"
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
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500"
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

          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Save changes</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              Update your profile
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Save your information to keep your local results, profile details,
              availability, and contact settings up to date.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Saving..." : "Save profile"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}