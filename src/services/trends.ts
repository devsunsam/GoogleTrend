import type { TrendItem } from "@/types";

const TRENDS_API =
  "https://trends.google.com/trends/api/dailytrends?hl=ko&tz=-540&geo=US&ns=15";

interface GoogleTrendStory {
  title: { query: string; exploreLink?: string };
  entityNames?: string[];
  image?: { newsUrl?: string; source?: string };
}

interface GoogleTrendItem {
  title: string;
  formattedTraffic?: string;
  relatedQueries?: Array<{ query: string }>;
  articles?: Array<{ title: string; url: string; source: string }>;
}

/**
 * Google Trends 실시간 트렌드 페이지와 유사한 데이터를 가져옵니다.
 * 공식 API가 없어 내부 엔드포인트 + RSS 폴백을 사용합니다.
 */
export async function fetchTrendingKeywords(
  geo = "US",
  _minutes = 240
): Promise<TrendItem[]> {
  const realtime = await fetchRealtimeTrends(geo);
  if (realtime.length > 0) {
    return realtime.slice(0, 10);
  }

  const daily = await fetchDailyTrends(geo);
  return daily.slice(0, 10);
}

async function fetchRealtimeTrends(geo: string): Promise<TrendItem[]> {
  try {
    const url = `https://trends.google.com/trends/api/realtimetrends?hl=ko&tz=-540&cat=all&fi=0&fs=0&geo=${geo}&ri=300&rs=20&sort=0`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) return [];

    const text = await res.text();
    const jsonText = text.replace(/^\)\]\}'\n?/, "");
    const data = JSON.parse(jsonText) as {
      storySummaries?: { trendingStories?: GoogleTrendStory[] };
    };

    const stories = data.storySummaries?.trendingStories ?? [];
    return stories.map((story) => ({
      keyword: story.title.query,
      newsContext: story.entityNames?.join(", ") ?? "",
      relatedQueries: story.entityNames ?? [],
    }));
  } catch {
    return [];
  }
}

async function fetchDailyTrends(geo: string): Promise<TrendItem[]> {
  try {
    const url = `https://trends.google.com/trends/api/dailytrends?hl=ko&tz=-540&geo=${geo}&ns=15`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) return [];

    const text = await res.text();
    const jsonText = text.replace(/^\)\]\}'\n?/, "");
    const data = JSON.parse(jsonText) as {
      default?: {
        trendingSearchesDays?: Array<{
          trendingSearches?: GoogleTrendItem[];
        }>;
      };
    };

    const days = data.default?.trendingSearchesDays ?? [];
    const searches = days.flatMap((d) => d.trendingSearches ?? []);

    return searches.map((item) => ({
      keyword: item.title,
      searchVolume: item.formattedTraffic,
      relatedQueries: item.relatedQueries?.map((q) => q.query) ?? [],
      newsContext: item.articles?.[0]?.title ?? "",
    }));
  } catch {
    return [];
  }
}

export function buildTrendContext(trend: TrendItem): string {
  const parts = [
    `키워드: ${trend.keyword}`,
    trend.searchVolume ? `검색량: ${trend.searchVolume}` : null,
    trend.newsContext ? `관련 뉴스: ${trend.newsContext}` : null,
    trend.relatedQueries?.length
      ? `연관 검색: ${trend.relatedQueries.join(", ")}`
      : null,
  ].filter(Boolean);

  return parts.join("\n");
}

/** 테스트/개발용 샘플 트렌드 */
export function getSampleTrends(): TrendItem[] {
  return [
    {
      keyword: "iPhone 17 release date",
      searchVolume: "500K+",
      newsContext: "Apple expected to announce new iPhone lineup",
      relatedQueries: ["iPhone 17 price", "Apple event 2026"],
    },
    {
      keyword: "Federal Reserve interest rate",
      searchVolume: "200K+",
      newsContext: "Markets await Fed decision on rates",
      relatedQueries: ["Fed meeting", "mortgage rates"],
    },
  ];
}

export { TRENDS_API };
