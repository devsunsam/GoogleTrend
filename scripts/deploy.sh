#!/usr/bin/env bash
#
# TrendBlog — AWS Lightsail (Ubuntu) 배포 스크립트
#
# 사용법:
#   chmod +x scripts/deploy.sh
#   ./scripts/deploy.sh              # 일반 배포/업데이트
#   ./scripts/deploy.sh --setup      # 최초 1회 (Node.js, PM2, swap 설치)
#   ./scripts/deploy.sh --setup --start
#
# 사전 준비:
#   1. Ubuntu 22.04 Lightsail 인스턴스 + 고정 IP
#   2. Lightsail Firewall: 22, 3000 (또는 80/443) 허용
#   3. .env.local 파일 작성 (최초 1회)
#

set -euo pipefail

APP_NAME="trendblog"
APP_PORT="${APP_PORT:-3000}"
NODE_MAJOR="${NODE_MAJOR:-20}"
PM2_APP_NAME="${PM2_APP_NAME:-trendblog}"

# 프로젝트 루트 (scripts/ 기준 상위)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

DO_SETUP=false
DO_START=true
SKIP_BUILD=false

log()  { echo "[$(date '+%H:%M:%S')] $*"; }
warn() { echo "[$(date '+%H:%M:%S')] WARN: $*" >&2; }
die()  { echo "[$(date '+%H:%M:%S')] ERROR: $*" >&2; exit 1; }

usage() {
  cat <<EOF
TrendBlog Lightsail 배포 스크립트

Usage:
  ./scripts/deploy.sh [options]

Options:
  --setup       최초 1회: Node.js ${NODE_MAJOR}, PM2, swap(2GB) 설치
  --no-start    빌드만 하고 PM2 재시작 생략
  --skip-build  npm run build 생략 (코드 변경 없이 PM2만 재시작)
  -h, --help    도움말

환경변수:
  APP_PORT=3000     Next.js 포트 (기본 3000)
  NODE_MAJOR=20     Node.js 메이저 버전

예시:
  ./scripts/deploy.sh --setup --start   # 새 Lightsail 인스턴스 최초 배포
  ./scripts/deploy.sh                   # git pull 후 업데이트 배포
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --setup)     DO_SETUP=true; shift ;;
    --start)     DO_START=true; shift ;;
    --no-start)  DO_START=false; shift ;;
    --skip-build) SKIP_BUILD=true; shift ;;
    -h|--help)   usage; exit 0 ;;
    *) die "알 수 없는 옵션: $1 (--help 참고)" ;;
  esac
done

require_linux() {
  [[ "$(uname -s)" == "Linux" ]] || die "이 스크립트는 Linux(Ubuntu Lightsail)용입니다."
}

install_node() {
  if command -v node >/dev/null 2>&1; then
    local ver
    ver="$(node -v | sed 's/v//' | cut -d. -f1)"
    if [[ "$ver" -ge "$NODE_MAJOR" ]]; then
      log "Node.js $(node -v) 이미 설치됨"
      return
    fi
    warn "Node.js 버전이 낮습니다 ($(node -v)). ${NODE_MAJOR}.x 설치 진행..."
  fi

  log "Node.js ${NODE_MAJOR}.x 설치 중..."
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash -
  sudo apt-get install -y nodejs
  log "Node.js $(node -v) / npm $(npm -v)"
}

install_pm2() {
  if command -v pm2 >/dev/null 2>&1; then
    log "PM2 $(pm2 -v) 이미 설치됨"
    return
  fi
  log "PM2 설치 중..."
  sudo npm install -g pm2
}

setup_swap() {
  if [[ -f /swapfile ]]; then
    log "swap 이미 존재"
    return
  fi
  log "swap 2GB 생성 (1GB RAM 플랜 빌드용)..."
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  log "swap 활성화 완료"
}

run_setup() {
  log "=== 최초 서버 설정 (--setup) ==="
  sudo apt-get update -y
  sudo apt-get install -y git curl
  install_node
  install_pm2
  setup_swap
  log "최초 설정 완료"
}

ensure_env() {
  local env_file="${APP_DIR}/.env.local"
  if [[ ! -f "$env_file" ]]; then
    if [[ -f "${APP_DIR}/.env.example" ]]; then
      cp "${APP_DIR}/.env.example" "$env_file"
      warn ".env.local 이 없어 .env.example 을 복사했습니다."
      warn "반드시 편집하세요: nano ${env_file}"
      warn "  GEMINI_API_KEY, CRON_SECRET, APP_URL=http://<Lightsail-고정IP>:${APP_PORT}"
    else
      die ".env.local 이 없습니다. ${env_file} 을 생성하세요."
    fi
  fi

  # APP_URL 미설정 시 안내
  if grep -q 'APP_URL=http://localhost' "$env_file" 2>/dev/null; then
    warn "APP_URL 이 localhost 입니다. Lightsail 고정 IP로 변경하세요."
    warn "  Lambda APP_URL 과 동일해야 합니다."
  fi
}

