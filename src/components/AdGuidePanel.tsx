"use client";

import type { AdSlot } from "@/types";

export function AdGuidePanel({ slots }: { slots: AdSlot[] }) {
  if (slots.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-xs text-neutral-500">
        AdSense 등 광고 삽입 권장 위치입니다. 미리보기에서 점선 박스로 표시됩니다.
      </p>
      {slots.map((slot) => (
        <div
          key={slot.id}
          className="rounded-lg border border-dashed border-neutral-700 bg-neutral-900/30 px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-neutral-300">{slot.label}</span>
            <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] uppercase text-neutral-500">
              {slot.type}
            </span>
          </div>
          <p className="mt-1 text-xs text-neutral-500">{slot.description}</p>
          <p className="mt-1 text-[10px] text-neutral-600">위치: {slot.position}</p>
        </div>
      ))}
    </div>
  );
}
