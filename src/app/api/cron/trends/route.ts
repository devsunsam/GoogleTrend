import { after } from "next/server";
import { NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { runTrendFetchPipeline } from "@/services/pipeline";

function shouldWaitForResult(request: Request): boolean {
  const url = new URL(request.url);
  return url.searchParams.get("wait") === "true";
}

export async function GET(request: Request) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (shouldWaitForResult(request)) {
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

  after(async () => {
    try {
      const result = await runTrendFetchPipeline();
      console.log("[cron/trends] completed:", JSON.stringify(result));
    } catch (e) {
      console.error(
        "[cron/trends] failed:",
        e instanceof Error ? e.message : e
      );
    }
  });

  return NextResponse.json({
    ok: true,
    accepted: true,
    message: "트렌드 수집 파이프라인을 백그라운드에서 시작했습니다.",
  });
}

export async function POST(request: Request) {
  return GET(request);
}
