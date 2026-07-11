import { NextResponse } from "next/server";
import { getDraftById, updateDraftImageSlot } from "@/lib/db";
import { generateCopyrightFreeImage } from "@/services/image-gen";
import { refinePromptScript } from "@/services/gemini";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { slotId, promptScript, confirmScript, includeInFinal } = body;

  const draft = getDraftById(id);
  if (!draft) {
    return NextResponse.json({ error: "초안을 찾을 수 없습니다." }, { status: 404 });
  }

  const slot = draft.imageSlots.find((s) => s.id === slotId);
  if (!slot) {
    return NextResponse.json({ error: "이미지 슬롯을 찾을 수 없습니다." }, { status: 404 });
  }

  if (includeInFinal !== undefined) {
    updateDraftImageSlot(id, slotId, { includedInFinal: includeInFinal });
    return NextResponse.json({ draft: getDraftById(id) });
  }

  const script = promptScript || slot.promptScript;

  if (!confirmScript) {
    let refined = script;
    try {
      refined = await refinePromptScript(draft.keyword, script, slot.sectionTitle);
    } catch {
      // use original
    }
    return NextResponse.json({
      requiresConfirmation: true,
      promptScript: refined,
      slot,
      message: "이미지 생성 스크립트를 확인한 후 confirmScript: true로 다시 요청하세요.",
    });
  }

  try {
    const { imageUrl, method } = await generateCopyrightFreeImage(script, draft.keyword);
    updateDraftImageSlot(id, slotId, {
      imageUrl,
      generated: true,
      promptScript: script,
      includedInFinal: includeInFinal ?? slot.includedInFinal,
    });

    return NextResponse.json({
      draft: getDraftById(id),
      imageUrl,
      method,
      message: method === "gemini" ? "Gemini로 이미지가 생성되었습니다." : "플레이스홀더 이미지가 생성되었습니다. GEMINI_API_KEY로 실제 생성 가능.",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "이미지 생성 실패" },
      { status: 500 }
    );
  }
}
