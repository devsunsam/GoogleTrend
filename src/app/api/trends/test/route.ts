import { NextResponse } from "next/server";
import { buildRateExpression } from "@/lib/settings-migrate";
import { getSettings } from "@/lib/db";
import {
  canSyncAwsSchedule,
  syncTrendSchedule,
} from "@/services/aws-scheduler";
import { runTrendTestPipeline } from "@/services/pipeline";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const useSample = body.useSample === true;
  const dryRun = body.dryRun !== false;
  const includeSchedulerCheck = body.includeSchedulerCheck === true;

  try {
    const result = await runTrendTestPipeline({
      useSample,
      dryRun,
      maxDrafts: dryRun ? 0 : (body.maxDrafts ?? 1),
    });

    let schedulerSync:
      | { ok: boolean; expression: string; message: string }
      | undefined;

    if (includeSchedulerCheck) {
      const settings = getSettings();
      if (canSyncAwsSchedule(settings)) {
        schedulerSync = await syncTrendSchedule(settings);
      } else {
        schedulerSync = {
          ok: false,
          expression: buildRateExpression(settings.trendMinutes),
          message: "AWS 스케줄러 이름이 설정되지 않아 동기화를 건너뛰었습니다.",
        };
      }
    }

    return NextResponse.json({
      ...result,
      schedulerSync,
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "트렌드 테스트 실패",
      },
      { status: 500 }
    );
  }
}
