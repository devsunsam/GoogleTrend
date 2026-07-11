export type DraftStatus = "pending" | "approved" | "published" | "rejected";
export type AiProvider = "gemini" | "chatgpt" | "claude";

export interface TrendItem {
  keyword: string;
  searchVolume?: string;
  started?: string;
  relatedQueries?: string[];
  newsContext?: string;
}

export interface TrendSnapshot {
  id: string;
  keyword: string;
  trendReason: string;
  searchVolume?: string;
  relatedQueries?: string[];
  newsContext?: string;
  draftId?: string;
  fetchedAt: string;
}

export interface ImageSlot {
  id: string;
  position: string;
  sectionTitle: string;
  description: string;
  promptScript: string;
  imageUrl?: string;
  includedInFinal: boolean;
  generated: boolean;
}

export interface AdSlot {
  id: string;
  type: "adsense" | "display";
  position: string;
  label: string;
  description: string;
}

export interface BlogDraft {
  id: string;
  keyword: string;
  trendContext: string;
  trendReason: string;
  title: string;
  body: string;
  summary: string;
  status: DraftStatus;
  spamScore: number;
  spamNotes: string;
  imageSlots: ImageSlot[];
  adSlots: AdSlot[];
  targetUrl: string;
  publishedUrl?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  notifiedAt?: string;
}

export interface AppSettings {
  blogUrl: string;
  blogApiKey: string;
  blogPlatform: "webhook" | "wordpress" | "blogger" | "none";
  geo: string;
  trendHours: number;
  cronSecret: string;
  lastFetchAt?: string;
  openaiApiKey: string;
  geminiApiKey: string;
  anthropicApiKey: string;
  openaiModel: string;
  geminiModel: string;
  anthropicModel: string;
}

export interface GenerateResult {
  title: string;
  summary: string;
  body: string;
  trendReason: string;
  spamScore: number;
  spamNotes: string;
  imageSlots: ImageSlot[];
  adSlots: AdSlot[];
  provider?: AiProvider;
}

export interface FetchTrendsResult {
  fetched: number;
  draftsCreated: number;
  errors: string[];
}

export interface LayoutAnalysis {
  imageSlots: ImageSlot[];
  adSlots: AdSlot[];
}

export interface DraftFilters {
  status?: DraftStatus | "all";
  search?: string;
  days?: number;
}
