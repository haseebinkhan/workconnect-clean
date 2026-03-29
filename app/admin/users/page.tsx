import { createClient } from "@/lib/supabase/server";
import UserActions from "./user-actions";

export default async function AdminUsersPage() {
  const supabase = await createClient();

  const { data: users, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, worker_enabled, hirer_enabled, is_active, is_verified, is_admin, city, area_slug, created_at"
    )
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
        <h2 className="text-xl font-bold text-red-700">Could not load users</h2>
        <p className="mt-2 text-slate-600">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-slate-500">User management</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-900">Accounts</h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Review account roles and activate, deactivate, or delete users when
          required.
        </p>
      </div>

      {users && users.length > 0 ? (
        <div className="grid gap-6">
          {users.map((user) => (
            <article
              key={user.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-900">
                      {user.full_name || "Unnamed user"}
                    </h3>

                    {user.is_admin && (
                      <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                        Admin
                      </span>
                    )}

                    {user.is_verified && (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        Verified
                      </span>
                    )}

                    {user.is_active ? (
                      <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                        Inactive
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-sm text-slate-600">
                    {user.email || "No email"}
                  </p>

                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Roles</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {user.worker_enabled && user.hirer_enabled
                          ? "Worker + Hirer"
                          : user.worker_enabled
                          ? "Worker"
                          : user.hirer_enabled
                          ? "Hirer"
                          : "User"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Location</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {user.city || "No city"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 capitalize">
                        {user.area_slug || "No area"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Joined</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="w-full max-w-xs">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-medium text-slate-500">Actions</p>
                    <div className="mt-4">
                      <UserActions
                        userId={user.id}
                        userName={user.full_name || "Unnamed user"}
                        isActive={user.is_active}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <h3 className="text-2xl font-bold text-slate-900">No users found</h3>
          <p className="mt-3 text-slate-600">User accounts will appear here.</p>
        </div>
      )}
    </div>
  );
}

