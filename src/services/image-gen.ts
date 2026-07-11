import { GoogleGenerativeAI } from "@google/generative-ai";
import { DEFAULT_GEMINI_MODEL } from "@/lib/gemini-config";
import { v4 as uuidv4 } from "uuid";
import { saveGeneratedImage } from "@/lib/db";

/**
 * AI 이미지 생성 — Gemini Imagen 또는 폴백 SVG 플레이스홀더
 * 저작권 프리: AI 생성 이미지 + 중립적 프롬프트
 */
export async function generateCopyrightFreeImage(
  promptScript: string,
  keyword: string
): Promise<{ imageUrl: string; method: "gemini" | "placeholder" }> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const result = await tryGeminiImage(apiKey, promptScript);
      if (result) return result;
    } catch {
      // fall through to placeholder
    }
  }

  const svg = buildPlaceholderSvg(keyword);
  const filename = `${uuidv4()}.svg`;
  const url = saveGeneratedImage(filename, Buffer.from(svg, "utf-8"));
  return { imageUrl: url, method: "placeholder" };
}

async function tryGeminiImage(
  apiKey: string,
  promptScript: string
): Promise<{ imageUrl: string; method: "gemini" } | null> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_IMAGE_MODEL || DEFAULT_GEMINI_MODEL;

  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const imagePrompt = extractVisualPrompt(promptScript);

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: imagePrompt }] }],
      generationConfig: {
        // @ts-expect-error — image generation config
        responseModalities: ["TEXT", "IMAGE"],
      },
    });

    const parts = result.response.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      if ("inlineData" in part && part.inlineData?.data) {
        const mime = part.inlineData.mimeType || "image/png";
        const ext = mime.includes("png") ? "png" : "jpg";
        const filename = `${uuidv4()}.${ext}`;
        const buffer = Buffer.from(part.inlineData.data, "base64");
        const url = saveGeneratedImage(filename, buffer);
        return { imageUrl: url, method: "gemini" };
      }
    }
  } catch {
    return null;
  }

  return null;
}

function extractVisualPrompt(script: string): string {
  const lines = script
    .split("\n")
    .filter((l) => !l.startsWith("[") && !l.startsWith("요구사항") && l.trim());
  return [
    "Create a copyright-free editorial blog illustration.",
    "No text, no watermarks, no logos, no recognizable faces.",
    "Clean, professional, 16:9 aspect ratio.",
    lines.join(" "),
  ].join(" ");
}

function buildPlaceholderSvg(keyword: string): string {
  const safe = keyword.replace(/[<>&"']/g, "").slice(0, 40);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
  <rect width="800" height="450" fill="#1a1a1a"/>
  <rect x="40" y="40" width="720" height="370" rx="8" fill="#262626" stroke="#404040"/>
  <text x="400" y="200" text-anchor="middle" fill="#737373" font-family="sans-serif" font-size="16">AI 생성 이미지</text>
  <text x="400" y="240" text-anchor="middle" fill="#a3a3a3" font-family="sans-serif" font-size="20">${safe}</text>
  <text x="400" y="280" text-anchor="middle" fill="#525252" font-family="sans-serif" font-size="13">저작권 프리 · Gemini API 연동 시 실제 이미지 생성</text>
</svg>`;
}
