import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    unreadMessages: 0,
    pendingRequests: 0,
    newApplications: 0,
    total: 0,
  });
}
