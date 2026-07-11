import { NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { runTrendFetchPipeline } from "@/services/pipeline";

export async function GET(request: Request) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runTrendFetchPipeline();
    return NextResponse.json({
      ok: true,
      message: `${result.draftsCreated}개 초안 생성`,
      ...result,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "파이프라인 실패" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
