import { NextResponse } from "next/server";
import { getSettings, saveSettings } from "@/lib/db";
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

  const updated: AppSettings = {
    blogUrl: body.blogUrl ?? current.blogUrl,
    blogApiKey: mergeKey(body.blogApiKey, current.blogApiKey),
    blogPlatform: body.blogPlatform ?? current.blogPlatform,
    geo: body.geo ?? current.geo,
    trendHours: body.trendHours ?? current.trendHours,
    cronSecret: mergeKey(body.cronSecret, current.cronSecret),
    lastFetchAt: current.lastFetchAt,
    openaiApiKey: mergeKey(body.openaiApiKey, current.openaiApiKey),
    geminiApiKey: mergeKey(body.geminiApiKey, current.geminiApiKey),
    anthropicApiKey: mergeKey(body.anthropicApiKey, current.anthropicApiKey),
    openaiModel: body.openaiModel ?? current.openaiModel,
    geminiModel: body.geminiModel ?? current.geminiModel,
    anthropicModel: body.anthropicModel ?? current.anthropicModel,
  };

  saveSettings(updated);
  return NextResponse.json({ settings: maskSettings(updated) });
}
