"use client";

import { useEffect, useState } from "react";
import type { TrendTestResult } from "@/types";

interface TrendTestModalProps {
  open: boolean;
  onClose: () => void;
}

export function TrendTestModal({ open, onClose }: TrendTestModalProps) {
  const [running, setRunning] = useState(false);
  const [useSample, setUseSample] = useState(false);
  const [result, setResult] = useState<TrendTestResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const runTest = async () => {
    setRunning(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/trends/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          useSample,
          dryRun: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "테스트 실패");
      setResult(data as TrendTestResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "테스트 실행에 실패했습니다.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="trend-test-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-neutral-700 bg-[#111] p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="trend-test-title" className="text-lg font-semibold text-white">
              트렌드 수집 테스트
            </h2>
            <p className="mt-1 text-sm text-neutral-400">
              Google Trends 수집이 정상 동작하는지 확인합니다. 초안은 생성하지 않습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-neutral-400 hover:bg-neutral-800 hover:text-white"
          >
            닫기
          </button>
        </div>

        <label className="mb-4 flex items-center gap-2 text-sm text-neutral-300">
          <input
            type="checkbox"
            checked={useSample}
            onChange={(e) => setUseSample(e.target.checked)}
            className="rounded border-neutral-600"
          />
          샘플 데이터로 테스트 (Google Trends API 우회)
        </label>

        <button
          type="button"
          onClick={runTest}
          disabled={running}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {running ? "수집 중..." : "수집 테스트 실행"}
        </button>

        {error && (
          <p className="mt-4 rounded-lg border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {result && (
          <div className="mt-6 space-y-4">
            <div
              className={`rounded-lg border px-4 py-3 text-sm ${
                result.ok
                  ? "border-emerald-900 bg-emerald-950/30 text-emerald-200"
                  : "border-amber-900 bg-amber-950/30 text-amber-200"
              }`}
            >
              {result.ok ? "수집 테스트 성공" : "수집은 되었으나 경고가 있습니다"}
              <div className="mt-2 text-xs text-neutral-300">
                지역: {result.geo} · 주기: {result.trendMinutes}분 · 소요:{" "}
                {result.durationMs}ms · 키워드 {result.fetched}개
                {result.usedSample ? " · 샘플 데이터" : ""}
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="rounded-lg border border-amber-900 bg-amber-950/20 p-4">
                <h3 className="mb-2 text-sm font-medium text-amber-200">경고 / 오류</h3>
                <ul className="list-disc space-y-1 pl-5 text-xs text-amber-100/90">
                  {result.errors.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
              <h3 className="mb-3 text-sm font-medium text-neutral-200">수집 결과</h3>
              {result.trends.length === 0 ? (
                <p className="text-sm text-neutral-500">수집된 키워드가 없습니다.</p>
              ) : (
                <ul className="space-y-3">
                  {result.trends.map((trend) => (
                    <li
                      key={trend.keyword}
                      className="rounded-lg border border-neutral-800 bg-[#141414] p-3"
                    >
                      <p className="font-medium text-white">{trend.keyword}</p>
                      {trend.searchVolume && (
                        <p className="mt-1 text-xs text-neutral-400">
                          검색량: {trend.searchVolume}
                        </p>
                      )}
                      {trend.newsContext && (
                        <p className="mt-1 text-xs text-neutral-500">{trend.newsContext}</p>
                      )}
                      {trend.relatedQueries && trend.relatedQueries.length > 0 && (
                        <p className="mt-1 text-xs text-neutral-500">
                          연관: {trend.relatedQueries.join(", ")}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
