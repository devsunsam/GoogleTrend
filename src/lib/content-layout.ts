import { v4 as uuidv4 } from "uuid";
import type { AdSlot, ImageSlot, LayoutAnalysis } from "@/types";

const DEFAULT_AD_SLOTS: AdSlot[] = [
  {
    id: "ad-top",
    type: "adsense",
    position: "after_summary",
    label: "상단 광고",
    description: "요약 직후 — 독자가 글에 관심을 보인 직후, 가장 높은 CTR 구간",
  },
  {
    id: "ad-mid",
    type: "adsense",
    position: "mid_content",
    label: "본문 중간 광고",
    description: "본문 50% 지점 — 스크롤 깊이가 충분한 독자 대상",
  },
  {
    id: "ad-bottom",
    type: "adsense",
    position: "before_conclusion",
    label: "하단 광고",
    description: "마무리 섹션 직전 — 글을 끝까지 읽은 독자 대상",
  },
];

export function analyzeContentLayout(body: string, keyword: string): LayoutAnalysis {
  const sections = parseSections(body);
  const imageSlots: ImageSlot[] = [];

  if (sections.length > 0) {
    imageSlots.push({
      id: uuidv4(),
      position: "hero",
      sectionTitle: "대표 이미지",
      description: "글 상단 — 제목 아래, 요약 위. 트렌드 키워드를 시각적으로 전달하는 대표 이미지",
      promptScript: buildImagePrompt(keyword, "hero", "트렌드 키워드를 상징하는 깔끔한 에디토리얼 스타일 대표 이미지"),
      includedInFinal: true,
      generated: false,
    });
  }

  sections.forEach((section, i) => {
    if (i === 0) return;
    imageSlots.push({
      id: uuidv4(),
      position: `after_section_${i}`,
      sectionTitle: section.title,
      description: `"${section.title}" 섹션 아래 — ${section.title} 내용을 보조하는 관련 이미지`,
      promptScript: buildImagePrompt(
        keyword,
        section.title,
        `${section.title} 주제를 설명하는 자연스러운 사진 스타일 이미지`
      ),
      includedInFinal: i <= 2,
      generated: false,
    });
  });

  return {
    imageSlots: imageSlots.slice(0, 4),
    adSlots: DEFAULT_AD_SLOTS.map((a) => ({ ...a, id: uuidv4() })),
  };
}

function parseSections(body: string): Array<{ title: string; content: string }> {
  const lines = body.split("\n");
  const sections: Array<{ title: string; content: string }> = [];
  let current: { title: string; content: string } | null = null;

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+)/);
    if (h2) {
      if (current) sections.push(current);
      current = { title: h2[1].trim(), content: "" };
    } else if (current) {
      current.content += line + "\n";
    }
  }
  if (current) sections.push(current);
  return sections;
}

function buildImagePrompt(keyword: string, context: string, style: string): string {
  return [
    `[저작권 프리 AI 이미지 생성 스크립트]`,
    `주제: ${keyword}`,
    `맥락: ${context}`,
    `스타일: ${style}`,
    `요구사항:`,
    `- 실제 인물의 초상권/상표가 보이지 않도록 일반적이고 중립적인 묘사`,
    `- 블로그 에디토리얼 톤, 과도한 텍스트/워터마크 없음`,
    `- 16:9 가로 비율, 밝고 깔끔한 구도`,
    `- 클릭베이트 느낌 없이 정보 전달에 적합한 이미지`,
  ].join("\n");
}

export function mergeLayout(existing: LayoutAnalysis, fresh: LayoutAnalysis): LayoutAnalysis {
  const existingPrompts = new Map(existing.imageSlots.map((s) => [s.position, s]));
  const imageSlots = fresh.imageSlots.map((slot) => {
    const prev = existingPrompts.get(slot.position);
    if (prev?.generated && prev.imageUrl) {
      return { ...slot, ...prev, description: slot.description };
    }
    return slot;
  });
  return { imageSlots, adSlots: fresh.adSlots.length ? fresh.adSlots : existing.adSlots };
}
