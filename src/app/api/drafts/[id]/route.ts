import { NextResponse } from "next/server";
import { getDraftById, updateDraft, updateDraftSpam, deleteDraft } from "@/lib/db";
import { evaluateSpamRisk } from "@/lib/spam-guard";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const draft = getDraftById(id);
  if (!draft) {
    return NextResponse.json({ error: "초안을 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json({ draft });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const {
    title,
    summary,
    body: draftBody,
    status,
    imageSlots,
    adSlots,
    targetUrl,
    trendReason,
  } = body;

  const draft = updateDraft(id, {
    title,
    summary,
    body: draftBody,
    status,
    imageSlots,
    adSlots,
    targetUrl,
    trendReason,
  });
  if (!draft) {
    return NextResponse.json({ error: "초안을 찾을 수 없습니다." }, { status: 404 });
  }

  if (title !== undefined || draftBody !== undefined) {
    const spam = evaluateSpamRisk(draft.title, draft.body);
    updateDraftSpam(id, spam.score, spam.notes);
  }

  const final = getDraftById(id);
  return NextResponse.json({ draft: final });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const draft = getDraftById(id);
  if (!draft) {
    return NextResponse.json({ error: "글을 찾을 수 없습니다." }, { status: 404 });
  }

  const ok = deleteDraft(id);
  if (!ok) {
    return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, message: "삭제되었습니다." });
}
