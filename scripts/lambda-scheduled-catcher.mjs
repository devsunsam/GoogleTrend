/**
 * AWS Lambda (scheduledCatcher) 참조 코드
 *
 * 환경변수:
 *   APP_URL      - 예: http://13.125.x.x:3000  (끝에 / 없음)
 *   CRON_SECRET  - Lightsail .env.local 과 동일한 값
 *
 * EventBridge Schedule → 이 Lambda → POST /api/cron/trends
 */

export const handler = async (event) => {
  const appUrl = (process.env.APP_URL ?? "").replace(/\/$/, "");
  const cronSecret = (process.env.CRON_SECRET ?? "").trim();

  console.log("TrendBlog cron 시작:", new Date().toISOString());
  console.log("EventBridge event:", JSON.stringify(event));

  if (!appUrl) {
    throw new Error("APP_URL 환경변수가 설정되지 않았습니다.");
  }
  if (!cronSecret) {
    throw new Error("CRON_SECRET 환경변수가 설정되지 않았습니다.");
  }

  const url = `${appUrl}/api/cron/trends`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cronSecret}`,
      "Content-Type": "application/json",
    },
  });

  const body = await res.text();
  console.log("응답 상태:", res.status);
  console.log("응답 본문:", body);

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${body}`);
  }

  return {
    statusCode: 200,
    body,
  };
};
