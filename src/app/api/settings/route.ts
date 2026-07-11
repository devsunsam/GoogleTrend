import { NextResponse } from "next/server";
import {
  canSyncAwsSchedule,
  syncTrendSchedule,
} from "@/services/aws-scheduler";
import { getSettings, saveSettings } from "@/lib/db";
import { clampTrendMinutes } from "@/lib/settings-migrate";
import { DEFAULT_GEMINI_MODEL } from "@/lib/gemini-config";
import type { AppSettings } from "@/types";

const MASK = "••••••••";

function maskSettings(settings: AppSettings) {
  return {
    ...settings,
    blogApiKey: settings.blogApiKey ? MASK : "",
    cronSecret: settings.cronSecret ? MASK : "",
    openaiApiKey: settings.openaiApiKey ? MASK : "",
    geminiApiKey: settings.geminiApiKey ? MASK : "",
    anthropicApiKey: settings.anthropicApiKey ? MASK : "",
    awsAccessKeyId: settings.awsAccessKeyId ? MASK : "",
    awsSecretAccessKey: settings.awsSecretAccessKey ? MASK : "",
  };
}

function mergeKey(incoming: string | undefined, current: string): string {
  if (!incoming || incoming === MASK) return current;
  return incoming;
}

export async function GET() {
  return NextResponse.json({ settings: maskSettings(getSettings()) });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as Partial<AppSettings>;
  const current = getSettings();
  const previousMinutes = current.trendMinutes;

  const updated: AppSettings = {
    blogUrl: body.blogUrl ?? current.blogUrl,
    blogApiKey: mergeKey(body.blogApiKey, current.blogApiKey),
    blogPlatform: body.blogPlatform ?? current.blogPlatform,
    geo: body.geo ?? current.geo,
    trendMinutes: clampTrendMinutes(body.trendMinutes ?? current.trendMinutes),
    cronSecret: mergeKey(body.cronSecret, current.cronSecret),
    lastFetchAt: current.lastFetchAt,
    lastSchedulerSyncAt: current.lastSchedulerSyncAt,
    lastSchedulerSyncMessage: current.lastSchedulerSyncMessage,
    openaiApiKey: mergeKey(body.openaiApiKey, current.openaiApiKey),
    geminiApiKey: mergeKey(body.geminiApiKey, current.geminiApiKey),
    anthropicApiKey: mergeKey(body.anthropicApiKey, current.anthropicApiKey),
    openaiModel: body.openaiModel ?? current.openaiModel,
    geminiModel: DEFAULT_GEMINI_MODEL,
    anthropicModel: body.anthropicModel ?? current.anthropicModel,
    awsRegion: body.awsRegion ?? current.awsRegion,
    awsScheduleType: body.awsScheduleType ?? current.awsScheduleType,
    awsSchedulerName: body.awsSchedulerName ?? current.awsSchedulerName,
    awsSchedulerGroup: body.awsSchedulerGroup ?? current.awsSchedulerGroup,
    awsEventBridgeRuleName:
      body.awsEventBridgeRuleName ?? current.awsEventBridgeRuleName,
    awsAccessKeyId: mergeKey(body.awsAccessKeyId, current.awsAccessKeyId),
    awsSecretAccessKey: mergeKey(
      body.awsSecretAccessKey,
      current.awsSecretAccessKey
    ),
  };

  saveSettings(updated);

  let schedulerSync:
    | { ok: boolean; expression: string; message: string }
    | undefined;

  if (updated.trendMinutes !== previousMinutes && canSyncAwsSchedule(updated)) {
    schedulerSync = await syncTrendSchedule(updated);
    saveSettings({
      ...updated,
      lastSchedulerSyncAt: new Date().toISOString(),
      lastSchedulerSyncMessage: schedulerSync.message,
    });
  }

  return NextResponse.json({
    settings: maskSettings(getSettings()),
    schedulerSync,
  });
}