ensure_data_dir() {
  mkdir -p "${APP_DIR}/data"
  mkdir -p "${APP_DIR}/public/generated"
  log "data/ 디렉토리 확인"
}

install_deps() {
  log "의존성 설치..."
  cd "$APP_DIR"
  if [[ -f package-lock.json ]]; then
    npm ci
  else
    npm install
  fi
}

build_app() {
  log "프로덕션 빌드 (npm run build)..."
  cd "$APP_DIR"
  # 이전 dev/build 캐시 충돌 방지
  rm -rf .next
  NODE_ENV=production npm run build
  log "빌드 완료"
}

pm2_start_or_reload() {
  cd "$APP_DIR"
  export PORT="$APP_PORT"

  if pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
    log "PM2 reload: ${PM2_APP_NAME}"
    pm2 reload "$PM2_APP_NAME" --update-env
  else
    log "PM2 start: ${PM2_APP_NAME} (port ${APP_PORT})"
    pm2 start npm --name "$PM2_APP_NAME" -- start
  fi

  pm2 save
  log "PM2 상태:"
  pm2 status "$PM2_APP_NAME"
}

setup_pm2_startup() {
  if [[ "${DO_SETUP}" == true ]]; then
    log "부팅 시 자동 시작 등록 (pm2 startup 출력 명령을 실행하세요):"
    pm2 startup systemd -u "${USER}" --hp "${HOME}" || true
    warn "위 pm2 startup 이 출력한 sudo 명령을 복사해 실행한 뒤, pm2 save 를 다시 실행하세요."
  fi
}

health_check() {
  log "헬스체크: http://127.0.0.1:${APP_PORT}"
  sleep 2
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${APP_PORT}/" || echo "000")"
  if [[ "$code" == "200" ]]; then
    log "헬스체크 OK (HTTP ${code})"
  else
    warn "헬스체크 실패 (HTTP ${code}). pm2 logs ${PM2_APP_NAME} 확인"
  fi
}

print_summary() {
  local ip
  ip="$(curl -s --max-time 2 http://checkip.amazonaws.com 2>/dev/null || echo "<Lightsail-고정IP>")"

  cat <<EOF

========================================
  TrendBlog 배포 완료
========================================
  로컬:  http://127.0.0.1:${APP_PORT}
  외부:  http://${ip}:${APP_PORT}

  다음 확인:
  1. Lightsail Firewall → Custom TCP ${APP_PORT} 허용
  2. .env.local → APP_URL=http://${ip}:${APP_PORT}
  3. Lambda 환경변수 APP_URL, CRON_SECRET 동일 설정
  4. Lambda Timeout → General configuration → **10초 이상** (3초 기본값이면 타임아웃)
  5. curl 테스트 (즉시 응답):
     curl -X POST "http://${ip}:${APP_PORT}/api/cron/trends" \\
       -H "Authorization: Bearer YOUR_CRON_SECRET"
  6. 전체 결과 대기 테스트:
     curl -X POST "http://${ip}:${APP_PORT}/api/cron/trends?wait=true" \\
       -H "Authorization: Bearer YOUR_CRON_SECRET"

  로그:  pm2 logs ${PM2_APP_NAME}
  재시작: pm2 restart ${PM2_APP_NAME}
========================================
EOF
}

main() {
  require_linux
  log "=== TrendBlog deploy ==="
  log "APP_DIR=${APP_DIR}"

  [[ -f "${APP_DIR}/package.json" ]] || die "package.json 을 찾을 수 없습니다: ${APP_DIR}"

  if [[ "$DO_SETUP" == true ]]; then
    run_setup
  fi

  if ! command -v node >/dev/null 2>&1; then
    die "Node.js 가 없습니다. ./scripts/deploy.sh --setup 을 먼저 실행하세요."
  fi

  if [[ "$DO_START" == true ]] && ! command -v pm2 >/dev/null 2>&1; then
    die "PM2 가 없습니다. ./scripts/deploy.sh --setup 을 먼저 실행하세요."
  fi

  ensure_env
  ensure_data_dir
  install_deps

  if [[ "$SKIP_BUILD" != true ]]; then
    build_app
  else
    log "빌드 생략 (--skip-build)"
  fi

  if [[ "$DO_START" == true ]]; then
    pm2_start_or_reload
    setup_pm2_startup
    health_check
  fi

  print_summary
}

main "$@"
