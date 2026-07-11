/**
 * 4시간마다 트렌드 수집 파이프라인 실행
 * 로컬: npm run scheduler
 * 프로덕션: AWS EventBridge / cron job → POST /api/cron/trends
 */

const INTERVAL_MS = 4 * 60 * 60 * 1000;
const BASE_URL = process.env.APP_URL || "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET || "";

async function runPipeline() {
  const url = `${BASE_URL}/api/cron/trends${CRON_SECRET ? `?secret=${CRON_SECRET}` : ""}`;
  console.log(`[${new Date().toISOString()}] 트렌드 수집 시작...`);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: CRON_SECRET ? { Authorization: `Bearer ${CRON_SECRET}` } : {},
    });
    const data = await res.json();
    console.log(`[${new Date().toISOString()}] 결과:`, JSON.stringify(data));
  } catch (e) {
    console.error(`[${new Date().toISOString()}] 실패:`, e);
  }
}

console.log("TrendBlog 스케줄러 시작 (4시간 주기)");
runPipeline();
setInterval(runPipeline, INTERVAL_MS);
