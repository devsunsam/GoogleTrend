import { NextResponse } from "next/server";
import { runTrendFetchPipeline } from "@/services/pipeline";

function verifyCronAuth(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  const url = new URL(request.url);
  if (url.searchParams.get("secret") === secret) return true;

  return false;
}

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
