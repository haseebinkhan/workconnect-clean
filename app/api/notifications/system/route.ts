import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/send";

export async function POST(req: Request) {
  const { email, type } = await req.json();

  let subject = "";
  let html = "";

  if (type === "accepted") {
    subject = "Booking Accepted";
    html = "<p>Your booking has been accepted 🎉</p>";
  }

  if (type === "completed") {
    subject = "Job Completed";
    html = "<p>Your job is completed ✅</p>";
  }

  await sendEmail({
    to: email,
    subject,
    html,
  });

  return NextResponse.json({ success: true });
}
