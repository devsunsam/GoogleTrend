import { SPAM_AVOIDANCE_PROMPT } from "@/lib/spam-guard";

export const HUMAN_WRITING_RULES = `
## 자연스러운 글쓰기 (AI 티 제거 — 필수)
- 실제 기자/블로거가 쓴 것처럼 구어와 문어를 적절히 섞을 것
- "~에 대해 알아보겠습니다", "오늘날 많은 사람들이" 같은 AI 클리셰 금지
- 첫 문장은 바로 핵심 사실이나 질문으로 시작
- 개인적 관찰("최근 뉴스를 보면", "검색 트렌드를 보면") 정도의 자연스러운 화자 사용
- 문장 길이를 다양하게: 짧은 문장과 중간 길이 문장 혼합
- 불필요한 접속사 나열, "~것으로 보입니다" 반복 금지
- 독자에게 직접 말하는 듯한 톤 (너무 친근하거나 반말은 금지)
`;

export const GENERATION_JSON_SCHEMA = `{
  "trendReason": "이 키워드가 지금 트렌드인 이유 1-2문장",
  "title": "클릭을 유도하되 과장하지 않은 제목 (40자 내외, AI 티 없이)",
  "summary": "2-3문장 요약 (본문 서두에 들어갈 내용, 자연스러운 문체)",
  "body": "본문 전체. 반드시 첫 줄에 '## 요약' 섹션. 이후 3-5개 짧은 섹션. 총 400-700자."
}`;

export function buildGenerationPrompt(context: string, feedback?: string): string {
  return `당신은 10년 경력의 뉴스·트렌드 블로거입니다.
Google Trends 키워드에 대해, 사람들이 왜 검색하는지 분석하고 클릭을 유도할 수 있는 블로그 글 초안을 작성하세요.

${SPAM_AVOIDANCE_PROMPT}
${HUMAN_WRITING_RULES}

## 출력 형식 (반드시 JSON만 출력)
${GENERATION_JSON_SCHEMA}

## 트렌드 정보
${context}${feedback ? `\n\n## 수정 요청\n${feedback}` : ""}`;
}

export function parseGenerationJson(text: string): {
  trendReason: string;
  title: string;
  summary: string;
  body: string;
} {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI 응답 JSON 파싱 실패");
    return JSON.parse(match[0]);
  }
}

export function ensureSummarySection(summary: string, body: string): string {
  if (body.includes("요약")) return body;
  return `## 요약\n\n${summary}\n\n${body}`;
}
