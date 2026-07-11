import { NextResponse } from "next/server";
import { getDraftById } from "@/lib/db";
import { renderPreviewHtml, buildPreviewBlocks } from "@/lib/preview";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const draft = getDraftById(id);
  if (!draft) {
    return NextResponse.json({ error: "초안을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({
    draft,
    blocks: buildPreviewBlocks(draft),
    html: renderPreviewHtml(draft),
    targetUrl: draft.targetUrl,
  });
}
