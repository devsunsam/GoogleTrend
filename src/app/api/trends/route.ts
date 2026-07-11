import { NextResponse } from "next/server";
import { getLatestTrends } from "@/lib/db";

export async function GET() {
  const trends = getLatestTrends(20);
  return NextResponse.json({ trends });
}
