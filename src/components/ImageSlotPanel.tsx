"use client";

import type { ImageSlot } from "@/types";

interface ImageSlotPanelProps {
  slots: ImageSlot[];
  onToggleInclude: (slotId: string, included: boolean) => void;
  onGenerate: (slotId: string) => void;
  generatingId: string | null;
}

export function ImageSlotPanel({
  slots,
  onToggleInclude,
  onGenerate,
  generatingId,
}: ImageSlotPanelProps) {
  if (slots.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        이미지 배치 추천이 없습니다. 본문 저장 후 &quot;레이아웃 분석&quot;을 실행하세요.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {slots.map((slot) => (
        <div
          key={slot.id}
          className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4"
        >
          <div className="mb-2 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-white">{slot.sectionTitle}</p>
              <p className="mt-1 text-xs text-neutral-500">{slot.description}</p>
            </div>
            <label className="flex shrink-0 items-center gap-2 text-xs text-neutral-400">
              <input
                type="checkbox"
                checked={slot.includedInFinal}
                onChange={(e) => onToggleInclude(slot.id, e.target.checked)}
                className="rounded"
              />
              최종 포함
            </label>
          </div>

          {slot.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={slot.imageUrl}
              alt={slot.sectionTitle}
              className="mb-3 max-h-40 rounded border border-neutral-800 object-cover"
            />
          )}

          <details className="mb-3">
            <summary className="cursor-pointer text-xs text-neutral-500 hover:text-neutral-400">
              생성 스크립트 보기
            </summary>
            <pre className="mt-2 whitespace-pre-wrap rounded bg-neutral-950 p-3 text-xs text-neutral-400">
              {slot.promptScript}
            </pre>
          </details>

          <button
            onClick={() => onGenerate(slot.id)}
            disabled={generatingId === slot.id}
            className="rounded border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:border-neutral-500 disabled:opacity-50"
          >
            {generatingId === slot.id
              ? "생성 중..."
              : slot.generated
                ? "이미지 재생성"
                : "AI 이미지 생성"}
          </button>
        </div>
      ))}
    </div>
  );
}
