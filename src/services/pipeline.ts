import { v4 as uuidv4 } from "uuid";
import {
  draftExistsForKeyword,
  getSettings,
  insertDraft,
  logFetch,
  markDraftNotified,
  saveSettings,
  upsertTrends,
} from "@/lib/db";
import { fetchTrendingKeywords, getSampleTrends } from "@/services/trends";
import { generateBlogDraft, generateMockDraft } from "@/services/gemini";
import type { BlogDraft, FetchTrendsResult, TrendSnapshot } from "@/types";

export async function runTrendFetchPipeline(options?: {
  useSample?: boolean;
  maxDrafts?: number;
}): Promise<FetchTrendsResult> {
  const settings = getSettings();
  const errors: string[] = [];
  let trends;

  try {
    if (options?.useSample || process.env.USE_SAMPLE_TRENDS === "true") {
      trends = getSampleTrends();
    } else {
      trends = await fetchTrendingKeywords(settings.geo, settings.trendHours);
      if (trends.length === 0) {
        trends = getSampleTrends();
        errors.push("Google Trends API 응답 없음 — 샘플 데이터 사용");
      }
    }
  } catch (e) {
    trends = getSampleTrends();
    errors.push(`트렌드 수집 실패: ${e instanceof Error ? e.message : String(e)}`);
  }

  const fetchedAt = new Date().toISOString();
  const maxDrafts = options?.maxDrafts ?? 3;
  let draftsCreated = 0;
  const trendSnapshots: TrendSnapshot[] = [];

  for (const trend of trends) {
    try {
      const generated = process.env.GEMINI_API_KEY
        ? await generateBlogDraft(trend)
        : generateMockDraft(trend);

      const snapshot: TrendSnapshot = {
        id: uuidv4(),
        keyword: trend.keyword,
        trendReason: generated.trendReason,
        searchVolume: trend.searchVolume,
        relatedQueries: trend.relatedQueries,
        newsContext: trend.newsContext,
        fetchedAt,
      };

      if (draftExistsForKeyword(trend.keyword, settings.trendHours)) {
        const existing = upsertTrendOnly(snapshot);
        trendSnapshots.push(existing);
        continue;
      }

      if (draftsCreated >= maxDrafts) {
        trendSnapshots.push(snapshot);
        continue;
      }

      const now = new Date().toISOString();
      const draft: BlogDraft = {
        id: uuidv4(),
        keyword: trend.keyword,
        trendContext: [
          trend.searchVolume ? `검색량: ${trend.searchVolume}` : null,
          trend.newsContext ? `뉴스: ${trend.newsContext}` : null,
          trend.relatedQueries?.length
            ? `연관: ${trend.relatedQueries.join(", ")}`
            : null,
        ]
          .filter(Boolean)
          .join(" | "),
        trendReason: generated.trendReason,
        title: generated.title,
        body: generated.body,
        summary: generated.summary,
        status: "pending",
        spamScore: generated.spamScore,
        spamNotes: generated.spamNotes,
        imageSlots: generated.imageSlots,
        adSlots: generated.adSlots,
        targetUrl: settings.blogUrl,
        createdAt: now,
        updatedAt: now,
      };

      insertDraft(draft);
      markDraftNotified(draft.id);
      snapshot.draftId = draft.id;
      trendSnapshots.push(snapshot);
      draftsCreated++;
    } catch (e) {
      errors.push(
        `"${trend.keyword}" 초안 생성 실패: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  upsertTrends(trendSnapshots);
  saveSettings({ ...settings, lastFetchAt: fetchedAt });
  logFetch(trends.length, draftsCreated, errors);

  return { fetched: trends.length, draftsCreated, errors };
}

function upsertTrendOnly(snapshot: TrendSnapshot): TrendSnapshot {
  upsertTrends([snapshot]);
  return snapshot;
}
