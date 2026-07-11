"use client";

import { useEffect, useState } from "react";
import type { AppSettings } from "@/types";
import { TrendTestModal } from "@/components/TrendTestModal";

export function SettingsForm() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [testModalOpen, setTestModalOpen] = useState(false);

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
      if (data.schedulerSync) {
        setMessage(
          data.schedulerSync.ok
            ? `저장되었습니다. AWS 스케줄러: ${data.schedulerSync.message}`
            : `저장되었습니다. AWS 동기화 실패: ${data.schedulerSync.message}`
        );
      } else {
        setMessage("저장되었습니다.");
      }
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-neutral-400">트렌드 수집</h2>
          <button
            type="button"
            onClick={() => setTestModalOpen(true)}
            className="rounded-lg border border-emerald-800 bg-emerald-950/40 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-900/40"
          >
            수집 테스트
          </button>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs text-neutral-500">지역 (geo)</span>
          <input
            value={settings.geo}
            onChange={(e) => setSettings({ ...settings, geo: e.target.value })}
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white outline-none"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-neutral-500">수집 주기 (분)</span>
          <input
            type="number"
            min={1}
            max={10080}
            value={settings.trendMinutes}
            onChange={(e) =>
              setSettings({ ...settings, trendMinutes: Number(e.target.value) })
            }
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white outline-none"
          />
          <p className="mt-1 text-xs text-neutral-500">
            저장 시 AWS 스케줄러/EventBridge 주기도 함께 변경됩니다. (1~10080분)
          </p>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-neutral-500">
            Cron Secret (Lambda 인증용)
          </span>
          <input
            type="password"
            value={settings.cronSecret}
            onChange={(e) => setSettings({ ...settings, cronSecret: e.target.value })}
            placeholder="Lambda CRON_SECRET 과 동일한 값"
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white outline-none focus:border-neutral-600"
          />
          <p className="mt-1 text-xs text-neutral-500">
            Lightsail `.env.local`의 CRON_SECRET 또는 여기 값과 Lambda 환경변수가
            일치해야 합니다. 401 오류는 대부분 이 값 불일치입니다.
          </p>
        </label>

        {settings.lastFetchAt && (
          <p className="text-xs text-neutral-500">
            마지막 수집: {new Date(settings.lastFetchAt).toLocaleString("ko-KR")}
          </p>
        )}

        {settings.lastSchedulerSyncAt && (
          <p className="text-xs text-neutral-500">
            마지막 AWS 동기화:{" "}
            {new Date(settings.lastSchedulerSyncAt).toLocaleString("ko-KR")}
            {settings.lastSchedulerSyncMessage
              ? ` — ${settings.lastSchedulerSyncMessage}`
              : ""}
          </p>
        )}

        <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4 space-y-3">
          <h3 className="text-xs font-medium text-neutral-400">AWS 스케줄러 연동</h3>
          <p className="text-xs text-neutral-500">
            EventBridge Scheduler 또는 Rule 이름을 입력하면 수집 주기 저장 시 AWS에 반영됩니다.
          </p>

          <label className="block">
            <span className="mb-1 block text-xs text-neutral-500">AWS 리전</span>
            <input
              value={settings.awsRegion}
              onChange={(e) => setSettings({ ...settings, awsRegion: e.target.value })}
              placeholder="ap-northeast-2"
              className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs text-neutral-500">스케줄 타입</span>
            <select
              value={settings.awsScheduleType}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  awsScheduleType: e.target.value as AppSettings["awsScheduleType"],
                })
              }
              className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white outline-none"
            >
              <option value="scheduler">EventBridge Scheduler</option>
              <option value="rule">EventBridge Rule (레거시)</option>
            </select>
          </label>

          {settings.awsScheduleType === "scheduler" ? (
            <>
              <label className="block">
                <span className="mb-1 block text-xs text-neutral-500">Scheduler 이름</span>
                <input
                  value={settings.awsSchedulerName}
                  onChange={(e) =>
                    setSettings({ ...settings, awsSchedulerName: e.target.value })
                  }
                  placeholder="trendblog-trends-cron"
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-neutral-500">Scheduler 그룹</span>
                <input
                  value={settings.awsSchedulerGroup}
                  onChange={(e) =>
                    setSettings({ ...settings, awsSchedulerGroup: e.target.value })
                  }
                  placeholder="default"
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white outline-none"
                />
              </label>
            </>
          ) : (
            <label className="block">
              <span className="mb-1 block text-xs text-neutral-500">EventBridge Rule 이름</span>
              <input
                value={settings.awsEventBridgeRuleName}
                onChange={(e) =>
                  setSettings({ ...settings, awsEventBridgeRuleName: e.target.value })
                }
                placeholder="trendblog-cron-rule"
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white outline-none"
              />
            </label>
          )}

          <label className="block">
            <span className="mb-1 block text-xs text-neutral-500">AWS Access Key ID (선택)</span>
            <input
              type="password"
              value={settings.awsAccessKeyId}
              onChange={(e) => setSettings({ ...settings, awsAccessKeyId: e.target.value })}
              placeholder="환경변수 AWS_ACCESS_KEY_ID 사용 가능"
              className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-neutral-500">AWS Secret Access Key (선택)</span>
            <input
              type="password"
              value={settings.awsSecretAccessKey}
              onChange={(e) =>
                setSettings({ ...settings, awsSecretAccessKey: e.target.value })
              }
              placeholder="환경변수 AWS_SECRET_ACCESS_KEY 사용 가능"
              className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white outline-none"
            />
          </label>
        </div>
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
            value="gemini-2.5-flash"
            readOnly
            className="w-full cursor-not-allowed rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-400 outline-none"
          />
          <p className="mt-1 text-xs text-neutral-500">
            모든 Gemini 호출(초안 생성, 재작성, 이미지)에 gemini-2.5-flash 가 고정 사용됩니다.
          </p>
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

      <TrendTestModal open={testModalOpen} onClose={() => setTestModalOpen(false)} />
    </div>
  );
}
