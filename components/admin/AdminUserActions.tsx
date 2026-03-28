"use client";

import { createClient } from "@/lib/supabase/client";

export default function AdminUserAction({
  adminUserId,
  targetUserId,
  isActive,
}: {
  adminUserId: string;
  targetUserId: string;
  isActive: boolean;
}) {
  const supabase = createClient();

  const handleDeleteUser = async () => {
    const confirmDelete = confirm("Delete this user?");
    if (!confirmDelete) return;

    try {
      await fetch("/api/admin/delete-user", {
        method: "POST",
        body: JSON.stringify({
          adminUserId,
          targetUserId,
        }),
      });

      alert("User deleted");
      location.reload();
    } catch (err) {
      alert("Error deleting user");
    }
  };

  return (
    <button
      onClick={handleDeleteUser}
      className="rounded-lg bg-red-500 px-3 py-1 text-xs text-white hover:bg-red-600"
    >
      Delete
    </button>
  );
}
