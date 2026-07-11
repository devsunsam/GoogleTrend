import { describe, expect, it } from "vitest";
import { DEFAULT_GEMINI_MODEL, resolveGeminiModel } from "@/lib/gemini-config";
import {
  getGeminiFallbackModels,
  isGeminiQuotaError,
  normalizeGeminiModel,
  parseGeminiErrorDetails,
  parseGeminiRetryDelayMs,
  shortenGeminiError,
} from "@/lib/gemini-quota";
import { migrateSettings } from "@/lib/settings-migrate";

describe("gemini config", () => {
  it("uses gemini-2.5-flash consistently", () => {
    expect(DEFAULT_GEMINI_MODEL).toBe("gemini-2.5-flash");
    expect(resolveGeminiModel()).toBe("gemini-2.5-flash");
    expect(normalizeGeminiModel("gemini-2.0-flash")).toBe("gemini-2.5-flash");
  });
});

describe("gemini quota helpers", () => {
  it("detects quota errors", () => {
    expect(isGeminiQuotaError(new Error("[429 Too Many Requests] quota exceeded"))).toBe(
      true
    );
    expect(isGeminiQuotaError(new Error("network error"))).toBe(false);
  });

  it("migrates settings model to gemini-2.5-flash", () => {
    const settings = migrateSettings({ geminiModel: "gemini-2.0-flash" });
    expect(settings.geminiModel).toBe("gemini-2.5-flash");
  });

  it("parses retry delay from error message", () => {
    expect(
      parseGeminiRetryDelayMs(new Error("Please retry in 50.911602005s."))
    ).toBe(50912);
  });

  it("detects limit zero for specific model", () => {
    const details = parseGeminiErrorDetails(
      new Error(
        "[429] limit: 0, model: gemini-2.0-flash free_tier_requests exceeded"
      )
    );
    expect(details.limitZero).toBe(true);
    expect(details.model).toBe("gemini-2.0-flash");
    expect(details.summary).toContain("gemini-2.5-flash");
  });

  it("uses single fallback model", () => {
    expect(getGeminiFallbackModels()).toEqual(["gemini-2.5-flash"]);
  });

  it("shortens long gemini errors", () => {
    const short = shortenGeminiError(new Error("[429 Too Many Requests] quota"));
    expect(short).toContain("429");
  });
});
