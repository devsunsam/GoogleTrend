import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { getCronSecret, verifyCronAuth } from "@/lib/cron-auth";

vi.mock("@/lib/db", () => ({
  getSettings: vi.fn(() => ({ cronSecret: "from-settings" })),
}));

describe("cron auth", () => {
  const originalEnv = process.env.CRON_SECRET;

  beforeEach(() => {
    delete process.env.CRON_SECRET;
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalEnv;
    }
  });

  it("prefers env CRON_SECRET over settings", () => {
    process.env.CRON_SECRET = " from-env ";
    expect(getCronSecret()).toBe("from-env");
  });

  it("falls back to settings cronSecret", () => {
    expect(getCronSecret()).toBe("from-settings");
  });

  it("accepts bearer token", () => {
    process.env.CRON_SECRET = "abc123";
    const request = new Request("http://localhost/api/cron/trends", {
      headers: { Authorization: "Bearer abc123" },
    });
    expect(verifyCronAuth(request)).toBe(true);
  });

  it("rejects wrong token", () => {
    process.env.CRON_SECRET = "abc123";
    const request = new Request("http://localhost/api/cron/trends", {
      headers: { Authorization: "Bearer wrong" },
    });
    expect(verifyCronAuth(request)).toBe(false);
  });
});
