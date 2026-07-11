import { NextResponse } from "next/server";
import { getDraftById, updateDraft, updateDraftSpam } from "@/lib/db";
import { generateWithProvider } from "@/services/ai-writer";
import type { AiProvider } from "@/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const draft = getDraftById(id);

  if (!draft) {
    return NextResponse.json({ error: "초안을 찾을 수 없습니다." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const feedback = body.feedback as string | undefined;
  const provider = (body.provider as AiProvider) || "gemini";
  const apply = body.apply === true;

  const trend = {
    keyword: draft.keyword,
    newsContext: draft.trendContext,
    relatedQueries: draft.trendReason ? [draft.trendReason] : [],
  };

  try {
    const generated = await generateWithProvider(trend, provider, feedback);

    if (!apply) {
      return NextResponse.json({ generated, provider, preview: true });
    }

    updateDraft(id, {
      title: generated.title,
      summary: generated.summary,
      body: generated.body,
      trendReason: generated.trendReason,
      imageSlots: generated.imageSlots,
      adSlots: generated.adSlots,
    });
    updateDraftSpam(id, generated.spamScore, generated.spamNotes);

    return NextResponse.json({ draft: getDraftById(id), generated, provider });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "재생성 실패" },
      { status: 500 }
    );
  }
}
