"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { BlogDraft, DraftStatus } from "@/types";

const STATUS_OPTIONS: Array<{ value: DraftStatus | "all"; label: string }> = [
  { value: "all", label: "전체" },
  { value: "pending", label: "검토 대기" },
  { value: "published", label: "발행됨" },
  { value: "approved", label: "승인됨" },
  { value: "rejected", label: "거절" },
];

const STATUS_LABEL: Record<DraftStatus, string> = {
  pending: "검토 대기",
  approved: "승인됨",
  published: "발행됨",
  rejected: "거절",
};

export function PostsList() {
  const [drafts, setDrafts] = useState<BlogDraft[]>([]);
  const [status, setStatus] = useState<DraftStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [migrateUrl, setMigrateUrl] = useState("");
  const [showMigrate, setShowMigrate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (search.trim()) params.set("search", search.trim());
    const res = await fetch(`/api/drafts?${params}`);
    const data = await res.json();
    setDrafts(data.drafts ?? []);
    setSelected(new Set());
    setLoading(false);
  }, [status, search]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === drafts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(drafts.map((d) => d.id)));
    }
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`선택한 ${selected.size}개 글을 삭제하시겠습니까?`)) return;
    const res = await fetch("/api/drafts/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", ids: [...selected] }),
    });
    const data = await res.json();
    setMessage(data.message ?? data.error);
    load();
  };

  const bulkMigrate = async (publish: boolean) => {
    if (selected.size === 0) return;
    if (!migrateUrl.trim()) {
      setMessage("이관할 홈페이지 URL을 입력하세요.");
      return;
    }
    const label = publish ? "이관 및 발행" : "URL 이관";
    if (!confirm(`선택 ${selected.size}개 글을 ${migrateUrl}로 ${label}하시겠습니까?`)) return;

    const res = await fetch("/api/drafts/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "migrate",
        ids: [...selected],
        targetUrl: migrateUrl.trim(),
        publish,
      }),
    });
    const data = await res.json();
    setMessage(data.message ?? data.error);
    setShowMigrate(false);
    load();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-4xl font-semibold text-white">게시글</h1>
        <p className="mt-2 text-sm text-neutral-400">
          전체 글을 필터링하고, 다중 선택으로 bulk 삭제·홈페이지 이관할 수 있습니다.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as DraftStatus | "all")}
          className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="제목·키워드 검색"
          className="flex-1 min-w-[200px] rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm text-white outline-none focus:border-neutral-600"
        />
        <button
          onClick={load}
          className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:border-neutral-500"
        >
          검색
        </button>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-800 bg-[#141414] px-4 py-3">
          <span className="text-sm text-neutral-400">{selected.size}개 선택</span>
          <button
            onClick={bulkDelete}
            className="rounded-lg px-3 py-1.5 text-sm text-red-500 hover:text-red-400"
          >
            선택 삭제
          </button>
          <button
            onClick={() => setShowMigrate(true)}
            className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-black hover:bg-neutral-200"
          >
            홈페이지 이관
          </button>
        </div>
      )}

      {message && <p className="text-sm text-neutral-400">{message}</p>}

      {loading ? (
        <p className="text-sm text-neutral-500">불러오는 중...</p>
      ) : drafts.length === 0 ? (
        <p className="text-sm text-neutral-500">글이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-800 bg-neutral-900/50 text-xs text-neutral-500">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.size === drafts.length && drafts.length > 0}
                    onChange={toggleAll}
                  />
                </th>
                <th className="px-4 py-3">제목</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3">업로드 대상</th>
                <th className="px-4 py-3">작성일</th>
              </tr>
            </thead>
            <tbody>
              {drafts.map((draft) => (
                <tr
                  key={draft.id}
                  className="border-b border-neutral-800/50 hover:bg-neutral-900/30"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(draft.id)}
                      onChange={() => toggle(draft.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/drafts/${draft.id}`}
                      className="text-neutral-200 hover:text-white"
                    >
                      {draft.title}
                    </Link>
                    <p className="text-xs text-neutral-600">{draft.keyword}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-400">
                    {STATUS_LABEL[draft.status]}
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-xs text-neutral-500">
                    {draft.targetUrl || "(미설정)"}
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-500">
                    {new Date(draft.createdAt).toLocaleDateString("ko-KR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showMigrate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6">
          <div className="w-full max-w-md rounded-lg border border-neutral-800 bg-[#141414] p-6">
            <h3 className="mb-4 text-base font-medium text-white">홈페이지 이관</h3>
            <p className="mb-3 text-xs text-neutral-500">
              선택한 {selected.size}개 글의 업로드 대상 URL을 변경합니다.
            </p>
            <input
              value={migrateUrl}
              onChange={(e) => setMigrateUrl(e.target.value)}
              placeholder="https://your-blog.com"
              className="mb-4 w-full rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white outline-none"
            />
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => bulkMigrate(false)}
                className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200"
              >
                URL만 이관
              </button>
              <button
                onClick={() => bulkMigrate(true)}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-500"
              >
                이관 + 미발행 글 발행
              </button>
              <button
                onClick={() => setShowMigrate(false)}
                className="rounded-lg px-4 py-2 text-sm text-neutral-500"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
