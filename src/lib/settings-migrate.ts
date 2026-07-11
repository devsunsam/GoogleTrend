import { DEFAULT_GEMINI_MODEL } from "@/lib/gemini-config";
import type { AppSettings } from "@/types";

const DEFAULT_SETTINGS: AppSettings = {
  blogUrl: "",
  blogApiKey: "",
  blogPlatform: "none",
  geo: "US",
  trendMinutes: 240,
  cronSecret: "",
  openaiApiKey: "",
  geminiApiKey: "",
  anthropicApiKey: "",
  openaiModel: "gpt-4o-mini",
  geminiModel: DEFAULT_GEMINI_MODEL,
  anthropicModel: "claude-3-5-haiku-latest",
  awsRegion: "ap-northeast-2",
  awsScheduleType: "scheduler",
  awsSchedulerName: "",
  awsSchedulerGroup: "default",
  awsEventBridgeRuleName: "",
  awsAccessKeyId: "",
  awsSecretAccessKey: "",
};

type LegacySettings = Partial<AppSettings> & { trendHours?: number };

export function migrateSettings(raw: LegacySettings): AppSettings {
  const trendMinutes =
    typeof raw.trendMinutes === "number"
      ? raw.trendMinutes
      : typeof raw.trendHours === "number"
        ? raw.trendHours * 60
        : DEFAULT_SETTINGS.trendMinutes;

  const { trendHours: _removed, ...rest } = raw;
  void _removed;

  return {
    ...DEFAULT_SETTINGS,
    ...rest,
    trendMinutes: clampTrendMinutes(trendMinutes),
    geminiModel: DEFAULT_GEMINI_MODEL,
  };
}

export function clampTrendMinutes(minutes: number): number {
  if (!Number.isFinite(minutes)) return DEFAULT_SETTINGS.trendMinutes;
  return Math.min(10080, Math.max(1, Math.round(minutes)));
}

export function buildRateExpression(minutes: number): string {
  const value = clampTrendMinutes(minutes);
  return `rate(${value} ${value === 1 ? "minute" : "minutes"})`;
}
