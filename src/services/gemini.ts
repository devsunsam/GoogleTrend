import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GenerateResult, TrendItem } from "@/types";
import { buildTrendContext } from "@/services/trends";
import { evaluateSpamRisk, SPAM_AVOIDANCE_PROMPT } from "@/lib/spam-guard";
import { analyzeContentLayout } from "@/lib/content-layout";

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY 환경변수가 설정되지 않았습니다.");
  }
  return new GoogleGenerativeAI(apiKey);
}

const HUMAN_WRITING_RULES = `
## 자연스러운 글쓰기 (AI 티 제거 — 필수)
- 실제 기자/블로거가 쓴 것처럼 구어와 문어를 적절히 섞을 것
- "~에 대해 알아보겠습니다", "오늘날 많은 사람들이" 같은 AI 클리셰 금지
- 첫 문장은 바로 핵심 사실이나 질문으로 시작
- 개인적 관찰("최근 뉴스를 보면", "검색 트렌드를 보면") 정도의 자연스러운 화자 사용
- 문장 길이를 다양하게: 짧은 문장과 중간 길이 문장 혼합
- 불필요한 접속사 나열, "~것으로 보입니다" 반복 금지
- 독자에게 직접 말하는 듯한 톤 (너무 친근하거나 반말은 금지)
`;

const GENERATION_PROMPT = `당신은 10년 경력의 뉴스·트렌드 블로거입니다.
Google Trends 키워드에 대해, 사람들이 왜 검색하는지 분석하고 클릭을 유도할 수 있는 블로그 글 초안을 작성하세요.

${SPAM_AVOIDANCE_PROMPT}
${HUMAN_WRITING_RULES}

## 출력 형식 (반드시 JSON만 출력)
{
  "trendReason": "이 키워드가 지금 트렌드인 이유 1-2문장 (대시보드용 간략 설명)",
  "title": "클릭을 유도하되 과장하지 않은 제목 (40자 내외, AI 티 없이)",
  "summary": "2-3문장 요약 (본문 서두에 들어갈 내용, 자연스러운 문체)",
  "body": "본문 전체. 반드시 첫 줄에 '## 요약' 섹션. 이후 3-5개 짧은 섹션. 총 400-700자. AI가 쓴 티가 나지 않게."
}

## 트렌드 정보
`;

function attachLayout(result: Omit<GenerateResult, "spamScore" | "spamNotes">, keyword: string): GenerateResult {
  const layout = analyzeContentLayout(result.body, keyword);
  const spam = evaluateSpamRisk(result.title, result.body);
  return {
    ...result,
    imageSlots: layout.imageSlots,
    adSlots: layout.adSlots,
    spamScore: spam.score,
    spamNotes: spam.notes,
  };
}

function parseGeminiJson(text: string): {
  trendReason: string;
  title: string;
  summary: string;
  body: string;
} {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Gemini 응답 파싱 실패");
    return JSON.parse(match[0]);
  }
}

export async function generateBlogDraft(trend: TrendItem): Promise<GenerateResult> {
  const context = buildTrendContext(trend);
  const model = getGeminiClient().getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: GENERATION_PROMPT + context }] }],
    generationConfig: {
      temperature: 0.85,
      responseMimeType: "application/json",
    },
  });

  const parsed = parseGeminiJson(result.response.text());
  let body = parsed.body;
  if (!body.includes("요약")) {
    body = `## 요약\n\n${parsed.summary}\n\n${body}`;
  }

  return attachLayout(
    {
      trendReason: parsed.trendReason?.trim() || inferTrendReason(trend),
      title: parsed.title.trim(),
      summary: parsed.summary.trim(),
      body: body.trim(),
      imageSlots: [],
      adSlots: [],
    },
    trend.keyword
  );
}

function inferTrendReason(trend: TrendItem): string {
  if (trend.newsContext) return `${trend.newsContext} 관련 검색이 급증하고 있습니다.`;
  if (trend.relatedQueries?.length)
    return `${trend.relatedQueries.slice(0, 2).join(", ")} 등 연관 검색과 함께 주목받고 있습니다.`;
  return "최근 관련 이슈로 검색량이 증가했습니다.";
}

/** API 키 없을 때 UI 테스트용 */
export function generateMockDraft(trend: TrendItem): GenerateResult {
  const trendReason =
    trend.newsContext
      ? `${trend.newsContext} — 이 이슈가 확산되며 '${trend.keyword}' 검색이 늘었습니다.`
      : `'${trend.keyword}' 관련 최근 이슈로 미국에서 검색량이 급증했습니다.`;

  const title = `${trend.keyword}, 지금 검색하는 이유`;
  const summary = `${trend.keyword}이(가) 갑자기 많이 검색되고 있습니다. ${trend.newsContext || "관련 뉴스와 이슈가 겹치면서 사람들이 배경을 알고 싶어하는 것으로 보입니다."}`;
  const body = `## 요약

${summary}

## 왜 갑자기 검색될까

${trend.keyword}은(는) ${trend.relatedQueries?.slice(0, 2).join(", ") || "관련 키워드"}와 함께 올라왔습니다. ${trend.searchVolume ? `검색량은 ${trend.searchVolume} 수준입니다.` : ""}

## 지금 확인할 것

- 공식 발표나 신뢰할 수 있는 매체 보도를 먼저 확인하세요.
- SNS만으로 판단하기보다 출처를 교차 검증하는 게 좋습니다.

## 정리

${trendReason} 과도한 추측보다 확인된 사실 위주로 접근하는 편이 낫습니다.`;

  return attachLayout(
    {
      trendReason,
      title,
      summary,
      body,
      imageSlots: [],
      adSlots: [],
    },
    trend.keyword
  );
}

export async function regenerateDraft(
  trend: TrendItem,
  feedback?: string
): Promise<GenerateResult> {
  if (!process.env.GEMINI_API_KEY) {
    return generateMockDraft(trend);
  }

  const context = buildTrendContext(trend);
  const model = getGeminiClient().getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
  });

  const prompt =
    GENERATION_PROMPT +
    context +
    (feedback ? `\n\n## 수정 요청\n${feedback}` : "");

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.85,
      responseMimeType: "application/json",
    },
  });

  const parsed = parseGeminiJson(result.response.text());
  let body = parsed.body;
  if (!body.includes("요약")) {
    body = `## 요약\n\n${parsed.summary}\n\n${body}`;
  }

  return attachLayout(
    {
      trendReason: parsed.trendReason?.trim() || inferTrendReason(trend),
      title: parsed.title.trim(),
      summary: parsed.summary.trim(),
      body: body.trim(),
      imageSlots: [],
      adSlots: [],
    },
    trend.keyword
  );
}

export async function refinePromptScript(
  keyword: string,
  currentScript: string,
  sectionTitle: string
): Promise<string> {
  if (!process.env.GEMINI_API_KEY) return currentScript;

  const model = getGeminiClient().getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
  });

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `블로그 '${keyword}' 글의 '${sectionTitle}' 섹션용 저작권 프리 AI 이미지 생성 스크립트를 다듬어 주세요.
실제 인물 초상권, 상표, 저작권 문제가 없도록 일반적이고 중립적으로 작성하세요.
스크립트만 출력하세요.\n\n현재 스크립트:\n${currentScript}`,
          },
        ],
      },
    ],
    generationConfig: { temperature: 0.6 },
  });

  return result.response.text().trim() || currentScript;
}
