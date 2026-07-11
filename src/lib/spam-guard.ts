/**
 * Google SpamBrain 회피를 위한 콘텐츠 가이드라인 및 휴리스틱 검사.
 * SpamBrain은 ML 기반이므로 100% 회피를 보장할 수 없지만,
 * 흔한 스팸 패턴을 사전에 줄입니다.
 */

export const SPAM_AVOIDANCE_PROMPT = `
## SpamBrain 회피 작성 규칙 (필수)
1. 키워드 스터핑 금지: 같은 키워드를 3회 이상 반복하지 마세요.
2. 과장·선동형 문구 금지: "충격", "경악", "100% 확실", "지금 당장" 등 클릭베이트 표현 사용 금지.
3. 독창적 관점: 뉴스 헤드라인을 그대로 복사하지 말고, 독자에게 도움이 되는 맥락과 해석을 제공하세요.
4. 자연스러운 문장: 짧고 명확한 문장. AI가 쓴 듯한 뻔한 서론("오늘날 많은 사람들이~") 피하기.
5. 실용적 가치: 독자가 실제로 알고 싶어하는 이유(Why)와 행동 가이드(What to do)를 포함.
6. 적정 분량: 400-700자. 장황한 반복 없이 간결하게.
7. 신뢰성: 확인되지 않은 사실을 단정하지 말고, "~로 알려졌다", "보도에 따르면" 등 표현 사용.
8. 구조화: H2 소제목 3-5개. 목록과 짧은 단락 활용.
`;

const SPAM_PATTERNS: Array<{ pattern: RegExp; weight: number; note: string }> = [
  { pattern: /충격|경악|대박|미친|레전드/g, weight: 15, note: "과장 표현 감지" },
  { pattern: /100%|반드시|무조건|지금 당장/g, weight: 12, note: "선동형 표현" },
  { pattern: /클릭|공유|구독|좋아요/g, weight: 10, note: "행동 유도 CTA 과다" },
  { pattern: /(.)\1{4,}/g, weight: 8, note: "문자 반복" },
  { pattern: /!!!+/g, weight: 8, note: "느낌표 과다" },
  { pattern: /SEO|키워드\s*밀도/gi, weight: 20, note: "SEO 스팸 용어" },
  { pattern: /오늘날 많은 사람들이|현대 사회에서/g, weight: 5, note: "AI 틀 서론" },
];

export interface SpamEvaluation {
  score: number;
  notes: string;
  level: "low" | "medium" | "high";
}

export function evaluateSpamRisk(title: string, body: string): SpamEvaluation {
  const text = `${title}\n${body}`;
  let score = 0;
  const notes: string[] = [];

  for (const { pattern, weight, note } of SPAM_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      score += weight * Math.min(matches.length, 3);
      if (!notes.includes(note)) notes.push(note);
    }
  }

  const words = text.split(/\s+/);
  const wordFreq = new Map<string, number>();
  for (const w of words) {
    const lower = w.toLowerCase().replace(/[^a-z가-힣0-9]/g, "");
    if (lower.length < 3) continue;
    wordFreq.set(lower, (wordFreq.get(lower) ?? 0) + 1);
  }

  for (const [word, count] of wordFreq) {
    if (count >= 6) {
      score += 10;
      notes.push(`키워드 '${word}' ${count}회 반복`);
    }
  }

  if (body.length < 200) {
    score += 15;
    notes.push("본문이 너무 짧음");
  }
  if (body.length > 2000) {
    score += 10;
    notes.push("본문이 너무 김 (피로감 유발)");
  }

  score = Math.min(100, score);

  return {
    score,
    notes: notes.length ? notes.join("; ") : "스팸 위험 낮음",
    level: score >= 40 ? "high" : score >= 20 ? "medium" : "low",
  };
}

export function getSpamLevelColor(level: SpamEvaluation["level"]): string {
  switch (level) {
    case "low":
      return "text-green-500";
    case "medium":
      return "text-yellow-500";
    case "high":
      return "text-red-500";
  }
}

export function getSpamLevelLabel(level: SpamEvaluation["level"]): string {
  switch (level) {
    case "low":
      return "낮음";
    case "medium":
      return "보통";
    case "high":
      return "높음";
  }
}

export function getSpamLevelFromScore(score: number): SpamEvaluation["level"] {
  return score >= 40 ? "high" : score >= 20 ? "medium" : "low";
}
