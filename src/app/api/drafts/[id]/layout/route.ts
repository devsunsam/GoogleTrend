import { NextResponse } from "next/server";
import { getDraftById, updateDraft } from "@/lib/db";
import { analyzeContentLayout, mergeLayout } from "@/lib/content-layout";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const draft = getDraftById(id);
  if (!draft) {
    return NextResponse.json({ error: "초안을 찾을 수 없습니다." }, { status: 404 });
  }

  const fresh = analyzeContentLayout(draft.body, draft.keyword);
  const merged = mergeLayout(
    { imageSlots: draft.imageSlots, adSlots: draft.adSlots },
    fresh
  );

  updateDraft(id, {
    imageSlots: merged.imageSlots,
    adSlots: merged.adSlots,
  });

  return NextResponse.json({ draft: getDraftById(id), layout: merged });
}
