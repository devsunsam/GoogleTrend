/** gemini-2.5-flash cron/초안 생성용 generationConfig */
export function buildGeminiGenerationConfig(options?: {
  maxOutputTokens?: number;
  temperature?: number;
  json?: boolean;
}) {
  const config: Record<string, unknown> = {
    temperature: options?.temperature ?? 0.85,
    maxOutputTokens: options?.maxOutputTokens ?? 2048,
    // thinking 비활성 — 속도·토큰 절약, cron/Lambda 안정성
    thinkingConfig: { thinkingBudget: 0 },
  };

  if (options?.json !== false) {
    config.responseMimeType = "application/json";
  }

  return config;
}
