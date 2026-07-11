import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { DEFAULT_GEMINI_MODEL } from "@/lib/gemini-config";
import { getSettings } from "@/lib/db";
import { getGeminiModelWarnings, parseGeminiErrorDetails } from "@/lib/gemini-quota";

function maskKey(key: string): string {
  if (!key) return "(미설정)";
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

async function probeGeminiModel(apiKey: string) {
  try {
    const client = new GoogleGenerativeAI(apiKey);
    const geminiModel = client.getGenerativeModel({ model: DEFAULT_GEMINI_MODEL });
    const result = await geminiModel.generateContent({
      contents: [{ role: "user", parts: [{ text: 'Reply with JSON: {"ok":true}' }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        maxOutputTokens: 16,
      },
    });
    return {
      ok: true,
      model: DEFAULT_GEMINI_MODEL,
      responsePreview: result.response.text().slice(0, 80),
    };
  } catch (error) {
    return {
      ok: false,
      model: DEFAULT_GEMINI_MODEL,
      ...parseGeminiErrorDetails(error),
    };
  }
}

export async function GET(request: Request) {
  const settings = getSettings();
  const envKey = process.env.GEMINI_API_KEY ?? "";
  const settingsKey = settings.geminiApiKey ?? "";
  const activeKey = settingsKey || envKey;
  const { searchParams } = new URL(request.url);
  const shouldProbe = searchParams.get("probe") === "true";

  const warnings = [
    ...getGeminiModelWarnings(),
    ...(settingsKey && envKey && settingsKey !== envKey
      ? [
          "설정 UI의 Gemini API Key와 .env.local GEMINI_API_KEY 가 다릅니다. 설정 UI 값이 우선 사용됩니다.",
        ]
      : []),
  ];

  const payload: Record<string, unknown> = {
    activeModel: DEFAULT_GEMINI_MODEL,
    keySource: settingsKey ? "settings" : envKey ? "env" : "none",
    keyPreview: maskKey(activeKey),
    warnings,
  };

  if (shouldProbe) {
    if (!activeKey) {
      payload.probe = { ok: false, error: "API 키가 설정되지 않았습니다." };
    } else {
      payload.probe = await probeGeminiModel(activeKey);
    }
  }

  return NextResponse.json(payload);
}
