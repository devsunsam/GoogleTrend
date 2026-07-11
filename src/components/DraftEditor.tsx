"use client";

import { useState } from "react";
import type { BlogDraft, ImageSlot } from "@/types";
import {
  getSpamLevelFromScore,
  getSpamLevelLabel,
  getSpamLevelColor,
  evaluateSpamRisk,
} from "@/lib/spam-guard";
import { useRouter } from "next/navigation";
import { ImageSlotPanel } from "@/components/ImageSlotPanel";
import { AdGuidePanel } from "@/components/AdGuidePanel";
import { DraftPreview } from "@/components/DraftPreview";
import { RewritePreviewModal } from "@/components/RewritePreviewModal";
import { PROVIDER_LABELS } from "@/lib/ai-providers";
import type { AiProvider, GenerateResult } from "@/types";

interface DraftEditorProps {
  draft: BlogDraft;
  defaultTargetUrl: string;
}

export function DraftEditor({ draft: initial, defaultTargetUrl }: DraftEditorProps) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [title, setTitle] = useState(initial.title);
  const [summary, setSummary] = useState(initial.summary);
  const [body, setBody] = useState(initial.body);
  const [imageSlots, setImageSlots] = useState<ImageSlot[]>(initial.imageSlots ?? []);
  const [adSlots] = useState(initial.adSlots ?? []);
  const [targetUrl, setTargetUrl] = useState(initial.targetUrl || defaultTargetUrl);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [aiProvider, setAiProvider] = useState<AiProvider>("gemini");
  const [rewritePreview, setRewritePreview] = useState<{
    generated: GenerateResult;
    provider: AiProvider;
  } | null>(null);
  const [applyingRewrite, setApplyingRewrite] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [message, setMessage] = useState("");
  const [scriptModal, setScriptModal] = useState<{
    slotId: string;
    script: string;
    sectionTitle: string;
  } | null>(null);

  const liveSpam = evaluateSpamRisk(title, body);
  const spamLevel = getSpamLevelFromScore(liveSpam.score);
  const isPublished = draft.status === "published";

  const buildPayload = () => ({
    title,
    summary,
    body,
    imageSlots,
    adSlots,
    targetUrl,
  });

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/drafts/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDraft(data.draft);
      setImageSlots(data.draft.imageSlots ?? []);
      setMessage("저장되었습니다.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const analyzeLayout = async () => {
    setAnalyzing(true);
    setMessage("");
    try {
      await save();
      const res = await fetch(`/api/drafts/${draft.id}/layout`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setImageSlots(data.draft.imageSlots ?? []);
      setDraft(data.draft);
      setMessage("이미지·광고 배치를 분석했습니다.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "분석 실패");
    } finally {
      setAnalyzing(false);
    }
  };

  const requestImageGeneration = async (slotId: string) => {
    setGeneratingId(slotId);
    setMessage("");
    try {
      const res = await fetch(`/api/drafts/${draft.id}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.requiresConfirmation) {
        setScriptModal({
          slotId,
          script: data.promptScript,
          sectionTitle: data.slot.sectionTitle,
        });
        return;
      }

      setImageSlots(data.draft.imageSlots ?? []);
      setDraft(data.draft);
      setMessage(data.message);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "이미지 생성 실패");
    } finally {
      setGeneratingId(null);
    }
  };

  const confirmImageGeneration = async (includeInFinal: boolean) => {
    if (!scriptModal) return;
    setGeneratingId(scriptModal.slotId);
    try {
      const res = await fetch(`/api/drafts/${draft.id}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: scriptModal.slotId,
          promptScript: scriptModal.script,
          confirmScript: true,
          includeInFinal,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setImageSlots(data.draft.imageSlots ?? []);
      setDraft(data.draft);
      setMessage(data.message);
      setScriptModal(null);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "이미지 생성 실패");
    } finally {
      setGeneratingId(null);
    }
  };

  const toggleInclude = async (slotId: string, included: boolean) => {
    const updated = imageSlots.map((s) =>
      s.id === slotId ? { ...s, includedInFinal: included } : s
    );
    setImageSlots(updated);
    await fetch(`/api/drafts/${draft.id}/images`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotId, includeInFinal: included }),
    });
  };

  const approve = async () => {
    const url = targetUrl.trim();
    const confirmMsg = url
      ? `다음 주소에 발행합니다:\n${url}\n\n계속하시겠습니까?`
      : "블로그 URL 없이 시뮬레이션 발행합니다.\n\n계속하시겠습니까?";
    if (!confirm(confirmMsg)) return;

    setPublishing(true);
    setMessage("");
    try {
      await save();
      const res = await fetch(`/api/drafts/${draft.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUrl: url, confirmTarget: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDraft(data.draft);
      setMessage(`${data.publish?.message ?? "발행 완료"} → ${data.targetUrl || url || "시뮬레이션"}`);
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "발행 실패");
    } finally {
      setPublishing(false);
    }
  };

  const requestRewrite = async () => {
    setRegenerating(true);
    setMessage("");
    try {
      const res = await fetch(`/api/drafts/${draft.id}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: aiProvider, apply: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRewritePreview({ generated: data.generated, provider: data.provider ?? aiProvider });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "재작성 실패");
    } finally {
      setRegenerating(false);
    }
  };

  const applyRewrite = async () => {
    if (!rewritePreview) return;
    setApplyingRewrite(true);
    const { generated } = rewritePreview;
    try {
      const res = await fetch(`/api/drafts/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: generated.title,
          summary: generated.summary,
          body: generated.body,
          trendReason: generated.trendReason,
          imageSlots: generated.imageSlots,
          adSlots: generated.adSlots,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTitle(data.draft.title);
      setSummary(data.draft.summary);
      setBody(data.draft.body);
      setImageSlots(data.draft.imageSlots ?? []);
      setDraft(data.draft);
      setRewritePreview(null);
      setMessage(`${PROVIDER_LABELS[rewritePreview.provider]} 제안을 적용했습니다.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "적용 실패");
    } finally {
      setApplyingRewrite(false);
    }
  };

  const deleteDraft = async () => {
    if (!confirm("이 글을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
    const res = await fetch(`/api/drafts/${draft.id}`, { method: "DELETE" });
    if (res.ok) router.push("/");
    else {
      const data = await res.json();
      setMessage(data.error ?? "삭제 실패");
    }
  };

  const reject = async () => {
    await fetch(`/api/drafts/${draft.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected" }),
    });
    router.push("/");
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 트렌드 배경 */}
      <div className="rounded-lg border border-neutral-800 bg-[#141414] p-4">
        <p className="text-xs text-neutral-500">트렌드 키워드</p>
        <p className="text-lg font-medium text-white">{draft.keyword}</p>
        <p className="mt-2 text-sm text-neutral-300">{draft.trendReason || draft.trendContext}</p>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="text-sm text-neutral-500">
          {isPublished && draft.publishedAt && (
            <span className="text-green-500">
              {new Date(draft.publishedAt).toLocaleString("ko-KR")} 발행
              {draft.publishedUrl && ` · ${draft.publishedUrl}`}
            </span>
          )}
        </div>
        <div className="text-right text-sm">
          <span className={getSpamLevelColor(spamLevel)}>
            스팸 위험: {getSpamLevelLabel(spamLevel)} ({liveSpam.score})
          </span>
        </div>
      </div>

      {/* 업로드 대상 확인 */}
      <section className="rounded-lg border border-neutral-800 bg-[#141414] p-4 space-y-3">
        <h3 className="text-sm font-medium text-neutral-400">업로드 대상 홈페이지</h3>
        <input
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
          placeholder="https://your-blog.com"
          className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white outline-none focus:border-neutral-600"
        />
        <p className="text-xs text-neutral-500">
          발행 시 이 주소가 맞는지 확인합니다. 설정 페이지의 기본 URL과 다를 수 있습니다.
        </p>
      </section>

      {/* 본문 편집 */}
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-neutral-400">제목</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-neutral-600"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-neutral-400">요약</span>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm leading-relaxed text-neutral-300 outline-none focus:border-neutral-600"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-neutral-400">본문</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={16}
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm leading-relaxed text-neutral-300 outline-none focus:border-neutral-600"
          />
        </label>
      </div>

      {/* 이미지 배치 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-neutral-400">이미지 배치 추천</h3>
          <button
            onClick={analyzeLayout}
            disabled={analyzing}
            className="text-xs text-neutral-500 hover:text-neutral-300 disabled:opacity-50"
          >
            {analyzing ? "분석 중..." : "레이아웃 분석"}
          </button>
        </div>
        <ImageSlotPanel
          slots={imageSlots}
          onToggleInclude={toggleInclude}
          onGenerate={requestImageGeneration}
          generatingId={generatingId}
        />
      </section>

      {/* 광고 가이드 */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-neutral-400">광고 배치 가이드 (AdSense)</h3>
        <AdGuidePanel slots={adSlots} />
      </section>

      {message && <p className="text-sm text-neutral-400">{message}</p>}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
        <button
          onClick={() => setShowPreview(true)}
          className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:border-neutral-500"
        >
          미리보기
        </button>
        <div className="flex items-center gap-2">
          <select
            value={aiProvider}
            onChange={(e) => setAiProvider(e.target.value as AiProvider)}
            className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white"
          >
            {(Object.keys(PROVIDER_LABELS) as AiProvider[]).map((p) => (
              <option key={p} value={p}>
                {PROVIDER_LABELS[p]}
              </option>
            ))}
          </select>
          <button
            onClick={requestRewrite}
            disabled={regenerating}
            className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:border-neutral-500 disabled:opacity-50"
          >
            {regenerating ? "생성 중..." : "자연스럽게 재작성"}
          </button>
        </div>
        <button
          onClick={approve}
          disabled={publishing}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50"
        >
          {publishing ? "발행 중..." : isPublished ? "수정 후 재발행" : "승인 및 발행"}
        </button>
        {!isPublished && (
          <button onClick={reject} className="rounded-lg px-4 py-2 text-sm text-neutral-500 hover:text-neutral-300">
            거절
          </button>
        )}
        <button
          onClick={deleteDraft}
          className="rounded-lg px-4 py-2 text-sm text-red-500 hover:text-red-400"
        >
          삭제
        </button>
      </div>

      {showPreview && (
        <DraftPreview
          draft={{ ...draft, title, summary, body, imageSlots, adSlots }}
          targetUrl={targetUrl}
          onClose={() => setShowPreview(false)}
        />
      )}

      {rewritePreview && (
        <RewritePreviewModal
          generated={rewritePreview.generated}
          provider={rewritePreview.provider}
          onApply={applyRewrite}
          onCancel={() => setRewritePreview(null)}
          applying={applyingRewrite}
        />
      )}

      {scriptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6">
          <div className="w-full max-w-lg rounded-lg border border-neutral-800 bg-[#141414] p-6">
            <h3 className="mb-2 text-base font-medium text-white">
              이미지 생성 스크립트 확인 — {scriptModal.sectionTitle}
            </h3>
            <p className="mb-3 text-xs text-neutral-500">
              저작권 문제 없도록 AI가 생성할 이미지 설명입니다. 확인 후 생성하세요.
            </p>
            <textarea
              value={scriptModal.script}
              onChange={(e) => setScriptModal({ ...scriptModal, script: e.target.value })}
              rows={10}
              className="mb-4 w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-300"
            />
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => confirmImageGeneration(true)}
                disabled={!!generatingId}
                className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50"
              >
                생성 + 최종 포함
              </button>
              <button
                onClick={() => confirmImageGeneration(false)}
                disabled={!!generatingId}
                className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 disabled:opacity-50"
              >
                생성만 (미포함)
              </button>
              <button
                onClick={() => setScriptModal(null)}
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
