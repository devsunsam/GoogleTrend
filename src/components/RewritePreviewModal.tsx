"use client";

import type { GenerateResult, AiProvider } from "@/types";
import { PROVIDER_LABELS } from "@/lib/ai-providers";

interface RewritePreviewModalProps {
  generated: GenerateResult;
  provider: AiProvider;
  onApply: () => void;
  onCancel: () => void;
  applying: boolean;
}

export function RewritePreviewModal({
  generated,
  provider,
  onApply,
  onCancel,
  applying,
}: RewritePreviewModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-6">
      <div className="my-8 w-full max-w-2xl rounded-lg border border-neutral-800 bg-[#141414]">
        <div className="border-b border-neutral-800 px-6 py-4">
          <h3 className="text-lg font-medium text-white">
            AI 재작성 제안 — {PROVIDER_LABELS[provider]}
          </h3>
          <p className="mt-1 text-xs text-neutral-500">
            내용을 확인한 후 &quot;적용&quot;을 누르면 제목·요약·본문이 수정됩니다.
          </p>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <p className="mb-1 text-xs text-neutral-500">제목</p>
            <p className="text-base text-white">{generated.title}</p>
          </div>
          <div>
            <p className="mb-1 text-xs text-neutral-500">요약</p>
            <p className="text-sm text-neutral-300">{generated.summary}</p>
          </div>
          <div>
            <p className="mb-1 text-xs text-neutral-500">본문</p>
            <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg bg-neutral-900 p-4 text-sm text-neutral-300">
              {generated.body}
            </pre>
          </div>
          <p className="text-xs text-neutral-500">
            스팸 위험: {generated.spamScore} — {generated.spamNotes}
          </p>
        </div>

        <div className="flex gap-3 border-t border-neutral-800 px-6 py-4">
          <button
            onClick={onApply}
            disabled={applying}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50"
          >
            {applying ? "적용 중..." : "적용"}
          </button>
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm text-neutral-500 hover:text-neutral-300"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
