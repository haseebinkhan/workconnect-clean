import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function createNotification({
  userId,
  type,
  title,
  body,
  meta = {},
}: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  meta?: Record<string, unknown>;
}) {
  if (!userId) return;

  await admin.from("notifications").insert({
    user_id: userId,
    type,
    title,
    body: body || null,
    meta,
    is_read: false,
  });
}

