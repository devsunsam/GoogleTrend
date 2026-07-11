"use client";

import { useEffect, useState } from "react";
import type { AppSettings } from "@/types";

export function SettingsForm() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setSettings(d.settings));
  }, []);

  if (!settings) {
    return <p className="text-sm text-neutral-500">설정 불러오는 중...</p>;
  }

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error("저장 실패");
      setSettings(data.settings);
      setMessage("저장되었습니다.");
    } catch {
      setMessage("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-neutral-800 bg-[#141414] p-6 space-y-4">
        <h2 className="text-sm font-medium text-neutral-400">블로그 연동</h2>

        <label className="block">
          <span className="mb-1 block text-xs text-neutral-500">블로그 URL (추후 입력)</span>
          <input
            value={settings.blogUrl}
            onChange={(e) => setSettings({ ...settings, blogUrl: e.target.value })}
            placeholder="https://your-blog.com"
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white outline-none focus:border-neutral-600"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-neutral-500">플랫폼</span>
          <select
            value={settings.blogPlatform}
            onChange={(e) =>
              setSettings({
                ...settings,
                blogPlatform: e.target.value as AppSettings["blogPlatform"],
              })
            }
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white outline-none"
          >
            <option value="none">시뮬레이션 (테스트)</option>
            <option value="webhook">Webhook</option>
            <option value="wordpress">WordPress REST API</option>
            <option value="blogger">Blogger (준비 중)</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-neutral-500">API 키 / Bearer 토큰</span>
          <input
            type="password"
            value={settings.blogApiKey}
            onChange={(e) => setSettings({ ...settings, blogApiKey: e.target.value })}
            placeholder="WordPress Application Password 등"
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white outline-none focus:border-neutral-600"
          />
        </label>
      </section>

      <section className="rounded-lg border border-neutral-800 bg-[#141414] p-6 space-y-4">
        <h2 className="text-sm font-medium text-neutral-400">트렌드 수집</h2>

        <label className="block">
          <span className="mb-1 block text-xs text-neutral-500">지역 (geo)</span>
          <input
            value={settings.geo}
            onChange={(e) => setSettings({ ...settings, geo: e.target.value })}
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white outline-none"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-neutral-500">수집 주기 (시간)</span>
          <input
            type="number"
            min={1}
            max={24}
            value={settings.trendHours}
            onChange={(e) =>
              setSettings({ ...settings, trendHours: Number(e.target.value) })
            }
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white outline-none"
          />
        </label>

        {settings.lastFetchAt && (
          <p className="text-xs text-neutral-500">
            마지막 수집: {new Date(settings.lastFetchAt).toLocaleString("ko-KR")}
          </p>
        )}
      </section>

      <section className="rounded-lg border border-neutral-800 bg-[#141414] p-6 space-y-4">
        <h2 className="text-sm font-medium text-neutral-400">AI 재작성 API</h2>
        <p className="text-xs text-neutral-500">
          초안 편집에서 ChatGPT, Gemini, Claude 중 선택해 재작성할 수 있습니다.
        </p>

        <label className="block">
          <span className="mb-1 block text-xs text-neutral-500">Gemini API Key</span>
          <input
            type="password"
            value={settings.geminiApiKey}
            onChange={(e) => setSettings({ ...settings, geminiApiKey: e.target.value })}
            placeholder="Google AI Studio API Key"
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white outline-none focus:border-neutral-600"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-neutral-500">Gemini 모델</span>
          <input
            value={settings.geminiModel}
            onChange={(e) => setSettings({ ...settings, geminiModel: e.target.value })}
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white outline-none"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-neutral-500">OpenAI (ChatGPT) API Key</span>
          <input
            type="password"
            value={settings.openaiApiKey}
            onChange={(e) => setSettings({ ...settings, openaiApiKey: e.target.value })}
            placeholder="sk-..."
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white outline-none focus:border-neutral-600"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-neutral-500">OpenAI 모델</span>
          <input
            value={settings.openaiModel}
            onChange={(e) => setSettings({ ...settings, openaiModel: e.target.value })}
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white outline-none"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-neutral-500">Anthropic (Claude) API Key</span>
          <input
            type="password"
            value={settings.anthropicApiKey}
            onChange={(e) => setSettings({ ...settings, anthropicApiKey: e.target.value })}
            placeholder="sk-ant-..."
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white outline-none focus:border-neutral-600"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-neutral-500">Claude 모델</span>
          <input
            value={settings.anthropicModel}
            onChange={(e) => setSettings({ ...settings, anthropicModel: e.target.value })}
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white outline-none"
          />
        </label>
      </section>

      <button
        onClick={save}
        disabled={saving}
        className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50"
      >
        {saving ? "저장 중..." : "설정 저장"}
      </button>

      {message && <p className="text-sm text-neutral-400">{message}</p>}
    </div>
  );
}
