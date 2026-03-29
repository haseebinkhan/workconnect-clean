"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCities,
  getPostcodePrefixes,
  getRegions,
  isValidUKFullPostcode,
} from "@/lib/uk-locations";

const JOB_OPTIONS: Record<string, string[]> = {
  Cleaning: [
    "House Cleaner",
    "Office Cleaner",
    "Deep Cleaner",
    "End of Tenancy Cleaner",
    "Commercial Cleaner",
  ],
  Electrical: [
    "Domestic Electrician",
    "Emergency Electrician",
    "Electrical Repair",
    "Electrical Installation",
    "PAT Testing",
  ],
  Plumbing: [
    "Domestic Plumber",
    "Emergency Plumber",
    "Leak Repair",
    "Bathroom Plumbing",
    "Kitchen Plumbing",
  ],
  Painting: [
    "House Painter",
    "Interior Painter",
    "Exterior Painter",
    "Decorator",
    "Wallpaper Installer",
  ],
  Gardening: [
    "Gardener",
    "Lawn Care",
    "Hedge Trimming",
    "Garden Clearance",
    "Landscaping Help",
  ],
  Handyman: [
    "General Handyman",
    "Furniture Assembly",
    "Wall Mounting",
    "Minor Repairs",
    "Home Maintenance",
  ],
  Moving: [
    "House Move Help",
    "Furniture Mover",
    "Packing Help",
    "Removal Assistant",
    "Heavy Lifting Help",
  ],
  Delivery: [
    "Delivery Driver",
    "Local Courier",
    "Parcel Delivery",
    "Same Day Delivery",
  ],
  Warehouse: [
    "Warehouse Worker",
    "Picker Packer",
    "Loading Assistant",
    "Stock Assistant",
  ],
  Hospitality: [
    "Kitchen Assistant",
    "Waiter / Waitress",
    "Bar Staff",
    "Event Staff",
    "Catering Assistant",
  ],
  Care: [
    "Care Assistant",
    "Support Worker",
    "Home Help",
    "Companion Care",
  ],
  Childcare: [
    "Babysitter",
    "Nanny Help",
    "After School Childcare",
  ],
  "Pet Care": [
    "Dog Walker",
    "Pet Sitter",
    "Cat Care",
    "Pet Visit Help",
  ],
  Tutoring: [
    "Math Tutor",
    "English Tutor",
    "Science Tutor",
    "Primary School Tutor",
    "IT Tutor",
  ],
  Admin: [
    "Administrative Assistant",
    "Data Entry Help",
    "Office Support",
    "Reception Cover",
  ],
  IT: [
    "IT Support",
    "Computer Repair",
    "Printer Setup",
    "Wi-Fi Setup",
    "Website Help",
  ],
  General: [
    "General Labour",
    "Odd Job Help",
    "Temporary Worker",
    "Local Helper",
    "Other",
  ],
};

function slugifyArea(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

function slugifyTitle(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s/g, "-");
}

