# ============================================================
# Hangul Now Cloud Run 프로덕션 전자동 배포 스크립트
# 모바일 PWA 및 웹 운영 서버에 즉시 반영합니다.
# ============================================================
$ErrorActionPreference = "Stop"

$PROJECT_ID = "hnageul-copilot-dev-918"
$REGION = "asia-northeast3"
$SERVICE_NAME = "hangul-now-api"
$SERVICE_ACCOUNT = "hangul-now-api-runtime@hnageul-copilot-dev-918.iam.gserviceaccount.com"

Write-Host "🚀 [1/5] Git 상태 확인 및 원격 푸시..." -ForegroundColor Cyan
$sha = (git rev-parse --short HEAD)
$branch = (git branch --show-current)
git push origin $branch

Write-Host "📦 [2/5] Git Archive 패키징 (hn-$sha.tgz)..." -ForegroundColor Cyan
$archiveFile = "hn-$sha.tgz"
git -c core.autocrlf=false archive --format=tar.gz -o $archiveFile HEAD

try {
    Write-Host "🔨 [3/5] Google Cloud Build 컨테이너 이미지 빌드..." -ForegroundColor Cyan
    $imageTag = "$REGION-docker.pkg.dev/$PROJECT_ID/cloud-run-source-deploy/$SERVICE_NAME`:$sha"
    gcloud builds submit $archiveFile --region $REGION --tag $imageTag

    Write-Host "🚢 [4/5] Cloud Run 프로덕션 배포 및 트래픽 100% 즉시 전환..." -ForegroundColor Cyan
    gcloud run deploy $SERVICE_NAME `
        --image $imageTag `
        --region $REGION `
        --service-account $SERVICE_ACCOUNT `
        --timeout 3600 `
        --max-instances 1 `
        --allow-unauthenticated `
        "--set-secrets=GEMINI_API_KEY=hn-staging-gemini-api-key:latest,FIREBASE_SERVICE_ACCOUNT_KEY=hn-staging-firebase-sa-key:latest,ADMIN_EMAILS=hn-staging-admin-emails:latest"

    Write-Host "🩺 [5/5] 서비스 헬스체크 검증..." -ForegroundColor Cyan
    $serviceUrl = (gcloud run services describe $SERVICE_NAME --region $REGION --format "value(status.url)")
    $health = Invoke-RestMethod -Uri "$serviceUrl/api/health"
    if ($health.status -eq "ok") {
        Write-Host "✅ 배포 성공! 서비스 정상 가동 중: $serviceUrl" -ForegroundColor Green
    } else {
        Write-Warning "⚠️ 헬스체크 응답 이상: $health"
    }
}
finally {
    if (Test-Path $archiveFile) {
        Remove-Item -Path $archiveFile -Force -ErrorAction SilentlyContinue
    }
}
