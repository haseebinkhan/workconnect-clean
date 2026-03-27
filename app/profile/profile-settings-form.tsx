"use client";

import { useMemo, useState } from "react";

type AccessLike = {
  canEditWorkerProfile?: boolean;
  canEditHirerProfile?: boolean;
  isWorker?: boolean;
  isHirer?: boolean;
};

type ProfileLike = {
  full_name?: string;
  email?: string;
  phone_number?: string;
  whatsapp_number?: string;
  city?: string;
  bio?: string;
  role?: "worker" | "hirer" | "both" | string;
};

type WorkerProfileLike = {
  headline?: string;
  category?: string;
  description?: string;
};

type HirerProfileLike = {
  company_name?: string;
  contact_name?: string;
  hirer_type?: string;
  industry?: string;
};

type SavePayload = {
  full_name: string;
  email: string;
  phone_number: string;
  whatsapp_number: string;
  city: string;
  bio: string;
};

type ProfileSettingsFormProps = {
  access?: AccessLike;
  profile?: ProfileLike;
  workerProfile?: WorkerProfileLike;
  hirerProfile?: HirerProfileLike;
  onSave?: (payload: SavePayload) => Promise<void> | void;
};

export default function ProfileSettingsForm({
  access = {},
  profile = {},
  workerProfile = {},
  hirerProfile = {},
  onSave,
}: ProfileSettingsFormProps) {
  const [fullName, setFullName] = useState(profile.full_name || "");
  const [email, setEmail] = useState(profile.email || "");
  const [phoneNumber, setPhoneNumber] = useState(profile.phone_number || "");
  const [whatsappNumber, setWhatsappNumber] = useState(
    profile.whatsapp_number || ""
  );
  const [city, setCity] = useState(profile.city || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [saving, setSaving] = useState(false);

  const derivedRole = useMemo(() => {
    if (access.isWorker && access.isHirer) return "both";
    if (access.isWorker) return "worker";
    if (access.isHirer) return "hirer";
    return profile.role || "worker";
  }, [access.isWorker, access.isHirer, profile.role]);

  const canEditWorkerProfile = useMemo(() => {
    if (typeof access.canEditWorkerProfile === "boolean") {
      return access.canEditWorkerProfile;
    }

    if (typeof access.isWorker === "boolean") {
      return access.isWorker;
    }

    return derivedRole === "worker" || derivedRole === "both";
  }, [access.canEditWorkerProfile, access.isWorker, derivedRole]);

  const canEditHirerProfile = useMemo(() => {
    if (typeof access.canEditHirerProfile === "boolean") {
      return access.canEditHirerProfile;
    }

    if (typeof access.isHirer === "boolean") {
      return access.isHirer;
    }

    return derivedRole === "hirer" || derivedRole === "both";
  }, [access.canEditHirerProfile, access.isHirer, derivedRole]);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setSaving(true);

      if (typeof onSave === "function") {
        await onSave({
          full_name: fullName,
          email,
          phone_number: phoneNumber,
          whatsapp_number: whatsappNumber,
          city,
          bio,
        });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Shared profile</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            Account details
          </h2>

          <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-700">
            <strong>Current logic:</strong>{" "}
            {canEditWorkerProfile && canEditHirerProfile
              ? "You can use both worker and hirer features."
              : canEditWorkerProfile
              ? "You are using worker features."
              : canEditHirerProfile
              ? "You are using hirer features."
              : "No role is enabled yet."}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Full name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                placeholder="Your full name"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Phone number
              </label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                placeholder="Phone number"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                WhatsApp number
              </label>
              <input
                type="text"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                placeholder="WhatsApp number"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                placeholder="City"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={5}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                placeholder="Tell people about yourself"
              />
            </div>
          </div>
        </div>

        {canEditWorkerProfile && (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Worker profile</p>
            <h3 className="mt-2 text-xl font-bold text-slate-900">
              Worker details
            </h3>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Headline
                </label>
                <input
                  type="text"
                  defaultValue={workerProfile.headline || ""}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                  placeholder="e.g. Cleaner, Handyman, Warehouse Worker"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Category
                </label>
                <input
                  type="text"
                  defaultValue={workerProfile.category || ""}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                  placeholder="Your category"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Worker description
                </label>
                <textarea
                  defaultValue={workerProfile.description || ""}
                  rows={4}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                  placeholder="Describe your skills and experience"
                />
              </div>
            </div>
          </div>
        )}

        {canEditHirerProfile && (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Hirer profile</p>
            <h3 className="mt-2 text-xl font-bold text-slate-900">
              Hirer details
            </h3>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Company name
                </label>
                <input
                  type="text"
                  defaultValue={hirerProfile.company_name || ""}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                  placeholder="Company name"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Contact name
                </label>
                <input
                  type="text"
                  defaultValue={hirerProfile.contact_name || ""}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                  placeholder="Contact name"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Hirer type
                </label>
                <input
                  type="text"
                  defaultValue={hirerProfile.hirer_type || ""}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                  placeholder="Home user or business"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Industry
                </label>
                <input
                  type="text"
                  defaultValue={hirerProfile.industry || ""}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                  placeholder="Industry"
                />
              </div>
            </div>
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save profile"}
          </button>
        </div>
      </form>
    </div>
  );
}