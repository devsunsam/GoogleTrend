import fs from "fs";
import path from "path";
import { migrateSettings } from "@/lib/settings-migrate";
import type {
  AppSettings,
  BlogDraft,
  DraftStatus,
  ImageSlot,
  TrendSnapshot,
} from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "store.json");
const GENERATED_DIR = path.join(process.cwd(), "public", "generated");

interface Store {
  drafts: BlogDraft[];
  trends: TrendSnapshot[];
  settings: AppSettings;
  fetchLogs: Array<{
    id: number;
    ranAt: string;
    fetched: number;
    draftsCreated: number;
    errors: string[];
  }>;
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(GENERATED_DIR)) fs.mkdirSync(GENERATED_DIR, { recursive: true });
}

function migrateDraft(raw: Partial<BlogDraft> & { id: string }): BlogDraft {
  return {
    id: raw.id,
    keyword: raw.keyword ?? "",
    trendContext: raw.trendContext ?? "",
    trendReason: raw.trendReason ?? raw.trendContext ?? "",
    title: raw.title ?? "",
    body: raw.body ?? "",
    summary: raw.summary ?? "",
    status: raw.status ?? "pending",
    spamScore: raw.spamScore ?? 0,
    spamNotes: raw.spamNotes ?? "",
    imageSlots: raw.imageSlots ?? [],
    adSlots: raw.adSlots ?? [],
    targetUrl: raw.targetUrl ?? "",
    publishedUrl: raw.publishedUrl,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
    publishedAt: raw.publishedAt,
    notifiedAt: raw.notifiedAt,
  };
}

function loadStore(): Store {
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) {
    const store: Store = { drafts: [], trends: [], settings: migrateSettings({}), fetchLogs: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), "utf-8");
    return store;
  }
  const parsed = JSON.parse(fs.readFileSync(DB_FILE, "utf-8")) as Store;
  parsed.drafts = (parsed.drafts ?? []).map((d) => migrateDraft(d));
  parsed.trends = parsed.trends ?? [];
  parsed.settings = migrateSettings(parsed.settings ?? {});
  return parsed;
}

function saveStore(store: Store) {
  ensureDataDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), "utf-8");
}

export function getAllDrafts(status?: DraftStatus): BlogDraft[] {
  const store = loadStore();
  const sorted = [...store.drafts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return status ? sorted.filter((d) => d.status === status) : sorted;
}

export function getDraftsWithinDays(days: number, status?: DraftStatus): BlogDraft[] {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  return getAllDrafts(status).filter(
    (d) => new Date(d.createdAt).getTime() >= since
  );
}

export function filterDrafts(options: {
  status?: DraftStatus | "all";
  search?: string;
  days?: number;
}): BlogDraft[] {
  let drafts = getAllDrafts(
    options.status && options.status !== "all" ? options.status : undefined
  );

  if (options.days) {
    const since = Date.now() - options.days * 24 * 60 * 60 * 1000;
    drafts = drafts.filter((d) => new Date(d.createdAt).getTime() >= since);
  }

  if (options.search?.trim()) {
    const q = options.search.trim().toLowerCase();
    drafts = drafts.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.keyword.toLowerCase().includes(q) ||
        d.summary.toLowerCase().includes(q)
    );
  }

  return drafts;
}

export function deleteDrafts(ids: string[]): number {
  const store = loadStore();
  const idSet = new Set(ids);
  const before = store.drafts.length;
  store.drafts = store.drafts.filter((d) => !idSet.has(d.id));
  store.trends = store.trends.map((t) =>
    t.draftId && idSet.has(t.draftId) ? { ...t, draftId: undefined } : t
  );
  const deleted = before - store.drafts.length;
  if (deleted > 0) saveStore(store);
  return deleted;
}

export function bulkUpdateTargetUrl(ids: string[], targetUrl: string): number {
  const store = loadStore();
  const idSet = new Set(ids);
  let count = 0;
  for (const draft of store.drafts) {
    if (idSet.has(draft.id)) {
      draft.targetUrl = targetUrl;
      draft.updatedAt = new Date().toISOString();
      count++;
    }
  }
  if (count > 0) saveStore(store);
  return count;
}

export function getDraftById(id: string): BlogDraft | null {
  return loadStore().drafts.find((d) => d.id === id) ?? null;
}

export function insertDraft(draft: BlogDraft): void {
  const store = loadStore();
  store.drafts.push(draft);
  saveStore(store);
}

