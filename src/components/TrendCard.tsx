import type { TrendSnapshot } from "@/types";
import Link from "next/link";

interface TrendCardProps {
  trend: TrendSnapshot;
}

export function TrendCard({ trend }: TrendCardProps) {
  const href = trend.draftId ? `/drafts/${trend.draftId}` : "#";

  const inner = (
    <>
      <div className="mb-1 flex items-start justify-between gap-3">
        <h3 className="text-lg font-medium text-white">{trend.keyword}</h3>
        {trend.searchVolume && (
          <span className="shrink-0 text-xs text-neutral-500">{trend.searchVolume}</span>
        )}
      </div>
      <p className="mb-2 text-sm leading-relaxed text-neutral-300">{trend.trendReason}</p>
      {trend.relatedQueries && trend.relatedQueries.length > 0 && (
        <p className="text-xs text-neutral-500">
          연관 검색: {trend.relatedQueries.slice(0, 3).join(", ")}
        </p>
      )}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-neutral-600">
          {new Date(trend.fetchedAt).toLocaleString("ko-KR")}
        </span>
        {trend.draftId ? (
          <span className="text-xs text-neutral-400">초안 편집 →</span>
        ) : (
          <span className="text-xs text-neutral-600">초안 없음</span>
        )}
      </div>
    </>
  );

  if (!trend.draftId) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-[#141414] p-5 opacity-70">
        {inner}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="block rounded-lg border border-neutral-800 bg-[#141414] p-5 transition-colors hover:border-neutral-600"
    >
      {inner}
    </Link>
  );
}
