"use client";

import { useState } from "react";
import { useNotifications } from "@/components/NotificationProvider";

export function FetchButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const { permission, requestPermission } = useNotifications();

  const fetchTrends = async (useSample: boolean) => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/trends/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ useSample, maxDrafts: 3 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.message);
      if (permission === "default") await requestPermission();
      window.location.reload();
    } catch (e) {
      setResult(e instanceof Error ? e.message : "수집 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={() => fetchTrends(false)}
        disabled={loading}
        className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50"
      >
        {loading ? "수집 중..." : "트렌드 수집 + 초안 생성"}
      </button>
      <button
        onClick={() => fetchTrends(true)}
        disabled={loading}
        className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:border-neutral-500 disabled:opacity-50"
      >
        샘플로 테스트
      </button>
      {permission !== "granted" && (
        <button
          onClick={requestPermission}
          className="text-sm text-neutral-500 hover:text-neutral-300"
        >
          알림 허용
        </button>
      )}
      {result && <span className="text-sm text-neutral-400">{result}</span>}
    </div>
  );
}
