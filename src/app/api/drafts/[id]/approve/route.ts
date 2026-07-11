import { NextResponse } from "next/server";
import { getDraftById, updateDraft, markDraftPublished } from "@/lib/db";
import { getSettings } from "@/lib/db";
import { publishToBlog } from "@/services/blog-publisher";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const targetUrl = body.targetUrl as string | undefined;
  const confirmTarget = body.confirmTarget === true;

  const draft = getDraftById(id);
  if (!draft) {
    return NextResponse.json({ error: "초안을 찾을 수 없습니다." }, { status: 404 });
  }

  const settings = getSettings();
  const publishUrl = targetUrl || draft.targetUrl || settings.blogUrl;

  if (!confirmTarget) {
    return NextResponse.json(
      {
        error: "발행 대상 확인이 필요합니다.",
        requiresConfirmation: true,
        targetUrl: publishUrl,
      },
      { status: 400 }
    );
  }

  if (!publishUrl && settings.blogPlatform !== "none") {
    return NextResponse.json(
      { error: "업로드 대상 홈페이지 URL을 입력해 주세요." },
      { status: 400 }
    );
  }

  updateDraft(id, { status: "approved", targetUrl: publishUrl });
  const approved = getDraftById(id)!;
  const publishSettings = { ...settings, blogUrl: publishUrl };
  const result = await publishToBlog(approved, publishSettings);

  if (!result.success) {
    updateDraft(id, { status: draft.status });
    return NextResponse.json({ error: result.message }, { status: 500 });
  }

  markDraftPublished(id, result.externalUrl);
  const published = getDraftById(id);

  return NextResponse.json({
    draft: published,
    publish: result,
    targetUrl: publishUrl,
  });
}
