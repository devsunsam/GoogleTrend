import { describe, expect, it } from "vitest";
import {
  buildRateExpression,
  clampTrendMinutes,
  migrateSettings,
} from "@/lib/settings-migrate";

describe("settings migration", () => {
  it("migrates legacy trendHours to trendMinutes", () => {
    const settings = migrateSettings({ trendHours: 4, geo: "US" });
    expect(settings.trendMinutes).toBe(240);
  });

  it("clamps trend minutes", () => {
    expect(clampTrendMinutes(0)).toBe(1);
    expect(clampTrendMinutes(20000)).toBe(10080);
  });

  it("builds EventBridge rate expression", () => {
    expect(buildRateExpression(30)).toBe("rate(30 minutes)");
    expect(buildRateExpression(1)).toBe("rate(1 minute)");
  });
});
