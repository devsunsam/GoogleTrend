import type { AdSlot, BlogDraft, ImageSlot } from "@/types";

export interface PreviewBlock {
  type: "heading" | "paragraph" | "image" | "ad" | "list";
  content: string;
  meta?: ImageSlot | AdSlot;
}

export function buildPreviewBlocks(draft: BlogDraft): PreviewBlock[] {
  const blocks: PreviewBlock[] = [];
  const includedImages = draft.imageSlots.filter((s) => s.includedInFinal);
  const heroImage = includedImages.find((s) => s.position === "hero");

  if (heroImage?.imageUrl) {
    blocks.push({ type: "image", content: heroImage.sectionTitle, meta: heroImage });
  }

  const lines = draft.body.split("\n");
  let sectionIndex = 0;
  let charCount = 0;
  const totalChars = draft.body.length;
  const midAd = draft.adSlots.find((a) => a.position === "mid_content");
  const topAd = draft.adSlots.find((a) => a.position === "after_summary");
  const bottomAd = draft.adSlots.find((a) => a.position === "before_conclusion");
  let summaryDone = false;
  let midAdInserted = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("## ")) {
      const title = line.replace(/^##\s+/, "");
      blocks.push({ type: "heading", content: title });

      if (title === "요약") summaryDone = false;
      else {
        sectionIndex++;
        const sectionImage = includedImages.find(
          (s) => s.position === `after_section_${sectionIndex}`
        );
        if (sectionImage?.imageUrl) {
          blocks.push({ type: "image", content: sectionImage.sectionTitle, meta: sectionImage });
        }
        if (bottomAd && title.includes("마무리")) {
          blocks.push({ type: "ad", content: bottomAd.label, meta: bottomAd });
        }
      }
      continue;
    }

    if (line.startsWith("- ")) {
      blocks.push({ type: "list", content: line.replace(/^-\s+/, "") });
    } else if (line.trim()) {
      blocks.push({ type: "paragraph", content: line.trim() });
      charCount += line.length;

      if (!summaryDone && titleIsSummary(lines, i)) {
        summaryDone = true;
        if (topAd) blocks.push({ type: "ad", content: topAd.label, meta: topAd });
      }

      if (!midAdInserted && midAd && charCount > totalChars * 0.45) {
        blocks.push({ type: "ad", content: midAd.label, meta: midAd });
        midAdInserted = true;
      }
    }
  }

  if (!midAdInserted && midAd) {
    blocks.push({ type: "ad", content: midAd.label, meta: midAd });
  }

  return blocks;
}

function titleIsSummary(lines: string[], index: number): boolean {
  for (let i = index; i >= 0; i--) {
    if (lines[i].startsWith("## ")) {
      return lines[i].includes("요약");
    }
  }
  return false;
}

export function renderPreviewHtml(draft: BlogDraft): string {
  const blocks = buildPreviewBlocks(draft);
  return blocks
    .map((b) => {
      switch (b.type) {
        case "heading":
          return `<h2 style="font-size:1.25rem;font-weight:600;margin:1.5rem 0 0.75rem;color:#fff">${escapeHtml(b.content)}</h2>`;
        case "paragraph":
          return `<p style="margin:0.5rem 0;line-height:1.7;color:#d4d4d4">${escapeHtml(b.content)}</p>`;
        case "list":
          return `<li style="margin:0.25rem 0;color:#d4d4d4">${escapeHtml(b.content)}</li>`;
        case "image":
          return `<figure style="margin:1.25rem 0"><img src="${(b.meta as ImageSlot).imageUrl}" alt="${escapeHtml(b.content)}" style="width:100%;border-radius:8px;border:1px solid #333"/><figcaption style="font-size:0.75rem;color:#737373;margin-top:0.5rem">${escapeHtml(b.content)}</figcaption></figure>`;
        case "ad":
          return `<div style="margin:1.25rem 0;padding:1rem;border:2px dashed #404040;border-radius:8px;background:#1a1a1a;text-align:center"><span style="font-size:0.75rem;color:#737373">📢 ${escapeHtml(b.content)}</span><p style="font-size:0.7rem;color:#525252;margin-top:0.25rem">${escapeHtml((b.meta as AdSlot).description)}</p></div>`;
        default:
          return "";
      }
    })
    .join("\n");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
