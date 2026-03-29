"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  getCities,
  getPostcodePrefixes,
  getRegions,
  isValidUKFullPostcode,
} from "@/lib/uk-locations";

type InitialData = {
  userId: string;
  fullName: string;
  email: string;
  bio: string;
  phoneNumber: string;
  whatsappNumber: string;
  country: string;
  region: string;
  city: string;
  areaSlug: string;
  postcodePrefix: string;
  postcodeFull: string;
  workerProfile: {
    id: string | null;
    headline: string;
    description: string;
    category: string;
    hourlyRate: string;
    hourlyRateMin: string;
    hourlyRateMax: string;
    isOpenToWork: boolean;
    isPublic: boolean;
    availability: Record<string, string[]>;
    availabilityNotes: string;
    certifications: string[];
    experienceYears: string;
  };
};

const DAY_OPTIONS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const SHIFT_OPTIONS = ["morning", "afternoon", "evening"] as const;

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

function slugifyArea(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

function parseCertifications(text: string) {
  return text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function BecomeWorkerForm({
  initialData,
}: {
  initialData: InitialData;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const regions = useMemo(() => getRegions(), []);

  const [fullName, setFullName] = useState(initialData.fullName);
  const [bio, setBio] = useState(initialData.bio);
  const [phoneNumber, setPhoneNumber] = useState(initialData.phoneNumber);
  const [whatsappNumber, setWhatsappNumber] = useState(
    initialData.whatsappNumber
  );

  const [country, setCountry] = useState(
    initialData.country || "United Kingdom"
  );
  const [region, setRegion] = useState(initialData.region || "");
  const [city, setCity] = useState(initialData.city || "");
  const [postcodePrefix, setPostcodePrefix] = useState(
    initialData.postcodePrefix || ""
  );
  const [postcodeFull, setPostcodeFull] = useState(
    initialData.postcodeFull || ""
  );

  const [headline, setHeadline] = useState(initialData.workerProfile.headline);
  const [description, setDescription] = useState(
    initialData.workerProfile.description || initialData.bio || ""
  );
  const [category, setCategory] = useState(initialData.workerProfile.category);
  const [hourlyRate, setHourlyRate] = useState(
    initialData.workerProfile.hourlyRate
  );
  const [hourlyRateMin, setHourlyRateMin] = useState(
    initialData.workerProfile.hourlyRateMin
  );
  const [hourlyRateMax, setHourlyRateMax] = useState(
    initialData.workerProfile.hourlyRateMax
  );
  const [isOpenToWork, setIsOpenToWork] = useState(
    initialData.workerProfile.isOpenToWork
  );
  const [isPublic, setIsPublic] = useState(initialData.workerProfile.isPublic);
  const [availability, setAvailability] = useState<Record<string, string[]>>(
    initialData.workerProfile.availability || {}
  );
  const [availabilityNotes, setAvailabilityNotes] = useState(
    initialData.workerProfile.availabilityNotes
  );
  const [certificationsText, setCertificationsText] = useState(
    initialData.workerProfile.certifications.join(", ")
  );
  const [experienceYears, setExperienceYears] = useState(
    initialData.workerProfile.experienceYears
  );

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const cityOptions = useMemo(() => getCities(region), [region]);
  const postcodePrefixOptions = useMemo(
    () => getPostcodePrefixes(region, city),
    [region, city]
  );

  function toggleAvailability(day: string, shift: string) {
    setAvailability((prev) => {
      const current = Array.isArray(prev[day]) ? [...prev[day]] : [];
      const exists = current.includes(shift);

      return {
        ...prev,
        [day]: exists
          ? current.filter((item) => item !== shift)
          : [...current, shift],
      };
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!fullName.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }

    if (!headline.trim()) {
      setErrorMessage("Please enter a worker headline.");
      return;
    }

    if (!category.trim()) {
      setErrorMessage("Please select a category.");
      return;
    }

    if (!region.trim()) {
      setErrorMessage("Please select your nation or region.");
      return;
    }

    if (!city.trim()) {
      setErrorMessage("Please select your city or main area.");
      return;
    }

    if (!postcodePrefix.trim()) {
      setErrorMessage("Please select a postcode prefix.");
      return;
    }

    if (postcodeFull.trim() && !isValidUKFullPostcode(postcodeFull)) {
      setErrorMessage("Please enter a valid full UK postcode or leave it empty.");
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const areaSlug = slugifyArea(city || region);

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          bio: bio.trim() || null,
          phone_number: phoneNumber.trim() || null,
          whatsapp_number: whatsappNumber.trim() || null,
          country: country.trim() || "United Kingdom",
          region: region.trim(),
          city: city.trim(),
          area_slug: areaSlug,
          postcode_prefix: postcodePrefix.trim().toUpperCase(),
          postcode_full: postcodeFull.trim().toUpperCase() || null,
          worker_enabled: true,
        })
        .eq("id", initialData.userId);

      if (profileError) {
        throw new Error(profileError.message);
      }

      const { error: workerError } = await supabase
        .from("worker_profiles")
        .upsert(
          {
            user_id: initialData.userId,
            headline: headline.trim(),
            description: description.trim() || null,
            category: category.trim(),
            country: country.trim() || "United Kingdom",
            region: region.trim(),
            city: city.trim(),
            area_slug: areaSlug,
            postcode_prefix: postcodePrefix.trim().toUpperCase(),
            postcode_full: postcodeFull.trim().toUpperCase() || null,
            postcode: postcodeFull.trim().toUpperCase() || null,
            hourly_rate: hourlyRate.trim() ? Number(hourlyRate) : null,
            hourly_rate_min: hourlyRateMin.trim()
              ? Number(hourlyRateMin)
              : null,
            hourly_rate_max: hourlyRateMax.trim()
              ? Number(hourlyRateMax)
              : null,
            is_open_to_work: isOpenToWork,
            is_public: isPublic,
            availability,
            availability_notes: availabilityNotes.trim() || null,
            certifications: parseCertifications(certificationsText),
            experience_years: experienceYears.trim()
              ? Number(experienceYears)
              : null,
          },
          {
            onConflict: "user_id",
          }
        );

      if (workerError) {
        throw new Error(workerError.message);
      }

      setSuccessMessage("Worker profile saved successfully.");

      setTimeout(() => {
        router.push("/worker");
        router.refresh();
      }, 1200);
    } catch (error) {
      console.error("become worker error:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Could not save worker profile."
      );
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

      {successMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <section className="space-y-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Basic information</h2>
          <p className="mt-2 text-sm text-slate-600">
            Your saved signup region is used as the starting point here.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Full name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Email
            </label>
            <input
              type="email"
              value={initialData.email}
              disabled
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Worker headline
          </label>
          <input
            type="text"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="e.g. Reliable local electrician"
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            About you
          </label>
          <textarea
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Profile bio
          </label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </section>

      <section className="space-y-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Location</h2>
          <p className="mt-2 text-sm text-slate-600">
            Select your UK nation, then choose your city and postcode prefix.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Country
            </label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="United Kingdom">United Kingdom</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              UK nation
            </label>
            <select
              value={region}
              onChange={(e) => {
                setRegion(e.target.value);
                setCity("");
                setPostcodePrefix("");
                setPostcodeFull("");
              }}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select nation</option>
              {regions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              City / main area
            </label>
            <select
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setPostcodePrefix("");
                setPostcodeFull("");
              }}
              disabled={!region}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
            >
              <option value="">
                {region ? "Select city / area" : "Select nation first"}
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
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
            >
              <option value="">
                {city ? "Select postcode prefix" : "Select city first"}
              </option>
              {postcodePrefixOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Full postcode (optional)
          </label>
          <input
            type="text"
            value={postcodeFull}
            onChange={(e) => setPostcodeFull(e.target.value.toUpperCase())}
            placeholder="e.g. BT37 9AB"
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 uppercase text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </section>

      <section className="space-y-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Work details</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select category</option>
              {CATEGORY_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Experience years
            </label>
            <input
              type="number"
              value={experienceYears}
              onChange={(e) => setExperienceYears(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Hourly rate
            </label>
            <input
              type="number"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Rate min
            </label>
            <input
              type="number"
              value={hourlyRateMin}
              onChange={(e) => setHourlyRateMin(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Rate max
            </label>
            <input
              type="number"
              value={hourlyRateMax}
              onChange={(e) => setHourlyRateMax(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Certifications
          </label>
          <input
            type="text"
            value={certificationsText}
            onChange={(e) => setCertificationsText(e.target.value)}
            placeholder="Comma separated"
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </section>

      <section className="space-y-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Availability</h2>
        </div>

        <div className="space-y-4">
          {DAY_OPTIONS.map((day) => (
            <div key={day} className="rounded-2xl border border-slate-200 p-4">
              <p className="font-semibold capitalize text-slate-900">{day}</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {SHIFT_OPTIONS.map((shift) => {
                  const active =
                    Array.isArray(availability[day]) &&
                    availability[day].includes(shift);

                  return (
                    <button
                      key={shift}
                      type="button"
                      onClick={() => toggleAvailability(day, shift)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        active
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
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

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Availability notes
          </label>
          <textarea
            rows={3}
            value={availabilityNotes}
            onChange={(e) => setAvailabilityNotes(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4">
            <input
              type="checkbox"
              checked={isOpenToWork}
              onChange={(e) => setIsOpenToWork(e.target.checked)}
            />
            <div>
              <p className="font-semibold text-slate-900">Open to work</p>
              <p className="text-sm text-slate-600">
                Show that you are currently available for jobs.
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            <div>
              <p className="font-semibold text-slate-900">Public worker profile</p>
              <p className="text-sm text-slate-600">
                Let hirers discover you in search results.
              </p>
            </div>
          </label>
        </div>
      </section>

      <section className="space-y-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Contact</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Phone number
            </label>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              WhatsApp number
            </label>
            <input
              type="text"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save worker profile"}
        </button>
      </div>
    </form>
  );
}