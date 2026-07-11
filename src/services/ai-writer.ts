import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AiProvider, AppSettings, GenerateResult, TrendItem } from "@/types";
import { buildTrendContext } from "@/services/trends";
import { analyzeContentLayout } from "@/lib/content-layout";
import { evaluateSpamRisk } from "@/lib/spam-guard";
import {
  buildGenerationPrompt,
  ensureSummarySection,
  parseGenerationJson,
} from "@/lib/ai-prompts";
import { generateMockDraft } from "@/services/gemini";
import { getSettings } from "@/lib/db";
import { PROVIDER_LABELS } from "@/lib/ai-providers";

export { PROVIDER_LABELS };

function inferTrendReason(trend: TrendItem): string {
  if (trend.newsContext) return `${trend.newsContext} 관련 검색이 급증하고 있습니다.`;
  if (trend.relatedQueries?.length)
    return `${trend.relatedQueries.slice(0, 2).join(", ")} 등 연관 검색과 함께 주목받고 있습니다.`;
  return "최근 관련 이슈로 검색량이 증가했습니다.";
}

function attachLayout(
  parsed: { trendReason: string; title: string; summary: string; body: string },
  keyword: string,
  provider: AiProvider
): GenerateResult {
  const body = ensureSummarySection(parsed.summary, parsed.body.trim());
  const layout = analyzeContentLayout(body, keyword);
  const spam = evaluateSpamRisk(parsed.title, body);
  return {
    trendReason: parsed.trendReason?.trim() || inferTrendReason({ keyword }),
    title: parsed.title.trim(),
    summary: parsed.summary.trim(),
    body,
    imageSlots: layout.imageSlots,
    adSlots: layout.adSlots,
    spamScore: spam.score,
    spamNotes: spam.notes,
    provider,
  };
}

function resolveKeys(settings: AppSettings) {
  return {
    openai: settings.openaiApiKey || process.env.OPENAI_API_KEY || "",
    gemini: settings.geminiApiKey || process.env.GEMINI_API_KEY || "",
    anthropic: settings.anthropicApiKey || process.env.ANTHROPIC_API_KEY || "",
  };
}

async function callGemini(
  prompt: string,
  apiKey: string,
  model: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const m = genAI.getGenerativeModel({ model });
  const result = await m.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.85, responseMimeType: "application/json" },
  });
  return result.response.text();
}

async function callOpenAI(
  prompt: string,
  apiKey: string,
  model: string
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.85,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are a professional Korean blog writer. Respond only in valid JSON.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API 오류: ${err}`);
  }
  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices[0]?.message?.content ?? "";
}

async function callClaude(
  prompt: string,
  apiKey: string,
  model: string
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      temperature: 0.85,
      messages: [{ role: "user", content: prompt + "\n\n반드시 JSON만 출력하세요." }],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API 오류: ${err}`);
  }
  const data = (await res.json()) as {
    content: Array<{ type: string; text: string }>;
  };
  return data.content.find((c) => c.type === "text")?.text ?? "";
}

export async function generateWithProvider(
  trend: TrendItem,
  provider: AiProvider,
  feedback?: string
): Promise<GenerateResult> {
  const settings = getSettings();
  const keys = resolveKeys(settings);
  const context = buildTrendContext(trend);
  const prompt = buildGenerationPrompt(context, feedback);

  const hasKey =
    (provider === "gemini" && keys.gemini) ||
    (provider === "chatgpt" && keys.openai) ||
    (provider === "claude" && keys.anthropic);

  if (!hasKey) {
    const mock = generateMockDraft(trend);
    return { ...mock, provider };
  }

  let raw: string;
  switch (provider) {
    case "gemini":
      raw = await callGemini(prompt, keys.gemini, settings.geminiModel);
      break;
    case "chatgpt":
      raw = await callOpenAI(prompt, keys.openai, settings.openaiModel);
      break;
    case "claude":
      raw = await callClaude(prompt, keys.anthropic, settings.anthropicModel);
      break;
  }

  const parsed = parseGenerationJson(raw);
  return attachLayout(parsed, trend.keyword, provider);
}

export function getAvailableProviders(): AiProvider[] {
  const settings = getSettings();
  const keys = resolveKeys(settings);
  const available: AiProvider[] = [];
  if (keys.gemini) available.push("gemini");
  if (keys.openai) available.push("chatgpt");
  if (keys.anthropic) available.push("claude");
  return available;
}