export function updateDraft(
  id: string,
  updates: Partial<
    Pick<
      BlogDraft,
      | "title"
      | "body"
      | "summary"
      | "status"
      | "imageSlots"
      | "adSlots"
      | "targetUrl"
      | "publishedUrl"
      | "trendReason"
    >
  >
): BlogDraft | null {
  const store = loadStore();
  const idx = store.drafts.findIndex((d) => d.id === id);
  if (idx === -1) return null;

  store.drafts[idx] = {
    ...store.drafts[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  saveStore(store);
  return store.drafts[idx];
}

export function updateDraftSpam(id: string, score: number, notes: string): void {
  const store = loadStore();
  const idx = store.drafts.findIndex((d) => d.id === id);
  if (idx === -1) return;
  store.drafts[idx].spamScore = score;
  store.drafts[idx].spamNotes = notes;
  store.drafts[idx].updatedAt = new Date().toISOString();
  saveStore(store);
}

export function deleteDraft(id: string): boolean {
  const store = loadStore();
  const before = store.drafts.length;
  store.drafts = store.drafts.filter((d) => d.id !== id);
  store.trends = store.trends.map((t) =>
    t.draftId === id ? { ...t, draftId: undefined } : t
  );
  if (store.drafts.length === before) return false;
  saveStore(store);
  return true;
}

export function markDraftPublished(id: string, publishedUrl?: string): BlogDraft | null {
  const store = loadStore();
  const idx = store.drafts.findIndex((d) => d.id === id);
  if (idx === -1) return null;
  const now = new Date().toISOString();
  store.drafts[idx].status = "published";
  store.drafts[idx].publishedAt = now;
  store.drafts[idx].updatedAt = now;
  if (publishedUrl) store.drafts[idx].publishedUrl = publishedUrl;
  saveStore(store);
  return store.drafts[idx];
}

export function markDraftNotified(id: string): void {
  const store = loadStore();
  const idx = store.drafts.findIndex((d) => d.id === id);
  if (idx === -1) return;
  store.drafts[idx].notifiedAt = new Date().toISOString();
  saveStore(store);
}

export function getSettings(): AppSettings {
  return loadStore().settings;
}

export function saveSettings(settings: AppSettings): AppSettings {
  const store = loadStore();
  store.settings = settings;
  saveStore(store);
  return settings;
}

export function logFetch(fetched: number, draftsCreated: number, errors: string[]): void {
  const store = loadStore();
  const nextId =
    store.fetchLogs.length > 0 ? store.fetchLogs[store.fetchLogs.length - 1].id + 1 : 1;
  store.fetchLogs.push({
    id: nextId,
    ranAt: new Date().toISOString(),
    fetched,
    draftsCreated,
    errors,
  });
  saveStore(store);
}

export function draftExistsForKeyword(keyword: string, withinMinutes = 240): boolean {
  const since = Date.now() - withinMinutes * 60 * 1000;
  return loadStore().drafts.some(
    (d) => d.keyword === keyword && new Date(d.createdAt).getTime() > since
  );
}

export function getLatestTrends(limit = 20): TrendSnapshot[] {
  return loadStore()
    .trends.sort(
      (a, b) => new Date(b.fetchedAt).getTime() - new Date(a.fetchedAt).getTime()
    )
    .slice(0, limit);
}

export function upsertTrends(trends: TrendSnapshot[]): void {
  const store = loadStore();
  for (const trend of trends) {
    const idx = store.trends.findIndex(
      (t) => t.keyword === trend.keyword && t.fetchedAt === trend.fetchedAt
    );
    if (idx >= 0) {
      store.trends[idx] = { ...store.trends[idx], ...trend };
    } else {
      store.trends.unshift(trend);
    }
  }
  store.trends = store.trends.slice(0, 100);
  saveStore(store);
}

export function linkTrendToDraft(keyword: string, draftId: string): void {
  const store = loadStore();
  const trend = store.trends.find((t) => t.keyword === keyword && !t.draftId);
  if (trend) trend.draftId = draftId;
  saveStore(store);
}

export function updateDraftImageSlot(
  draftId: string,
  slotId: string,
  updates: Partial<ImageSlot>
): BlogDraft | null {
  const draft = getDraftById(draftId);
  if (!draft) return null;
  const imageSlots = draft.imageSlots.map((s) =>
    s.id === slotId ? { ...s, ...updates } : s
  );
  return updateDraft(draftId, { imageSlots });
}

export function getGeneratedImagePath(filename: string): string {
  return path.join(GENERATED_DIR, filename);
}

export function saveGeneratedImage(filename: string, buffer: Buffer): string {
  ensureDataDir();
  const filepath = path.join(GENERATED_DIR, filename);
  fs.writeFileSync(filepath, buffer);
  return `/generated/${filename}`;
}

/** @deprecated JSON store — compatibility shim */
export function getDb(): never {
  throw new Error("JSON store does not expose raw DB");
}
