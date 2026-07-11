import { NextResponse } from "next/server";
import { runTrendFetchPipeline } from "@/services/pipeline";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const useSample = body.useSample === true;

  try {
    const result = await runTrendFetchPipeline({ useSample, maxDrafts: body.maxDrafts ?? 3 });
    return NextResponse.json({
      ok: true,
      message: `${result.draftsCreated}개 초안 생성`,
      ...result,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "수동 수집 실패" },
      { status: 500 }
    );
  }
}