export default function PostJobForm() {
  const router = useRouter();

  const regions = useMemo(() => getRegions(), []);

  const [category, setCategory] = useState("");
  const [selectedTitle, setSelectedTitle] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [description, setDescription] = useState("");

  const [country, setCountry] = useState("United Kingdom");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [postcodePrefix, setPostcodePrefix] = useState("");
  const [postcodeFull, setPostcodeFull] = useState("");

  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [currencyCode, setCurrencyCode] = useState("GBP");
  const [locationType, setLocationType] = useState("local");

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const titleOptions = useMemo(() => {
    return category ? JOB_OPTIONS[category] || [] : [];
  }, [category]);

  const cityOptions = useMemo(() => getCities(region), [region]);

  const postcodePrefixOptions = useMemo(() => {
    return getPostcodePrefixes(region, city);
  }, [region, city]);

  const finalTitle =
    selectedTitle === "Other" ? customTitle.trim() : selectedTitle.trim();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!category.trim()) {
      setErrorMessage("Please select a job category.");
      return;
    }

    if (!finalTitle) {
      setErrorMessage("Please select or enter a job title.");
      return;
    }

    if (!description.trim()) {
      setErrorMessage("Please enter a clear job description.");
      return;
    }

    if (!region.trim()) {
      setErrorMessage("Please select a nation or region.");
      return;
    }

    if (!city.trim()) {
      setErrorMessage("Please select a city or town.");
      return;
    }

    if (!postcodePrefix.trim()) {
      setErrorMessage("Please select a postcode prefix.");
      return;
    }

    if (postcodeFull.trim() && !isValidUKFullPostcode(postcodeFull)) {
      setErrorMessage("Please enter a valid full UK postcode or leave it blank.");
      return;
    }

    if (!budgetMin.trim() && !budgetMax.trim()) {
      setErrorMessage("Please enter at least one budget value.");
      return;
    }

    const minValue = budgetMin.trim() ? Number(budgetMin) : null;
    const maxValue = budgetMax.trim() ? Number(budgetMax) : null;

    if (budgetMin.trim() && Number.isNaN(minValue)) {
      setErrorMessage("Minimum budget must be a valid number.");
      return;
    }

    if (budgetMax.trim() && Number.isNaN(maxValue)) {
      setErrorMessage("Maximum budget must be a valid number.");
      return;
    }

    if (
      minValue != null &&
      maxValue != null &&
      Number(minValue) > Number(maxValue)
    ) {
      setErrorMessage("Minimum budget cannot be greater than maximum budget.");
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const areaSlug = slugifyArea(city || region || finalTitle);

      const response = await fetch("/api/jobs/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category,
          title: finalTitle,
          titleSlug: slugifyTitle(finalTitle),
          description: description.trim(),
          country,
          region,
          city,
          postcode: postcodePrefix,
          postcodePrefix,
          postcodeFull: postcodeFull.trim().toUpperCase() || null,
          areaSlug,
          budgetMin: minValue,
          budgetMax: maxValue,
          currencyCode,
          locationType,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setErrorMessage(result?.error || "Could not submit the job.");
        return;
      }

      setSuccessMessage("Job submitted successfully and is now awaiting review.");

      setTimeout(() => {
        router.push("/my-job-posts");
        router.refresh();
      }, 1200);
    } catch (error) {
      console.error("post job error:", error);
      setErrorMessage("Could not submit the job.");
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

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-bold text-slate-900">Job details</h2>
        <p className="mt-2 text-sm text-slate-600">
          Choose the type of work, then select a suitable title for the role.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Job category
            </label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setSelectedTitle("");
                setCustomTitle("");
              }}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select category</option>
              {Object.keys(JOB_OPTIONS).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Job title
            </label>
            <select
              value={selectedTitle}
              onChange={(e) => setSelectedTitle(e.target.value)}
              disabled={!category}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
            >
              <option value="">
                {category ? "Select title" : "Select category first"}
              </option>
              {titleOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedTitle === "Other" ? (
          <div className="mt-4">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Custom job title
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Enter your job title"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        ) : null}

        <div className="mt-4">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Job description
          </label>
          <textarea
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the work clearly, including duties, timing, experience needed, and anything important the worker should know."
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-bold text-slate-900">Location</h2>
        <p className="mt-2 text-sm text-slate-600">
          Select the nation first, then choose the city and postcode prefix.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Country
            </label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500"
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
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select nation / region</option>
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
              City / town
            </label>
            <select
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setPostcodePrefix("");
                setPostcodeFull("");
              }}
              disabled={!region}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
            >
              <option value="">
                {region ? "Select city / town" : "Select region first"}
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
            placeholder="e.g. S1 2AB"
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 uppercase text-sm outline-none transition focus:ring-2 focus:ring-indigo-500"
          />
          <p className="mt-2 text-xs text-slate-500">
            Optional. The postcode prefix is enough for matching, while the full postcode gives a more exact area.
          </p>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-bold text-slate-900">Budget and work type</h2>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Minimum budget
            </label>
            <input
              type="number"
              value={budgetMin}
              onChange={(e) => setBudgetMin(e.target.value)}
              placeholder="e.g. 50"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Maximum budget
            </label>
            <input
              type="number"
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
              placeholder="e.g. 100"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Currency
            </label>
            <select
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500"
            >
              <option value="GBP">GBP</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Work type
            </label>
            <select
              value={locationType}
              onChange={(e) => setLocationType(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500"
            >
              <option value="local">Local / on-site</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={saving}
          className="rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? "Submitting..." : "Submit job for review"}
        </button>
      </div>
    </form>
  );
}

