import type { BlogDraft } from "@/types";
import {
  getSpamLevelFromScore,
  getSpamLevelLabel,
  getSpamLevelColor,
} from "@/lib/spam-guard";
import Link from "next/link";

const STATUS_LABEL: Record<BlogDraft["status"], string> = {
  pending: "검토 대기",
  approved: "승인됨",
  published: "발행됨",
  rejected: "거절",
};

const STATUS_COLOR: Record<BlogDraft["status"], string> = {
  pending: "text-yellow-500",
  approved: "text-blue-400",
  published: "text-green-500",
  rejected: "text-red-500",
};

interface DraftCardProps {
  draft: BlogDraft;
  showTargetUrl?: boolean;
}

export function DraftCard({ draft, showTargetUrl = false }: DraftCardProps) {
  const spamLevel = getSpamLevelFromScore(draft.spamScore);

  return (
    <Link
      href={`/drafts/${draft.id}`}
      className="block rounded-lg border border-neutral-800 bg-[#141414] p-5 transition-colors hover:border-neutral-700"
    >
      <div className="mb-2 flex items-start justify-between gap-4">
        <h3 className="text-base font-medium text-white">{draft.title}</h3>
        <span className={`shrink-0 text-xs ${STATUS_COLOR[draft.status]}`}>
          {STATUS_LABEL[draft.status]}
        </span>
      </div>
      {draft.trendReason && (
        <p className="mb-2 text-xs text-neutral-500">
          <span className="text-neutral-400">{draft.keyword}</span> — {draft.trendReason}
        </p>
      )}
      <p className="mb-3 text-sm text-neutral-400 line-clamp-2">{draft.summary}</p>
      {showTargetUrl && (
        <p className="mb-2 text-xs text-neutral-500">
          업로드 대상:{" "}
          <span className="text-neutral-400">
            {draft.targetUrl || "(미설정)"}
          </span>
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500">
        <span className={getSpamLevelColor(spamLevel)}>
          스팸 {getSpamLevelLabel(spamLevel)}
        </span>
        {draft.imageSlots?.filter((s) => s.generated).length > 0 && (
          <span>이미지 {draft.imageSlots.filter((s) => s.generated).length}장</span>
        )}
        <span>{new Date(draft.createdAt).toLocaleString("ko-KR")}</span>
      </div>
    </Link>
  );
}
