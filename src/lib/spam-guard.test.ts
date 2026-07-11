import { describe, it, expect } from "vitest";
import { evaluateSpamRisk, getSpamLevelFromScore } from "@/lib/spam-guard";

describe("evaluateSpamRisk", () => {
  it("returns low score for clean content", () => {
    const result = evaluateSpamRisk(
      "연준 금리 결정, 지금 알아야 할 것",
      "## 요약\n\n연준이 금리를 유지했습니다.\n\n## 배경\n시장은 인플레이션 지표를 주시하고 있습니다."
    );
    expect(result.score).toBeLessThan(20);
    expect(getSpamLevelFromScore(result.score)).toBe("low");
  });

  it("detects clickbait patterns", () => {
    const result = evaluateSpamRisk(
      "충격! 경악! 100% 확실한 대박 정보!!!",
      "지금 당장 클릭하세요!!!"
    );
    expect(result.score).toBeGreaterThan(30);
    expect(result.notes).toContain("과장 표현");
  });

  it("flags very short body", () => {
    const result = evaluateSpamRisk("제목", "짧음");
    expect(result.notes).toContain("너무 짧음");
  });
});
