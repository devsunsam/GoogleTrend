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
import { generateBlogDraftSafe, generateMockDraft } from "@/services/gemini";
import { sleep } from "@/lib/gemini-quota";
import type {
  BlogDraft,
  FetchTrendsResult,
  TrendItem,
  TrendSnapshot,
  TrendTestResult,
} from "@/types";

async function collectTrends(
  settings: ReturnType<typeof getSettings>,
  options?: { useSample?: boolean }
): Promise<{ trends: TrendItem[]; errors: string[]; usedSample: boolean }> {
  const errors: string[] = [];
  let trends: TrendItem[] = [];
  let usedSample = false;

  try {
    if (options?.useSample || process.env.USE_SAMPLE_TRENDS === "true") {
      trends = getSampleTrends();
      usedSample = true;
    } else {
      trends = await fetchTrendingKeywords(settings.geo, settings.trendMinutes);
      if (trends.length === 0) {
        trends = getSampleTrends();
        usedSample = true;
        errors.push("Google Trends API 응답 없음 — 샘플 데이터 사용");
      }
    }
  } catch (e) {
    trends = getSampleTrends();
    usedSample = true;
    errors.push(`트렌드 수집 실패: ${e instanceof Error ? e.message : String(e)}`);
  }

  return { trends, errors, usedSample };
}

export async function runTrendTestPipeline(options?: {
  useSample?: boolean;
  dryRun?: boolean;
  maxDrafts?: number;
}): Promise<TrendTestResult> {
  const startedAt = Date.now();
  const settings = getSettings();
  const dryRun = options?.dryRun !== false;
  const { trends, errors, usedSample } = await collectTrends(settings, options);

  if (dryRun) {
    return {
      ok: errors.length === 0 || trends.length > 0,
      durationMs: Date.now() - startedAt,
      geo: settings.geo,
      trendMinutes: settings.trendMinutes,
      usedSample,
      dryRun: true,
      fetched: trends.length,
      draftsCreated: 0,
      errors,
      trends,
    };
  }

  const result = await runTrendFetchPipeline({
    useSample: options?.useSample,
    maxDrafts: options?.maxDrafts ?? 1,
    preloadedTrends: trends,
    preloadedErrors: errors,
    usedSample,
  });

  return {
    ok: result.errors.length === 0 || result.fetched > 0,
    durationMs: Date.now() - startedAt,
    geo: settings.geo,
    trendMinutes: settings.trendMinutes,
    usedSample,
    dryRun: false,
    fetched: result.fetched,
    draftsCreated: result.draftsCreated,
    errors: result.errors,
    trends,
  };
}

export async function runTrendFetchPipeline(options?: {
  useSample?: boolean;
  maxDrafts?: number;
  preloadedTrends?: TrendItem[];
  preloadedErrors?: string[];
  usedSample?: boolean;
}): Promise<FetchTrendsResult> {
  const settings = getSettings();
  const errors: string[] = [...(options?.preloadedErrors ?? [])];
  let trends = options?.preloadedTrends;

  if (!trends) {
    const collected = await collectTrends(settings, options);
    trends = collected.trends;
    errors.push(...collected.errors);
  }

  const fetchedAt = new Date().toISOString();
  const maxDrafts = options?.maxDrafts ?? 3;
  let draftsCreated = 0;
  const trendSnapshots: TrendSnapshot[] = [];

  for (let index = 0; index < trends.length; index++) {
    const trend = trends[index];
    if (index > 0) {
      await sleep(1500);
    }

    try {
      const { apiKey } = {
        apiKey:
          settings.geminiApiKey || process.env.GEMINI_API_KEY || "",
      };

      const { result: generated, warning } = apiKey
        ? await generateBlogDraftSafe(trend)
        : { result: generateMockDraft(trend), warning: undefined };

      if (warning) {
        errors.push(`"${trend.keyword}": ${warning}`);
      }

      const snapshot: TrendSnapshot = {
        id: uuidv4(),
        keyword: trend.keyword,
        trendReason: generated.trendReason,
        searchVolume: trend.searchVolume,
        relatedQueries: trend.relatedQueries,
        newsContext: trend.newsContext,
        fetchedAt,
      };

      if (draftExistsForKeyword(trend.keyword, settings.trendMinutes)) {
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
