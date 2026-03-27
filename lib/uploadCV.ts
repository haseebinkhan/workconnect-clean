import { createClient } from "@/lib/supabase/client";

export async function uploadCV(file: File, userId: string) {
  const supabase = createClient();

  const fileExt = file.name.split(".").pop();
  const fileName = `${userId}-${Date.now()}.${fileExt}`;
  const filePath = `uploads/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("cvs")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage
    .from("cvs")
    .getPublicUrl(filePath);

  return data.publicUrl;
}