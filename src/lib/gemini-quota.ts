import { DEFAULT_GEMINI_MODEL } from "@/lib/gemini-config";

export function normalizeGeminiModel(_model?: string): string {
  return DEFAULT_GEMINI_MODEL;
}

export function getGeminiModelWarnings(): string[] {
  return [
    `${DEFAULT_GEMINI_MODEL} 고정 사용 중입니다. 무료 티어는 RPM/RPD 제한이 있으니 cron 주기를 너무 짧게 설정하지 마세요.`,
  ];
}

export function getGeminiFallbackModels(): string[] {
  return [DEFAULT_GEMINI_MODEL];
}

export interface GeminiErrorDetails {
  statusCode?: number;
  model?: string;
  limitZero: boolean;
  isRateLimit: boolean;
  retryDelayMs: number;
  summary: string;
}

export function isGeminiQuotaError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  return (
    message.includes("429") ||
    lower.includes("quota") ||
    lower.includes("too many requests") ||
    lower.includes("rate limit")
  );
}

export function parseGeminiRetryDelayMs(error: unknown): number {
  const message = error instanceof Error ? error.message : String(error);
  const secondsMatch = message.match(/retry in (\d+(?:\.\d+)?)s/i);
  if (secondsMatch) {
    return Math.min(Math.ceil(parseFloat(secondsMatch[1]) * 1000), 120_000);
  }
  return 5000;
}

export function shortenGeminiError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("404") || /not found/i.test(message)) {
    return "Gemini 모델/API를 찾을 수 없음 (404) — API 키·모델명 확인";
  }
  if (message.includes("403") || /permission denied/i.test(message)) {
    return "Gemini API 키 권한 오류 (403)";
  }
  if (message.includes("429") && /limit:\s*0/i.test(message)) {
    const modelMatch = message.match(/model:\s*([\w.-]+)/i);
    return modelMatch
      ? `${modelMatch[1]} API limit:0 (${DEFAULT_GEMINI_MODEL} 키/프로젝트 한도 확인)`
      : `Gemini API limit:0 (${DEFAULT_GEMINI_MODEL} 키/프로젝트 한도 확인)`;
  }
  if (message.includes("429")) return "Gemini API 속도/할당량 제한 (429)";
  if (message.length <= 120) return message;
  return `${message.slice(0, 117)}...`;
}

export function parseGeminiErrorDetails(error: unknown): GeminiErrorDetails {
  const message = error instanceof Error ? error.message : String(error);
  const modelMatch = message.match(/model:\s*([\w.-]+)/i);
  const limitZero = /limit:\s*0/i.test(message);
  const isRateLimit = isGeminiQuotaError(error);

  let summary = shortenGeminiError(error);
  if (limitZero && modelMatch) {
    summary = `${modelMatch[1]} limit:0 — AI Studio에서 ${DEFAULT_GEMINI_MODEL} 프로젝트/API 키 한도를 확인하세요.`;
  } else if (isRateLimit) {
    summary = "Gemini API 속도/할당량 제한 (429)";
  }

  return {
    statusCode: message.includes("429") ? 429 : undefined,
    model: modelMatch?.[1],
    limitZero,
    isRateLimit,
    retryDelayMs: parseGeminiRetryDelayMs(error),
    summary,
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
