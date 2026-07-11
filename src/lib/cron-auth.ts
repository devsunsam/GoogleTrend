import { getSettings } from "@/lib/db";

function normalizeSecret(value: string | undefined | null): string {
  return (value ?? "").trim();
}

export function getCronSecret(): string {
  const fromEnv = normalizeSecret(process.env.CRON_SECRET);
  if (fromEnv) return fromEnv;
  return normalizeSecret(getSettings().cronSecret);
}

export function verifyCronAuth(request: Request): boolean {
  const secret = getCronSecret();
  if (!secret) return true;

  const auth = normalizeSecret(request.headers.get("authorization"));
  if (auth === `Bearer ${secret}`) return true;

  const url = new URL(request.url);
  if (normalizeSecret(url.searchParams.get("secret")) === secret) return true;

  return false;
}
