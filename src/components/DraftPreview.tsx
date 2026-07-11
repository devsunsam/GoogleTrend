"use client";

import type { BlogDraft } from "@/types";
import { buildPreviewBlocks } from "@/lib/preview";
import type { ImageSlot, AdSlot } from "@/types";

interface DraftPreviewProps {
  draft: BlogDraft;
  targetUrl: string;
  onClose: () => void;
}

export function DraftPreview({ draft, targetUrl, onClose }: DraftPreviewProps) {
  const blocks = buildPreviewBlocks({ ...draft, targetUrl });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-6">
      <div className="my-8 w-full max-w-2xl rounded-lg border border-neutral-800 bg-[#0f0f0f]">
        <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
          <h2 className="text-lg font-medium text-white">발행 미리보기</h2>
          <button
            onClick={onClose}
            className="text-sm text-neutral-500 hover:text-neutral-300"
          >
            닫기
          </button>
        </div>

        <div className="border-b border-neutral-800 bg-neutral-900/50 px-6 py-3">
          <p className="text-xs text-neutral-500">업로드 대상</p>
          <p className="text-sm text-white">{targetUrl || "(URL 미설정 — 시뮬레이션)"}</p>
        </div>

        <article className="px-6 py-6">
          <h1 className="mb-4 text-2xl font-semibold text-white">{draft.title}</h1>

          {blocks.map((block, i) => (
            <PreviewBlock key={i} block={block} />
          ))}
        </article>

        <div className="border-t border-neutral-800 px-6 py-4">
          <p className="text-xs text-neutral-500">
            점선 박스는 AdSense/광고 배치 가이드입니다. 실제 발행 시 광고 코드를 해당 위치에 삽입하세요.
          </p>
        </div>
      </div>
    </div>
  );
}

function PreviewBlock({
  block,
}: {
  block: ReturnType<typeof buildPreviewBlocks>[number];
}) {
  switch (block.type) {
    case "heading":
      return <h2 className="mb-2 mt-6 text-lg font-medium text-white">{block.content}</h2>;
    case "paragraph":
      return <p className="mb-3 text-sm leading-relaxed text-neutral-300">{block.content}</p>;
    case "list":
      return (
        <li className="mb-1 ml-4 list-disc text-sm text-neutral-300">{block.content}</li>
      );
    case "image": {
      const meta = block.meta as ImageSlot;
      return (
        <figure className="my-4">
          {meta.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={meta.imageUrl}
              alt={block.content}
              className="w-full rounded-lg border border-neutral-800"
            />
          ) : (
            <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-neutral-700 bg-neutral-900 text-sm text-neutral-500">
              {block.content} (이미지 미생성)
            </div>
          )}
          <figcaption className="mt-1 text-xs text-neutral-500">{block.content}</figcaption>
        </figure>
      );
    }
    case "ad": {
      const meta = block.meta as AdSlot;
      return (
        <div className="my-4 rounded-lg border-2 border-dashed border-neutral-700 bg-neutral-900/50 px-4 py-6 text-center">
          <p className="text-sm text-neutral-400">📢 {block.content}</p>
          <p className="mt-1 text-xs text-neutral-600">{meta.description}</p>
        </div>
      );
    }
    default:
      return null;
  }
}
