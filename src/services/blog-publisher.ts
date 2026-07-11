import type { AppSettings, BlogDraft } from "@/types";

export interface PublishResult {
  success: boolean;
  message: string;
  externalUrl?: string;
}

/**
 * 블로그 발행 서비스 (MVP: webhook / WordPress REST API / 로컬 시뮬레이션)
 * blogUrl은 설정 페이지에서 추후 입력
 */
export async function publishToBlog(
  draft: BlogDraft,
  settings: AppSettings
): Promise<PublishResult> {
  if (!settings.blogUrl && settings.blogPlatform !== "none") {
    return {
      success: false,
      message: "블로그 URL이 설정되지 않았습니다. 설정 페이지에서 입력해 주세요.",
    };
  }

  switch (settings.blogPlatform) {
    case "wordpress":
      return publishWordPress(draft, settings);
    case "webhook":
      return publishWebhook(draft, settings);
    case "blogger":
      return publishBlogger(draft, settings);
    case "none":
    default:
      return publishSimulated(draft, settings);
  }
}

async function publishWordPress(
  draft: BlogDraft,
  settings: AppSettings
): Promise<PublishResult> {
  const baseUrl = settings.blogUrl.replace(/\/$/, "");
  const endpoint = `${baseUrl}/wp-json/wp/v2/posts`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.blogApiKey}`,
    },
    body: JSON.stringify({
      title: draft.title,
      content: formatBodyForHtml(draft),
      status: "publish",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return { success: false, message: `WordPress 발행 실패: ${err}` };
  }

  const data = (await res.json()) as { link?: string };
  return {
    success: true,
    message: "WordPress에 발행되었습니다.",
    externalUrl: data.link,
  };
}

async function publishWebhook(
  draft: BlogDraft,
  settings: AppSettings
): Promise<PublishResult> {
  const res = await fetch(settings.blogUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(settings.blogApiKey ? { Authorization: `Bearer ${settings.blogApiKey}` } : {}),
    },
    body: JSON.stringify({
      title: draft.title,
      summary: draft.summary,
      body: draft.body,
      keyword: draft.keyword,
      publishedAt: new Date().toISOString(),
    }),
  });

  if (!res.ok) {
    return { success: false, message: `Webhook 발행 실패: ${res.status}` };
  }

  return { success: true, message: "Webhook으로 발행 요청을 보냈습니다." };
}

async function publishBlogger(
  _draft: BlogDraft,
  _settings: AppSettings
): Promise<PublishResult> {
  return {
    success: false,
    message:
      "Blogger API 연동은 OAuth 설정이 필요합니다. 현재 webhook 또는 WordPress를 사용해 주세요.",
  };
}

async function publishSimulated(
  draft: BlogDraft,
  settings: AppSettings
): Promise<PublishResult> {
  const url = settings.blogUrl || "(블로그 URL 미설정)";
  return {
    success: true,
    message: `[시뮬레이션] "${draft.title}" 글이 ${url}에 발행될 예정입니다. 실제 연동은 설정에서 플랫폼을 선택하세요.`,
    externalUrl: settings.blogUrl ? `${settings.blogUrl}/posts/${draft.id}` : undefined,
  };
}

function formatBodyForHtml(draft: BlogDraft): string {
  return draft.body
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>");
}
