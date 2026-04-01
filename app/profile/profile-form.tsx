"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getCities,
  getPostcodePrefixes,
  getRegions,
  isValidUKFullPostcode,
} from "@/lib/uk-locations";

type InitialProfile = {
  id: string;
  email: string;
  fullName: string;
  role: string | null;
  workerEnabled: boolean;
  hirerEnabled: boolean;
  isActive: boolean;
  avatarUrl: string;
  bio: string;
  phoneNumber: string;
  whatsappNumber: string;
  showPhoneAfterAccept: boolean;
  showWhatsappAfterAccept: boolean;

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
    postcode: string;
  };

  hirerProfile: {
    id: string | null;
    companyName: string;
    contactName: string;
    location: string;
    industry: string;
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

function buildStructuredLocationText({
  city,
  region,
  country,
  postcodePrefix,
  postcodeFull,
}: {
  city?: string;
  region?: string;
  country?: string;
  postcodePrefix?: string;
  postcodeFull?: string;
}) {
  const parts = [city?.trim(), region?.trim(), country?.trim()].filter(Boolean);
  const base = parts.join(", ");

  if (postcodeFull?.trim()) {
    return base ? `${base} (${postcodeFull.trim().toUpperCase()})` : postcodeFull.trim().toUpperCase();
  }

  if (postcodePrefix?.trim()) {
    return base ? `${base} (${postcodePrefix.trim().toUpperCase()})` : postcodePrefix.trim().toUpperCase();
  }

  return base || "";
}

export default function ProfileForm({
  initialProfile,
}: {
  initialProfile: InitialProfile;
}) {
  const supabase = useMemo(() => createClient(), []);

  const regions = useMemo(() => getRegions(), []);
  const [fullName, setFullName] = useState(initialProfile.fullName);
  const [bio, setBio] = useState(initialProfile.bio);
  const [phoneNumber, setPhoneNumber] = useState(initialProfile.phoneNumber);
  const [whatsappNumber, setWhatsappNumber] = useState(
    initialProfile.whatsappNumber
  );
  const [showPhoneAfterAccept, setShowPhoneAfterAccept] = useState(
    initialProfile.showPhoneAfterAccept
  );
  const [showWhatsappAfterAccept, setShowWhatsappAfterAccept] = useState(
    initialProfile.showWhatsappAfterAccept
  );

  const [workerEnabled, setWorkerEnabled] = useState(
    initialProfile.workerEnabled
  );
  const [hirerEnabled, setHirerEnabled] = useState(initialProfile.hirerEnabled);

  const [country, setCountry] = useState(
    initialProfile.country || "United Kingdom"
  );
  const [region, setRegion] = useState(initialProfile.region || "");
  const [city, setCity] = useState(initialProfile.city || "");
  const [postcodePrefix, setPostcodePrefix] = useState(
    initialProfile.postcodePrefix || ""
  );
  const [postcodeFull, setPostcodeFull] = useState(
    initialProfile.postcodeFull || ""
  );

  const [headline, setHeadline] = useState(initialProfile.workerProfile.headline);
  const [description, setDescription] = useState(
    initialProfile.workerProfile.description
  );
  const [category, setCategory] = useState(initialProfile.workerProfile.category);
  const [hourlyRate, setHourlyRate] = useState(
    initialProfile.workerProfile.hourlyRate
  );
  const [hourlyRateMin, setHourlyRateMin] = useState(
    initialProfile.workerProfile.hourlyRateMin
  );
  const [hourlyRateMax, setHourlyRateMax] = useState(
    initialProfile.workerProfile.hourlyRateMax
  );
  const [isOpenToWork, setIsOpenToWork] = useState(
    initialProfile.workerProfile.isOpenToWork
  );
  const [isPublic, setIsPublic] = useState(initialProfile.workerProfile.isPublic);
  const [availabilityNotes, setAvailabilityNotes] = useState(
    initialProfile.workerProfile.availabilityNotes
  );
  const [experienceYears, setExperienceYears] = useState(
    initialProfile.workerProfile.experienceYears
  );
  const [certificationsText, setCertificationsText] = useState(
    initialProfile.workerProfile.certifications.join(", ")
  );
  const [availability, setAvailability] = useState<Record<string, string[]>>(
    initialProfile.workerProfile.availability || {}
  );

  const [companyName, setCompanyName] = useState(
    initialProfile.hirerProfile.companyName
  );
  const [contactName, setContactName] = useState(
    initialProfile.hirerProfile.contactName
  );
  const [hirerLocation, setHirerLocation] = useState(
    initialProfile.hirerProfile.location
  );
  const [industry, setIndustry] = useState(initialProfile.hirerProfile.industry);

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const cityOptions = useMemo(() => getCities(region), [region]);
  const postcodePrefixOptions = useMemo(
    () => getPostcodePrefixes(region, city),
    [region, city]
  );

  const computedHirerLocation = useMemo(() => {
    return buildStructuredLocationText({
      city,
      region,
      country,
      postcodePrefix,
      postcodeFull,
    });
  }, [city, region, country, postcodePrefix, postcodeFull]);

  function toggleAvailability(day: string, shift: string) {
    setAvailability((prev) => {
      const current = Array.isArray(prev[day]) ? [...prev[day]] : [];
      const exists = current.includes(shift);

      const nextShifts = exists
        ? current.filter((item) => item !== shift)
        : [...current, shift];

      return {
        ...prev,
        [day]: nextShifts,
      };
    });
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!fullName.trim()) {
      setErrorMessage("Please enter your full name.");
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

    if (workerEnabled && !category.trim()) {
      setErrorMessage("Please select a worker category.");
      return;
    }

    if (workerEnabled && !headline.trim()) {
      setErrorMessage("Please enter a worker headline.");
      return;
    }

    if (hirerEnabled && !companyName.trim()) {
      setErrorMessage("Please enter a company name.");
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const areaSlug = slugifyArea(city || region);

      const profilePayload = {
        id: initialProfile.id,
        email: initialProfile.email || null,
        full_name: fullName.trim(),
        bio: bio.trim() || null,
        phone_number: phoneNumber.trim() || null,
        whatsapp_number: whatsappNumber.trim() || null,
        show_phone_after_accept: showPhoneAfterAccept,
        show_whatsapp_after_accept: showWhatsappAfterAccept,
        worker_enabled: workerEnabled,
        hirer_enabled: hirerEnabled,
        country: country.trim() || "United Kingdom",
        region: region.trim(),
        city: city.trim(),
        area_slug: areaSlug,
        postcode_prefix: postcodePrefix.trim().toUpperCase(),
        postcode_full: postcodeFull.trim().toUpperCase() || null,
      };

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(profilePayload);

      if (profileError) {
        throw new Error(profileError.message);
      }

      if (workerEnabled) {
        const workerPayload = {
          user_id: initialProfile.id,
          headline: headline.trim(),
          description: description.trim() || null,
          category: category.trim() || null,
          country: country.trim() || "United Kingdom",
          region: region.trim(),
          city: city.trim(),
          area_slug: areaSlug,
          postcode_prefix: postcodePrefix.trim().toUpperCase(),
          postcode_full: postcodeFull.trim().toUpperCase() || null,
          postcode: postcodeFull.trim().toUpperCase() || null,
          hourly_rate: hourlyRate.trim() ? Number(hourlyRate) : null,
          hourly_rate_min: hourlyRateMin.trim() ? Number(hourlyRateMin) : null,
          hourly_rate_max: hourlyRateMax.trim() ? Number(hourlyRateMax) : null,
          is_open_to_work: isOpenToWork,
          is_public: isPublic,
          availability,
          availability_notes: availabilityNotes.trim() || null,
          certifications: parseCertifications(certificationsText),
          experience_years: experienceYears.trim()
            ? Number(experienceYears)
            : null,
        };

        const { error: workerError } = await supabase
          .from("worker_profiles")
          .upsert(workerPayload, {
            onConflict: "user_id",
          });

        if (workerError) {
          throw new Error(workerError.message);
        }
      }

      if (!workerEnabled && initialProfile.workerProfile.id) {
        await supabase
          .from("worker_profiles")
          .update({
            is_open_to_work: false,
            is_public: false,
          })
          .eq("user_id", initialProfile.id);
      }

      if (hirerEnabled) {
        const finalHirerLocation =
          hirerLocation.trim() || computedHirerLocation || city.trim() || null;

        const hirerPayload = {
          user_id: initialProfile.id,
          company_name: companyName.trim(),
          contact_name: contactName.trim() || null,
          location: finalHirerLocation,
          industry: industry.trim() || null,
        };

        const { error: hirerError } = await supabase
          .from("hirer_profiles")
          .upsert(hirerPayload, {
            onConflict: "user_id",
          });

        if (hirerError) {
          throw new Error(hirerError.message);
        }
      }

      setSuccessMessage("Profile updated successfully.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not save profile."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-8">
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

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-bold text-slate-900">Basic details</h2>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
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
              value={initialProfile.email}
              disabled
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500 outline-none"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-bold text-slate-900">Modes</h2>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4">
            <input
              type="checkbox"
              checked={workerEnabled}
              onChange={(e) => setWorkerEnabled(e.target.checked)}
            />
            <div>
              <p className="font-semibold text-slate-900">Worker mode</p>
              <p className="text-sm text-slate-600">
                Be visible as a worker and apply for work.
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4">
            <input
              type="checkbox"
              checked={hirerEnabled}
              onChange={(e) => setHirerEnabled(e.target.checked)}
            />
            <div>
              <p className="font-semibold text-slate-900">Hirer mode</p>
              <p className="text-sm text-slate-600">
                Post jobs and contact workers.
              </p>
            </div>
          </label>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-bold text-slate-900">Location</h2>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
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
              Nation / region
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
              <option value="">Select region</option>
              {regions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
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
                {region ? "Select city / area" : "Select region first"}
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

        <div className="mt-4">
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
          <p className="mt-2 text-xs text-slate-500">
            Optional. This gives a more exact location, while search mainly uses postcode prefix.
          </p>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-bold text-slate-900">Contact preferences</h2>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
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

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4">
            <input
              type="checkbox"
              checked={showPhoneAfterAccept}
              onChange={(e) => setShowPhoneAfterAccept(e.target.checked)}
            />
            <div>
              <p className="font-semibold text-slate-900">Hide phone until accepted</p>
              <p className="text-sm text-slate-600">
                Public phone stays hidden until a booking is accepted.
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4">
            <input
              type="checkbox"
              checked={showWhatsappAfterAccept}
              onChange={(e) => setShowWhatsappAfterAccept(e.target.checked)}
            />
            <div>
              <p className="font-semibold text-slate-900">Hide WhatsApp until accepted</p>
              <p className="text-sm text-slate-600">
                Public WhatsApp stays hidden until a booking is accepted.
              </p>
            </div>
          </label>
        </div>
      </section>

      {workerEnabled ? (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-bold text-slate-900">Worker profile</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Headline
              </label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Reliable local electrician"
              />
            </div>

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
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
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

          <div className="mt-4 grid gap-4 md:grid-cols-2">
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
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4">
              <input
                type="checkbox"
                checked={isOpenToWork}
                onChange={(e) => setIsOpenToWork(e.target.checked)}
              />
              <div>
                <p className="font-semibold text-slate-900">Open to work</p>
                <p className="text-sm text-slate-600">
                  Show that you are currently available.
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
                  Let hirers discover you in search.
                </p>
              </div>
            </label>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-bold text-slate-900">Availability</h3>
            <div className="mt-4 space-y-4">
              {DAY_OPTIONS.map((day) => (
                <div
                  key={day}
                  className="rounded-2xl border border-slate-200 p-4"
                >
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

            <div className="mt-4">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Availability notes
              </label>
              <textarea
                value={availabilityNotes}
                onChange={(e) => setAvailabilityNotes(e.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </section>
      ) : null}

      {hirerEnabled ? (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-bold text-slate-900">Hirer profile</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Company name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Contact name
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Business location note
              </label>
              <input
                type="text"
                value={hirerLocation}
                onChange={(e) => setHirerLocation(e.target.value)}
                placeholder="Optional extra location note, branch name, office unit, etc."
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="mt-2 text-xs text-slate-500">
                Your structured business area comes from the location selected above.
                Use this only for extra detail.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Industry
              </label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">
              Structured hirer location
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {computedHirerLocation || "Select country, region, city, and postcode prefix above."}
            </p>
          </div>
        </section>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save profile"}
        </button>
      </div>
    </form>
  );
}
