/** 앱 전체에서 사용하는 Gemini 텍스트/이미지 모델 (일관성 유지) */
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

export function resolveGeminiModel(): string {
  return DEFAULT_GEMINI_MODEL;
}
