import { getDraftsWithinDays } from "@/lib/db";
import { DraftCard } from "@/components/DraftCard";
import { FetchButton } from "@/components/FetchButton";

export const dynamic = "force-dynamic";

const DASHBOARD_DAYS = 3;

export default function HomePage() {
  const pending = getDraftsWithinDays(DASHBOARD_DAYS, "pending");

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-4xl font-semibold text-white">대시보드</h1>
        <p className="mt-2 text-sm text-neutral-400">
          최근 {DASHBOARD_DAYS}일간 검토 대기 초안을 확인합니다. 전체 글은 게시글 메뉴에서
          관리하세요.
        </p>
      </div>

      <FetchButton />

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-neutral-400">
          검토 대기 — 최근 {DASHBOARD_DAYS}일 ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-neutral-500">
            최근 {DASHBOARD_DAYS}일간 대기 중인 초안이 없습니다.
          </p>
        ) : (
          <div className="space-y-3">
            {pending.map((draft) => (
              <DraftCard key={draft.id} draft={draft} showTargetUrl />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
