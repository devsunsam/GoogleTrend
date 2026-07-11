import { NextResponse } from "next/server";
import { filterDrafts } from "@/lib/db";
import type { DraftStatus } from "@/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = (searchParams.get("status") as DraftStatus | "all") || "all";
  const search = searchParams.get("search") ?? undefined;
  const days = searchParams.get("days")
    ? Number(searchParams.get("days"))
    : undefined;

  const drafts = filterDrafts({ status, search, days });
  return NextResponse.json({ drafts });
}
