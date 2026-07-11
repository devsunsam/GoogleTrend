import { NextResponse } from "next/server";
import {
  bulkUpdateTargetUrl,
  deleteDrafts,
  getDraftById,
  getSettings,
} from "@/lib/db";
import { publishToBlog } from "@/services/blog-publisher";

export async function POST(request: Request) {
  const body = await request.json();
  const { action, ids, targetUrl, publish } = body as {
    action: "delete" | "migrate";
    ids: string[];
    targetUrl?: string;
    publish?: boolean;
  };

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "선택된 글이 없습니다." }, { status: 400 });
  }

  if (action === "delete") {
    const deleted = deleteDrafts(ids);
    return NextResponse.json({ ok: true, deleted, message: `${deleted}개 삭제됨` });
  }

  if (action === "migrate") {
    if (!targetUrl?.trim()) {
      return NextResponse.json({ error: "이관할 홈페이지 URL을 입력하세요." }, { status: 400 });
    }

    const url = targetUrl.trim();
    const updated = bulkUpdateTargetUrl(ids, url);
    const settings = getSettings();
    const publishSettings = { ...settings, blogUrl: url };
    let published = 0;
    const errors: string[] = [];

    if (publish) {
      for (const id of ids) {
        const draft = getDraftById(id);
        if (!draft) continue;
        if (draft.status === "published") continue;
        try {
          const result = await publishToBlog({ ...draft, targetUrl: url }, publishSettings);
          if (result.success) {
            const { markDraftPublished } = await import("@/lib/db");
            markDraftPublished(id, result.externalUrl);
            published++;
          } else {
            errors.push(`${draft.title}: ${result.message}`);
          }
        } catch (e) {
          errors.push(`${draft.title}: ${e instanceof Error ? e.message : "실패"}`);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      updated,
      published,
      targetUrl: url,
      errors,
      message: publish
        ? `${updated}개 URL 변경, ${published}개 발행`
        : `${updated}개 홈페이지 URL 이관됨`,
    });
  }

  return NextResponse.json({ error: "알 수 없는 action" }, { status: 400 });
}
